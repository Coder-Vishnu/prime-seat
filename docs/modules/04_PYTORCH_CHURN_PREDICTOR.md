# Module 04: Predictive Churn Deep Learning Classifier

**Module Identifier:** `04_PYTORCH_CHURN_PREDICTOR`  
**System Layer:** Deep Learning Inference & Churn Modeling  
**Target Codebase Location:** `apps/api/src/analytics/model.py`, `apps/api/tests/test_model.py`, `models/checkpoints/`  
**Author:** Vishnu Venkatesan (Lead Systems Architect & AI Engineer)  
**Classification:** Core Machine Learning Blueprint  
**Version:** 2.0.0-PROD  

---

## 1. Domain Objective & Operational Contract

Module 04 engineers a production-grade PyTorch deep learning classifier that predicts the instantaneous probability $P(\text{Drop} \mid X)$ of an occupied seat being cancelled prior to showtime. 

Standard movie scrapers react passively only after a seat becomes available. Prime Seat introduces **predictive proactive targeting**: by evaluating the spatial acoustics, physical prime-tier placement, time-to-showtime $\Delta t$, and historical occupancy trajectory, the model assigns dynamic drop confidence scores to currently occupied seats.

### Operational Contracts:
1. **Extreme Class Imbalance Mitigation:** Cancellations represent $<2.0\%$ of total seat reservations ($98.0\%+$ non-churn). The training pipeline uses Weighted Binary Cross-Entropy (`pos_weight = 45.0`) to penalize false negatives on rare drops.
2. **Sub-5ms CPU Latency SLA:** Single-batch forward pass on CPU must execute in $<0.45\text{ms}$ (strict SLA $<5.0\text{ms}$), enabling real-time scoring of all prime seats without GPU requirements.
3. **Evaluation Rigor:** Validation evaluates Precision-Recall Area Under Curve (PR-AUC) targeting $\ge 0.862$ on imbalanced holdout sets, rejecting deceptive raw accuracy metrics.
4. **TorchScript JIT Export:** Serialized models are exported via TorchScript tracing to standalone `.pt` artifacts for deployment in Python environments without dependency on the raw source definitions.

```
                      +------------------------------------------+
                      | Input Feature Vector X in R^16           |
                      | - Spatial: Normalized (r/R, c/C, dist)   |
                      | - Temporal: Delta t, sin/cos time cycle  |
                      | - Global: Occupancy ratio, format embed  |
                      +------------------------------------------+
                                           |
                                           v
                      +------------------------------------------+
                      | PyTorch MLP Backbone                     |
                      | Linear(16, 64) -> BatchNorm1d -> ReLU    |
                      | Dropout(p=0.20)                          |
                      | Linear(64, 32) -> ReLU                   |
                      | Linear(32, 1) -> Raw Logit z             |
                      +------------------------------------------+
                                           |
                                           v
                      +------------------------------------------+
                      | Sigmoid Activation: sigma(z) in [0.0, 1] |
                      | P(Drop | X) Cancellation Probability     |
                      +------------------------------------------+
                                    /              \
                        [p >= 0.65] /                \  [p < 0.65]
                                   v                  v
            +----------------------------+   +------------------------+
            | High-Priority Alert Queue  |   | Passive Monitor State  |
            | Pre-fetch AMC Session Data |   | Visual Heatmap Overlay |
            +----------------------------+   +------------------------+
```

---

## 2. Input Feature Representation (16-Dimensional Vector Space)

Each occupied seat record is transformed into a continuous 16-dimensional input tensor $\mathbf{x} \in \mathbb{R}^{16}$:

| Feature Index | Feature Name | Description & Normalization | Value Range |
| :--- | :--- | :--- | :--- |
| $x_0$ | `norm_row` | Normalized row index: $r / R_{\max}$ | $[0.0, 1.0]$ |
| $x_1$ | `norm_col` | Normalized seat column: $c / C_{\max}$ | $[0.0, 1.0]$ |
| $x_2$ | `dist_to_center` | Normalized Euclidean distance to auditorium optical center: $\sqrt{(r - \bar{r})^2 + (c - \bar{c})^2} / D_{\max}$ | $[0.0, 1.0]$ |
| $x_3$ | `is_prime_row` | Binary flag indicating prime acoustic tier (Dolby E-H, IMAX F-K) | $\{0.0, 1.0\}$ |
| $x_4$ | `is_prime_col` | Binary flag indicating prime central column block | $\{0.0, 1.0\}$ |
| $x_5$ | `format_is_dolby` | One-hot indicator for Dolby Cinema format | $\{0.0, 1.0\}$ |
| $x_6$ | `format_is_imax` | One-hot indicator for IMAX with Laser format | $\{0.0, 1.0\}$ |
| $x_7$ | `delta_minutes_norm` | Time remaining to showtime: $\Delta t / 720.0$ (clamped to $[0, 1]$) | $[0.0, 1.0]$ |
| $x_8$ | `delta_minutes_inv` | Inverse time proximity: $1.0 / (1.0 + \Delta t / 60.0)$ | $[0.0, 1.0]$ |
| $x_9$ | `hour_sin` | Cyclical screening hour: $\sin(2\pi \cdot \text{hour} / 24)$ | $[-1.0, 1.0]$ |
| $x_{10}$ | `hour_cos` | Cyclical screening hour: $\cos(2\pi \cdot \text{hour} / 24)$ | $[-1.0, 1.0]$ |
| $x_{11}$ | `day_of_week_sin` | Cyclical day of week: $\sin(2\pi \cdot \text{dow} / 7)$ | $[-1.0, 1.0]$ |
| $x_{12}$ | `day_of_week_cos` | Cyclical day of week: $\cos(2\pi \cdot \text{dow} / 7)$ | $[-1.0, 1.0]$ |
| $x_{13}$ | `occupancy_ratio` | Instantaneous auditorium load $\rho_t \in [0.0, 1.0]$ | $[0.0, 1.0]$ |
| $x_{14}$ | `historical_churn_sim` | Cosine similarity to top historical cancellation trajectory | $[0.0, 1.0]$ |
| $x_{15}$ | `cluster_density` | Local neighbor occupancy density (ratio of 8 adjacent seats booked) | $[0.0, 1.0]$ |

---

## 3. Mathematical Loss Formulation

### 3.1 Class Imbalance Management via Weighted BCE
Given binary ground truth label $y_n \in \{0, 1\}$ ($1 = \text{Dropped}$, $0 = \text{Retained}$) and predicted unnormalized logit $z_n \in \mathbb{R}$:

The positive class weight $\omega_{\text{pos}}$ penalizes false negatives proportionally to class frequency:

$$\omega_{\text{pos}} = \frac{N_{\text{negative}}}{N_{\text{positive}}} \approx \frac{0.98}{0.02} \approx 45.0$$

The Weighted Binary Cross-Entropy with Logits loss for sample $n$ is formulated as:

$$\mathcal{L}_n = - \left[ \omega_{\text{pos}} \cdot y_n \cdot \log\left(\sigma(z_n)\right) + (1 - y_n) \cdot \log\left(1 - \sigma(z_n)\right) \right]$$

where $\sigma(z) = \frac{1}{1 + e^{-z}}$ is the logistic sigmoid function.

Numerically stable PyTorch implementation:

$$\mathcal{L}_n = \max(z_n, 0) - z_n \cdot y_n + \log\left(1 + e^{-|z_n|}\right) + (\omega_{\text{pos}} - 1) \cdot y_n \cdot \left[ \log\left(1 + e^{-z_n}\right) - z_n \right]$$

---

## 4. Concrete PyTorch Model Implementation

The implementation is located at `apps/api/src/analytics/model.py`.

```python
"""
apps/api/src/analytics/model.py
PyTorch Deep Learning MLP for Seat Churn Classification.
"""

from __future__ import annotations

import math
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple, Union
import torch
import torch.nn as nn


class SeatChurnClassifier(nn.Module):
    """
    Multilayer Perceptron (MLP) for predicting seat cancellation probability.
    Optimized for sub-millisecond CPU inference with batch normalization and dropout.
    """

    def __init__(self, input_dim: int = 16, hidden_dim: int = 64, dropout_rate: float = 0.2):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim

        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, 1),  # Raw logits output (unbounded z)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass returning unnormalized logits.
        Args:
            x: Input tensor of shape (BatchSize, 16)
        Returns:
            Logits tensor of shape (BatchSize, 1)
        """
        return self.net(x)

    @torch.inference_mode()
    def predict_probability(self, x: torch.Tensor) -> torch.Tensor:
        """
        Inference pass evaluating probability P(Drop | X) = sigma(z).
        Returns:
            Probability tensor of shape (BatchSize, 1) bounded in [0.0, 1.0].
        """
        self.eval()
        logits = self.forward(x)
        return torch.sigmoid(logits)


def build_loss_criterion(pos_weight_value: float = 45.0) -> nn.BCEWithLogitsLoss:
    """Constructs weighted BCE loss configured for severe 45:1 class imbalance."""
    weight = torch.tensor([pos_weight_value], dtype=torch.float32)
    return nn.BCEWithLogitsLoss(pos_weight=weight)


class FeatureVectorBuilder:
    """
    Constructs normalized 16-dimensional feature tensors from domain entities.
    """

    @staticmethod
    def extract_features(
        row_idx: int,
        col_idx: int,
        max_rows: int,
        max_cols: int,
        is_prime_row: bool,
        screen_format: str,
        delta_minutes: float,
        screening_time: datetime,
        occupancy_ratio: float,
        historical_sim: float = 0.5,
        cluster_density: float = 0.8,
    ) -> List[float]:
        """Constructs a 16-element float list adhering to Section 2 specification."""
        r_norm = float(row_idx) / max(1, max_rows - 1)
        c_norm = float(col_idx) / max(1, max_cols - 1)

        # Center distance
        center_r = max_rows / 2.0
        center_c = max_cols / 2.0
        max_dist = math.sqrt(center_r**2 + center_c**2)
        dist = math.sqrt((row_idx - center_r) ** 2 + (col_idx - center_c) ** 2)
        dist_norm = min(1.0, dist / max(1e-4, max_dist))

        # Prime column indicator (center 10 columns)
        is_prime_col = abs(col_idx - center_c) <= 5.0

        is_dolby = 1.0 if "DOLBY" in screen_format.upper() else 0.0
        is_imax = 1.0 if "IMAX" in screen_format.upper() else 0.0

        delta_norm = min(1.0, max(0.0, delta_minutes / 720.0))
        delta_inv = 1.0 / (1.0 + max(0.0, delta_minutes / 60.0))

        hour = screening_time.hour + (screening_time.minute / 60.0)
        hour_sin = math.sin(2.0 * math.pi * hour / 24.0)
        hour_cos = math.cos(2.0 * math.pi * hour / 24.0)

        dow = screening_time.weekday()
        dow_sin = math.sin(2.0 * math.pi * dow / 7.0)
        dow_cos = math.cos(2.0 * math.pi * dow / 7.0)

        return [
            r_norm,
            c_norm,
            dist_norm,
            1.0 if is_prime_row else 0.0,
            1.0 if is_prime_col else 0.0,
            is_dolby,
            is_imax,
            delta_norm,
            delta_inv,
            hour_sin,
            hour_cos,
            dow_sin,
            dow_cos,
            min(1.0, max(0.0, float(occupancy_ratio))),
            min(1.0, max(0.0, float(historical_sim))),
            min(1.0, max(0.0, float(cluster_density))),
        ]


def export_torchscript(model: SeatChurnClassifier, output_path: Union[str, Path]) -> Path:
    """Exports trained model to TorchScript JIT artifact for production inference."""
    model.eval()
    sample_input = torch.randn(1, 16, dtype=torch.float32)
    traced_model = torch.jit.trace(model, sample_input)
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    traced_model.save(str(out))
    return out
```

---

## 5. Verification Gates & Automated Test Suite

The test suite is located at `apps/api/tests/test_model.py`. It benchmarks the sub-5ms CPU forward pass latency, validates $(B, 1)$ output shape, and tests TorchScript tracing.

```python
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
```

---

## 6. Monorepo Directory Layout & Integration

```
apps/api/
├── src/
│   ├── analytics/
│   │   ├── __init__.py
│   │   ├── model.py              # SeatChurnClassifier, Loss, FeatureBuilder
│   │   └── telemetry.py
│   └── sentinel/
│       ├── schema.py
│       └── diff_engine.py
└── tests/
    └── test_model.py             # Gate 04 PyTorch Latency & Shape Tests
models/
└── checkpoints/
    └── churn_mlp_v2.pt           # TorchScript JIT Production Artifact
```

---

## 7. Antigravity Milestone Execution Directive

To execute the implementation of this specification in the Antigravity Agent environment:

```bash
# 1. Switch Active Model in Antigravity Terminal
/model gemini-3.1-pro

# 2. Trigger Autonomous Milestone 4.0 Execution
/milestone-new "Milestone 4.0 based on docs/modules/04_PYTORCH_CHURN_PREDICTOR.md"
```

The Antigravity agent will autonomously:
1. Create Git branch `feat/milestone-4.0`.
2. Generate task tracking document `tasks/Milestone4.0.md`.
3. Scaffold `apps/api/src/analytics/model.py`.
4. Run `apps/api/tests/test_model.py` verifying the sub-5ms CPU latency SLA, loss formulation, and TorchScript export.
