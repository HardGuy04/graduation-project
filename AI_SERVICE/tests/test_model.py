"""Unit tests for model training, predictor, and integrity checks."""

from pathlib import Path

import pytest

from drug_recommendation.model.predictor import DiseasePredictor, ModelIntegrityError
from drug_recommendation.model.trainer import ModelTrainer


def test_predictor_integrity_check_fails_on_tampered_sha(tmp_path: Path) -> None:
    """Predictor must raise ModelIntegrityError if raw_data_sha256 is tampered with."""
    meta_path = tmp_path / "metadata.json"
    meta_path.write_text(
        '{"sklearn_version": "1.0", "raw_data_sha256": "tampered_fake_sha"}',
        encoding="utf-8",
    )
    model_path = tmp_path / "model.joblib"
    model_path.write_bytes(b"dummy")

    predictor = DiseasePredictor()
    with pytest.raises(ModelIntegrityError):
        predictor.load(model_path=model_path, metadata_path=meta_path)


def test_predictor_inference_with_loaded_model() -> None:
    """Predictor should infer probabilities, return integer 0-100, and sort descending."""
    predictor = DiseasePredictor()
    predictor.load()

    candidates = predictor.predict(["throat_irritation", "cough"], top_k=3)
    assert len(candidates) <= 3
    assert len(candidates) > 0

    prev_prob = 101
    for c in candidates:
        assert 0 <= c["probability"] <= 100
        assert c["probability"] <= prev_prob
        prev_prob = c["probability"]
        assert "name" in c
        assert "specialty" in c
        assert isinstance(c["matchedSymptoms"], list)


def test_trainer_on_mini_fixture(mini_dataset: object, tmp_path: Path) -> None:
    """Verify trainer runs on lightweight fixture dataset without external dependencies."""
    df: object = mini_dataset
    train_csv = tmp_path / "train.csv"
    val_csv = tmp_path / "val.csv"
    # Write mini train/val
    import pandas as pd

    assert isinstance(df, pd.DataFrame)
    df.iloc[:100].to_csv(train_csv, index=False)
    df.iloc[100:].to_csv(val_csv, index=False)

    trainer = ModelTrainer(random_state=42)
    meta = trainer.train_and_save(
        train_path=train_csv,
        val_path=val_csv,
        output_dir=tmp_path / "artifacts",
    )

    assert "selected_architecture" in meta
    assert (tmp_path / "artifacts" / "model.joblib").exists()
    assert (tmp_path / "artifacts" / "metadata.json").exists()
