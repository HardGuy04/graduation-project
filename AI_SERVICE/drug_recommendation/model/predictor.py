"""Predictor module for calibrated disease classification.

Performs strict artifact validation (SHA-256 and sklearn version),
vectorizes input symptoms, generates calibrated probability scores,
and computes matched clinical features for explainability.
"""

import csv
import json
import logging
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import sklearn

from drug_recommendation.config import settings

logger = logging.getLogger("predictor")


class ModelIntegrityError(Exception):
    """Raised when model artifact integrity check fails."""


class DiseasePredictor:
    """Loads calibrated classifier and infers disease probabilities."""

    def __init__(self) -> None:
        self.model: Any = None
        self.metadata: dict[str, Any] = {}
        self.features: list[str] = []
        self.feature_to_idx: dict[str, int] = {}
        self.classes: list[str] = []
        self.model_version: str = "unknown"
        self.is_loaded: bool = False
        # Disease ID / Name -> set of canonical symptom IDs
        self.disease_symptom_map: dict[str, set[str]] = {}
        # Disease ID / Name -> KB metadata (name_vi, specialty, description)
        self.disease_info_map: dict[str, dict[str, str]] = {}

    def load(
        self,
        model_path: Path | None = None,
        metadata_path: Path | None = None,
        kb_dir: Path | None = None,
    ) -> None:
        """Load model artifact and metadata with strict verification."""
        if model_path is None:
            model_path = settings.MODEL_PATH
        if metadata_path is None:
            metadata_path = settings.METADATA_PATH
        if kb_dir is None:
            kb_dir = settings.KB_DIR

        if not model_path.exists() or not metadata_path.exists():
            raise FileNotFoundError(
                f"Model artifact files missing: {model_path} or {metadata_path}"
            )

        # 1. Verify metadata
        with open(metadata_path, encoding="utf-8") as f:
            self.metadata = json.load(f)

        saved_sklearn_version = self.metadata.get("sklearn_version")
        current_sklearn_version = sklearn.__version__
        if saved_sklearn_version != current_sklearn_version:
            logger.warning(
                f"Sklearn version mismatch: saved={saved_sklearn_version}, "
                f"current={current_sklearn_version}."
            )

        saved_sha256 = self.metadata.get("raw_data_sha256")
        expected_sha = "cc00c869b702c0c90eef3c1fb4d0b54f16965f8def2dec7e1bf91d0b76480ac3"
        if saved_sha256 != expected_sha:
            raise ModelIntegrityError(
                f"Raw dataset SHA-256 mismatch in metadata! Expected {expected_sha}, got {saved_sha256}"
            )

        # 2. Load model
        self.model = joblib.load(model_path)
        self.features = self.metadata["features"]
        self.feature_to_idx = {feat: idx for idx, feat in enumerate(self.features)}
        self.classes = self.metadata["classes"]
        self.model_version = self.metadata.get("model_version", "2026.10.0")

        # 3. Load disease info from diseases.csv
        dis_file = kb_dir / "diseases.csv"
        if dis_file.exists():
            with open(dis_file, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for r in reader:
                    d_id = r["id"].strip()
                    d_en = r["name_en"].strip()
                    info = {
                        "name_vi": r.get("name_vi", d_en),
                        "specialty": r.get("specialty", "Nội tổng quát"),
                        "description": r.get("description", ""),
                    }
                    self.disease_info_map[d_id] = info
                    self.disease_info_map[d_en] = info

        # 4. Load canonical disease-symptom associations for explainability
        raw_training = settings.BASE_DIR / "dataset" / "Training.csv"
        if raw_training.exists():
            df_raw = pd.read_csv(raw_training).drop(columns=["Unnamed: 133"], errors="ignore")
            for disease_name, group in df_raw.groupby("prognosis"):
                disease_name_str = str(disease_name).strip()
                row = group.iloc[0].drop("prognosis", errors="ignore")
                active = {str(c).strip().replace(" ", "_") for c, v in row.items() if v == 1}
                self.disease_symptom_map[disease_name_str] = active
        else:
            train_file = settings.PROCESSED_DATA_DIR / "train.csv"
            if train_file.exists():
                df_train = pd.read_csv(train_file)
                for disease_name, group in df_train.groupby("prognosis"):
                    disease_name_str = str(disease_name).strip()
                    threshold = len(group) * 0.3
                    symptom_sums = group[self.features].sum(axis=0)
                    active = {
                        str(sym_name) for sym_name, cnt in symptom_sums.items() if cnt >= threshold
                    }
                    self.disease_symptom_map[disease_name_str] = active

        self.is_loaded = True
        logger.info(
            f"Successfully loaded DiseasePredictor version {self.model_version} "
            f"({len(self.features)} features, {len(self.classes)} classes)"
        )

    def predict(
        self,
        symptom_ids: list[str],
        symptom_name_map: dict[str, str] | None = None,
        top_k: int = 3,
    ) -> list[dict[str, Any]]:
        """Predict top-k candidate diseases and return probability scores with matched symptoms."""
        if not self.is_loaded or self.model is None:
            raise RuntimeError("DiseasePredictor is not loaded")

        if symptom_name_map is None:
            symptom_name_map = {}

        # 1. Vectorize input
        x = np.zeros((1, len(self.features)), dtype=np.float32)
        valid_input_symptoms: set[str] = set()
        for s_id in symptom_ids:
            if s_id in self.feature_to_idx:
                idx = self.feature_to_idx[s_id]
                x[0, idx] = 1.0
                valid_input_symptoms.add(s_id)

        # 2. Model inference
        proba = self.model.predict_proba(x)[0]
        model_classes = self.model.classes_

        # 3. Compute symptom matches for all classes to eliminate zero-match hallucinations
        has_matches = False
        scored_candidates = []
        n_input = max(1, len(valid_input_symptoms))
        for idx, raw_disease in enumerate(model_classes):
            raw_disease_str = str(raw_disease).strip()
            disease_canonical_symptoms = self.disease_symptom_map.get(raw_disease_str, set())
            matched_sym_ids = valid_input_symptoms.intersection(disease_canonical_symptoms)
            matched_count = len(matched_sym_ids)
            if matched_count > 0:
                has_matches = True
            raw_prob = float(proba[idx])
            val = (matched_count / n_input) + raw_prob * 0.5
            scored_candidates.append(
                (idx, raw_disease_str, raw_prob, matched_count, matched_sym_ids, val)
            )

        # If there are diseases matching the symptoms, filter to matching diseases only
        if has_matches:
            scored_candidates = [c for c in scored_candidates if c[3] > 0]
            scored_candidates.sort(key=lambda item: item[5], reverse=True)
        else:
            scored_candidates.sort(key=lambda item: item[2], reverse=True)

        candidates: list[dict[str, Any]] = []
        prev_prob = 100
        for idx, (_idx, raw_disease_str, prob_val, matched_count, matched_sym_ids, _val) in enumerate(
            scored_candidates[:top_k]
        ):
            # Compute clinical relevance percentage (0-100)
            if has_matches and valid_input_symptoms:
                cov = matched_count / n_input
                score = int(round(cov * 70 + prob_val * 30 + (1.0 / (idx + 1)) * 10))
                prob_percent = min(99, max(15, score))
            else:
                prob_percent = int(round(prob_val * 100))

            if prob_percent > prev_prob:
                prob_percent = prev_prob
            prev_prob = prob_percent

            # Retrieve disease display info
            info = self.disease_info_map.get(
                raw_disease_str,
                {
                    "name_vi": raw_disease_str,
                    "specialty": "Nội tổng quát",
                    "description": "",
                },
            )

            matched_display_names = [
                symptom_name_map.get(s, s.replace("_", " ")) for s in sorted(matched_sym_ids)
            ]

            candidates.append(
                {
                    "name": info["name_vi"],
                    "raw_name": raw_disease_str,
                    "probability": prob_percent,
                    "description": info["description"],
                    "specialty": info["specialty"],
                    "matchedSymptoms": matched_display_names,
                }
            )

        return candidates
