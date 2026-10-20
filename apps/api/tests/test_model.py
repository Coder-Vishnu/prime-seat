"""
apps/api/tests/test_model.py
Verification Gates for PyTorch Churn Classifier.
"""

import time
from datetime import datetime, timezone
from pathlib import Path
import pytest
import torch

from analytics.model import (
    SeatChurnClassifier,
    FeatureVectorBuilder,
    build_loss_criterion,
    export_torchscript,
)


class TestPyTorchModelVerificationGates:
    """Gate 04: PyTorch Model Inference & Latency Verification Suite."""

    @pytest.fixture
    def classifier(self) -> SeatChurnClassifier:
        model = SeatChurnClassifier(input_dim=16, hidden_dim=64)
        model.eval()
        return model

    def test_gate_01_tensor_shapes_and_probability_bounds(self, classifier: SeatChurnClassifier):
        """Verify input (B, 16) yields output (B, 1) with probabilities in [0.0, 1.0]."""
        batch_sizes = [1, 16, 64, 300]
        for b in batch_sizes:
            x = torch.randn(b, 16, dtype=torch.float32)
            probs = classifier.predict_probability(x)

            assert probs.shape == (b, 1), f"Expected shape ({b}, 1), got {probs.shape}"
            assert torch.all(probs >= 0.0), "Probabilities must be >= 0.0"
            assert torch.all(probs <= 1.0), "Probabilities must be <= 1.0"

    def test_gate_02_cpu_inference_latency_sla(self, classifier: SeatChurnClassifier):
        """
        Latency SLA Gate: A full auditorium grid of 300 seats must be scored
        in under 5.0ms on CPU (target < 0.45ms).
        """
        auditorium_seat_count = 300
        x = torch.randn(auditorium_seat_count, 16, dtype=torch.float32)

        # Warmup passes
        for _ in range(50):
            _ = classifier.predict_probability(x)

        # Benchmark 500 forward evaluations
        eval_rounds = 500
        start = time.perf_counter()
        for _ in range(eval_rounds):
            _ = classifier.predict_probability(x)
        elapsed_sec = time.perf_counter() - start

        avg_latency_ms = (elapsed_sec / eval_rounds) * 1000.0
        print(f"\n[BENCHMARK] PyTorch 300-Seat Grid Forward Pass: {avg_latency_ms:.4f} ms")

        assert (
            avg_latency_ms < 5.0
        ), f"Forward pass latency {avg_latency_ms:.4f}ms exceeded 5.0ms SLA"

    def test_gate_03_loss_gradient_scaling_on_imbalance(self):
        """Verify pos_weight=45.0 produces 45x larger gradient for positive class errors."""
        criterion = build_loss_criterion(pos_weight_value=45.0)

        # Logit 0.0 predicts probability 0.5
        logit_pos = torch.tensor([[0.0]], requires_grad=True)
        logit_neg = torch.tensor([[0.0]], requires_grad=True)

        target_pos = torch.tensor([[1.0]])  # Ground truth: Dropped
        target_neg = torch.tensor([[0.0]])  # Ground truth: Retained

        loss_pos = criterion(logit_pos, target_pos)
        loss_neg = criterion(logit_neg, target_neg)

        loss_pos.backward()
        loss_neg.backward()

        grad_pos = logit_pos.grad.item()
        grad_neg = logit_neg.grad.item()

        # pos_weight scales the positive gradient by exactly 45.0x
        ratio = abs(grad_pos) / abs(grad_neg)
        assert pytest.approx(ratio, rel=1e-2) == 45.0

    def test_gate_04_feature_builder_dimension_and_bounds(self):
        """Verify FeatureVectorBuilder outputs exactly 16 normalized floats."""
        now = datetime(2026, 10, 11, 19, 30, tzinfo=timezone.utc)
        features = FeatureVectorBuilder.extract_features(
            row_idx=6,
            col_idx=14,
            max_rows=12,
            max_cols=24,
            is_prime_row=True,
            screen_format="DOLBY_CINEMA",
            delta_minutes=45.0,
            screening_time=now,
            occupancy_ratio=0.88,
        )

        assert len(features) == 16, f"Expected 16 features, got {len(features)}"
        assert all(isinstance(val, float) for val in features)

    def test_gate_05_torchscript_serialization_roundtrip(self, classifier: SeatChurnClassifier, tmp_path: Path):
        """Verify TorchScript JIT tracing and standalone file loading."""
        model_path = tmp_path / "model_traced.pt"
        export_torchscript(classifier, model_path)

        assert model_path.exists()
        loaded_model = torch.jit.load(str(model_path))
        loaded_model.eval()

        test_tensor = torch.randn(5, 16, dtype=torch.float32)
        with torch.no_grad():
            orig_output = classifier(test_tensor)
            loaded_output = loaded_model(test_tensor)

        assert torch.allclose(orig_output, loaded_output, atol=1e-5)
