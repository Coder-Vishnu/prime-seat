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
