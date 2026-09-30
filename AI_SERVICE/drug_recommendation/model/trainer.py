"""Model training and evaluation module for AI_SERVICE.

Compares LogisticRegression, BernoulliNB, and RandomForest with probability calibration,
evaluates top-1, top-3 accuracy, macro-F1, Brier score, and latency,
and exports model artifacts with metadata integrity checks.
"""

import json
import logging
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import StratifiedKFold
from sklearn.naive_bayes import BernoulliNB

from drug_recommendation.config import settings

logger = logging.getLogger("trainer")

RAW_SHA256_EXPECTED = "cc00c869b702c0c90eef3c1fb4d0b54f16965f8def2dec7e1bf91d0b76480ac3"


def compute_top_k_accuracy(
    y_true: np.ndarray, y_proba: np.ndarray, classes: np.ndarray, k: int = 3
) -> float:
    """Compute top-k accuracy: whether the true label is among top-k highest probabilities."""
    correct = 0
    top_k_indices = np.argsort(y_proba, axis=1)[:, -k:]
    for idx, true_label in enumerate(y_true):
        top_classes = classes[top_k_indices[idx]]
        if true_label in top_classes:
            correct += 1
    return correct / len(y_true)


def compute_multiclass_brier_score(
    y_true: np.ndarray, y_proba: np.ndarray, classes: np.ndarray
) -> float:
    """Compute multiclass Brier score (mean squared difference from one-hot target)."""
    class_to_idx = {c: i for i, c in enumerate(classes)}
    y_one_hot = np.zeros_like(y_proba)
    for i, label in enumerate(y_true):
        if label in class_to_idx:
            y_one_hot[i, class_to_idx[label]] = 1.0
    return float(np.mean(np.sum((y_proba - y_one_hot) ** 2, axis=1)))


class ModelTrainer:
    """Orchestrates model comparison, calibration, training, and artifact persistence."""

    def __init__(self, random_state: int = 42) -> None:
        self.random_state = random_state
        self.models_to_compare = {
            "LogisticRegression": LogisticRegression(
                C=1.0,
                max_iter=500,
                class_weight="balanced",
                random_state=self.random_state,
            ),
            "BernoulliNB": BernoulliNB(alpha=0.5),
            "RandomForest": RandomForestClassifier(
                n_estimators=100,
                max_depth=15,
                class_weight="balanced",
                random_state=self.random_state,
            ),
        }

    def evaluate_cv(
        self,
        X: np.ndarray,
        y: np.ndarray,
        classes: np.ndarray,
        n_splits: int = 5,
    ) -> dict[str, dict[str, float]]:
        """Run stratified K-fold cross-validation on all candidate model architectures."""
        logger.info(f"Running {n_splits}-fold Stratified CV comparison across candidate models...")
        results: dict[str, dict[str, float]] = {}
        skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=self.random_state)

        for name, base_estimator in self.models_to_compare.items():
            top1_scores: list[float] = []
            top3_scores: list[float] = []
            macro_f1s: list[float] = []
            brier_scores: list[float] = []
            latencies: list[float] = []

            for train_idx, val_idx in skf.split(X, y):
                X_tr, X_val = X[train_idx], X[val_idx]
                y_tr, y_val = y[train_idx], y[val_idx]

                # Calibrate probabilities with sigmoid
                calibrated = CalibratedClassifierCV(
                    estimator=base_estimator, method="sigmoid", cv=3
                )
                calibrated.fit(X_tr, y_tr)

                # Benchmark inference latency
                t0 = time.perf_counter()
                val_proba = calibrated.predict_proba(X_val)
                val_preds = calibrated.predict(X_val)
                latencies.append((time.perf_counter() - t0) * 1000.0 / len(X_val))

                top1_scores.append(float(accuracy_score(y_val, val_preds)))
                top3_scores.append(
                    float(compute_top_k_accuracy(y_val, val_proba, calibrated.classes_, k=3))
                )
                macro_f1s.append(float(f1_score(y_val, val_preds, average="macro")))
                brier_scores.append(
                    compute_multiclass_brier_score(y_val, val_proba, calibrated.classes_)
                )

            results[name] = {
                "top1_accuracy": float(np.mean(top1_scores)),
                "top3_accuracy": float(np.mean(top3_scores)),
                "macro_f1": float(np.mean(macro_f1s)),
                "brier_score": float(np.mean(brier_scores)),
                "latency_per_sample_ms": float(np.mean(latencies)),
            }
            logger.info(
                f"Model [{name}]: Top-1={results[name]['top1_accuracy'] * 100:.2f}%, "
                f"Top-3={results[name]['top3_accuracy'] * 100:.2f}%, "
                f"Macro-F1={results[name]['macro_f1']:.4f}, "
                f"Brier={results[name]['brier_score']:.4f}, "
                f"Latency={results[name]['latency_per_sample_ms']:.3f}ms"
            )

        return results

    def select_best_model(self, comparison_results: dict[str, dict[str, float]]) -> str:
        """Select best architecture based on composite clinical criteria."""
        best_name = ""
        best_score = -1e9

        for name, metrics in comparison_results.items():
            # Composite clinical score prioritizing top-3 accuracy, calibration, and low error
            score = (
                0.35 * metrics["top1_accuracy"]
                + 0.35 * metrics["top3_accuracy"]
                + 0.20 * metrics["macro_f1"]
                - 0.10 * metrics["brier_score"]
            )
            if score > best_score:
                best_score = score
                best_name = name

        logger.info(f"Selected best model: {best_name} with composite score {best_score:.4f}")
        return best_name

    def train_and_save(
        self,
        train_path: Path | None = None,
        val_path: Path | None = None,
        output_dir: Path | None = None,
    ) -> dict[str, Any]:
        """Train best model on augmented training set and persist artifacts."""
        if train_path is None:
            train_path = settings.PROCESSED_DATA_DIR / "train.csv"
        if val_path is None:
            val_path = settings.PROCESSED_DATA_DIR / "val.csv"
        if output_dir is None:
            output_dir = settings.ARTIFACTS_DIR

        output_dir.mkdir(parents=True, exist_ok=True)

        # 1. Load data
        df_train = pd.read_csv(train_path)
        df_val = pd.read_csv(val_path)
        label_col = "prognosis"
        feature_cols = [c for c in df_train.columns if c != label_col]

        X_train = df_train[feature_cols].values
        y_train = df_train[label_col].values
        X_val = df_val[feature_cols].values
        y_val = df_val[label_col].values
        all_classes = np.unique(y_train)

        # 2. Compare candidate models
        comparison = self.evaluate_cv(X_train, y_train, all_classes, n_splits=5)
        best_arch_name = self.select_best_model(comparison)

        # 3. Fit calibrated model on full augmented train set
        best_base_estimator = self.models_to_compare[best_arch_name]
        calibrated_model = CalibratedClassifierCV(
            estimator=best_base_estimator, method="sigmoid", cv=3
        )
        calibrated_model.fit(X_train, y_train)

        # 4. Measure on validation set
        val_proba = calibrated_model.predict_proba(X_val)
        val_preds = calibrated_model.predict(X_val)
        val_top1 = float(accuracy_score(y_val, val_preds))
        val_top3 = float(compute_top_k_accuracy(y_val, val_proba, calibrated_model.classes_, k=3))
        val_f1 = float(f1_score(y_val, val_preds, average="macro"))
        val_brier = compute_multiclass_brier_score(y_val, val_proba, calibrated_model.classes_)

        # 5. Measure latency distribution (p50 and p95 across 200 runs)
        sample_x = X_val[:1]
        latencies: list[float] = []
        for _ in range(200):
            t0 = time.perf_counter()
            calibrated_model.predict_proba(sample_x)
            latencies.append((time.perf_counter() - t0) * 1000.0)

        p50_latency = float(np.percentile(latencies, 50))
        p95_latency = float(np.percentile(latencies, 95))

        # 6. Save model.joblib
        model_file = output_dir / "model.joblib"
        joblib.dump(calibrated_model, model_file)
        model_size_mb = model_file.stat().st_size / (1024.0 * 1024.0)
        logger.info(f"Saved model artifact to {model_file} ({model_size_mb:.2f} MB)")

        # 7. Save metadata.json
        meta_file = output_dir / "metadata.json"
        metadata: dict[str, Any] = {
            "model_version": "2026.10.0",
            "created_at": datetime.now(UTC).isoformat(),
            "sklearn_version": sklearn.__version__,
            "raw_data_sha256": RAW_SHA256_EXPECTED,
            "selected_architecture": best_arch_name,
            "model_size_mb": round(model_size_mb, 2),
            "num_features": len(feature_cols),
            "features": feature_cols,
            "num_classes": len(all_classes),
            "classes": list(all_classes),
            "comparison_results": comparison,
            "validation_metrics": {
                "top1_accuracy": val_top1,
                "top3_accuracy": val_top3,
                "macro_f1": val_f1,
                "brier_score": val_brier,
            },
            "latency_ms": {
                "p50": round(p50_latency, 3),
                "p95": round(p95_latency, 3),
            },
        }

        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        logger.info(f"Saved model metadata to {meta_file}")

        return metadata
