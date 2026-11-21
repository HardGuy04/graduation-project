"""Pytest fixtures configuration."""

import csv
from pathlib import Path
from typing import Any

import pytest
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression

from tests.fixtures.fixture_data import (
    FIXTURE_DISEASE_MEDICINE,
    FIXTURE_DISEASES,
    FIXTURE_MEDICINES,
    FIXTURE_SYMPTOMS,
    generate_mini_dataset,
)


@pytest.fixture
def mini_dataset() -> Any:
    """Fixture returning 150-sample mini dataset."""
    return generate_mini_dataset(num_samples=150, random_state=42)


@pytest.fixture
def mini_kb_dir(tmp_path: Path) -> Path:
    """Create a temporary populated Knowledge Base directory."""
    kb_path = tmp_path / "kb"
    kb_path.mkdir(parents=True, exist_ok=True)

    # 1. diseases.csv
    with open(kb_path / "diseases.csv", "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "id",
                "name_vi",
                "name_en",
                "specialty",
                "description",
                "aliases",
                "red_flag",
                "source",
                "reviewed",
            ],
        )
        writer.writeheader()
        writer.writerows(FIXTURE_DISEASES)

    # 2. symptoms.csv & symptom_map_vi.csv
    sym_rows = []
    map_rows = []
    for s_id, n_vi, n_en, cat, wt, al in FIXTURE_SYMPTOMS:
        sym_rows.append(
            {
                "id": s_id,
                "name_vi": n_vi,
                "name_en": n_en,
                "category": cat,
                "severity_weight": wt,
                "aliases": al,
                "source": "fixture",
                "reviewed": "true",
            }
        )
        map_rows.append(
            {
                "symptom_id": s_id,
                "name_en": n_en,
                "name_vi": n_vi,
                "aliases_vi": al,
                "reviewed": "true",
                "source": "fixture",
            }
        )

    with open(kb_path / "symptoms.csv", "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "id",
                "name_vi",
                "name_en",
                "category",
                "severity_weight",
                "aliases",
                "source",
                "reviewed",
            ],
        )
        writer.writeheader()
        writer.writerows(sym_rows)

    with open(kb_path / "symptom_map_vi.csv", "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["symptom_id", "name_en", "name_vi", "aliases_vi", "reviewed", "source"],
        )
        writer.writeheader()
        writer.writerows(map_rows)

    # 3. medicines.csv
    with open(kb_path / "medicines.csv", "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "id",
                "name",
                "active_ingredient",
                "group",
                "usage",
                "prescription_required",
                "contraindications",
                "source",
                "reviewed",
            ],
        )
        writer.writeheader()
        writer.writerows(FIXTURE_MEDICINES)

    # 4. disease_medicine.csv
    dm_rows = [
        {
            "disease_id": did,
            "medicine_id": mid,
            "weight": wt,
            "line": ln,
            "note": nt,
            "source": "fixture",
            "reviewed": "true",
        }
        for did, mid, wt, ln, nt in FIXTURE_DISEASE_MEDICINE
    ]
    with open(kb_path / "disease_medicine.csv", "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "disease_id",
                "medicine_id",
                "weight",
                "line",
                "note",
                "source",
                "reviewed",
            ],
        )
        writer.writeheader()
        writer.writerows(dm_rows)

    return kb_path


@pytest.fixture
def mini_trained_model(mini_dataset: Any) -> dict[str, Any]:
    """Train and return a calibrated model on the mini dataset fixture."""
    df = mini_dataset
    feature_cols = [c for c in df.columns if c != "prognosis"]
    X = df[feature_cols].values
    y = df["prognosis"].values

    base_clf = LogisticRegression(max_iter=200, random_state=42)
    calibrated = CalibratedClassifierCV(estimator=base_clf, method="sigmoid", cv=3)
    calibrated.fit(X, y)

    return {
        "model": calibrated,
        "feature_order": feature_cols,
        "classes": list(calibrated.classes_),
    }
