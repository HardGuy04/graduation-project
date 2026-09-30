"""Dataset Processing and Augmentation Pipeline for AI_SERVICE.

Extracts raw dataset, resolves duplicate columns, deduplicates samples,
splits into train/val/test, applies clinical data augmentation to train only,
and exports processed datasets to data/processed/.
"""

import hashlib
import json
import logging
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from drug_recommendation.config import settings  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s]: %(message)s")
logger = logging.getLogger("build_dataset")

EXPECTED_RAW_SHA256 = "cc00c869b702c0c90eef3c1fb4d0b54f16965f8def2dec7e1bf91d0b76480ac3"


def compute_sha256(filepath: Path) -> str:
    """Compute SHA-256 hash of a file."""
    return hashlib.sha256(filepath.read_bytes()).hexdigest()


def normalize_symptom(s: str) -> str:
    """Normalize raw symptom column to snake_case."""
    clean = s.strip().lower()
    for ch in ["(", ")", "[", "]", "{", "}", ",", ".", "'"]:
        clean = clean.replace(ch, "_")
    clean = clean.replace(" ", "_")
    while "__" in clean:
        clean = clean.replace("__", "_")
    return clean.strip("_")


def augment_train_data(
    df_train: pd.DataFrame,
    symptom_cols: list[str],
    label_col: str,
    variants_per_sample: int = 8,
    random_state: int = 42,
) -> pd.DataFrame:
    """Apply clinical data augmentation ONLY to the training set.

    Simulates real-world clinical presentations:
    - Doctor input with 20-40% missing secondary symptoms.
    - Patient mentioning 1-2 unrelated/noisy symptoms.
    """
    rng = np.random.default_rng(random_state)
    augmented_rows: list[dict[str, Any]] = []

    for _, row in df_train.iterrows():
        # Keep original row
        orig_dict = row.to_dict()
        augmented_rows.append(orig_dict)

        active_symptoms = [c for c in symptom_cols if row[c] == 1]
        zero_symptoms = [c for c in symptom_cols if row[c] == 0]

        for _ in range(variants_per_sample):
            variant = dict(orig_dict)

            # 1. Symptom dropout (simulating under-reporting)
            if len(active_symptoms) > 2 and rng.random() < 0.85:
                drop_rate = rng.uniform(0.20, 0.40)
                num_drop = max(1, int(len(active_symptoms) * drop_rate))
                drop_cols = rng.choice(active_symptoms, size=num_drop, replace=False)
                for dc in drop_cols:
                    variant[dc] = 0

            # 2. Symptom noise injection (simulating unrelated complaints)
            if zero_symptoms and rng.random() < 0.60:
                num_noise = rng.integers(1, 3)
                noise_cols = rng.choice(zero_symptoms, size=num_noise, replace=False)
                for nc in noise_cols:
                    variant[nc] = 1

            augmented_rows.append(variant)

    df_aug = pd.DataFrame(augmented_rows)
    return df_aug


def create_noisy_test(
    df_test: pd.DataFrame,
    symptom_cols: list[str],
    label_col: str,
    random_state: int = 42,
) -> pd.DataFrame:
    """Generate test_noisy strictly from clean test set to test robustness."""
    rng = np.random.default_rng(random_state)
    noisy_rows: list[dict[str, Any]] = []

    for _, row in df_test.iterrows():
        variant = row.to_dict()
        active = [c for c in symptom_cols if row[c] == 1]
        zeros = [c for c in symptom_cols if row[c] == 0]

        # Drop 35% of active symptoms
        if len(active) > 2:
            num_drop = int(len(active) * 0.35)
            drop_cols = rng.choice(active, size=num_drop, replace=False)
            for dc in drop_cols:
                variant[dc] = 0

        # Inject 1-2 noise symptoms
        if zeros:
            num_noise = rng.integers(1, 3)
            noise_cols = rng.choice(zeros, size=num_noise, replace=False)
            for nc in noise_cols:
                variant[nc] = 1

        noisy_rows.append(variant)

    return pd.DataFrame(noisy_rows)


def build_datasets() -> dict[str, Any]:
    """Execute complete dataset building pipeline."""
    raw_path = settings.RAW_DATA_DIR / "Training.csv"
    if not raw_path.exists():
        raise FileNotFoundError(f"Raw file {raw_path} not found")

    actual_sha = compute_sha256(raw_path)
    logger.info(f"Verified raw Training.csv SHA-256: {actual_sha}")
    if actual_sha != EXPECTED_RAW_SHA256:
        logger.warning(
            f"Raw file SHA-256 mismatch! Expected {EXPECTED_RAW_SHA256}, got {actual_sha}"
        )

    # 1. Read raw CSV
    df_raw = pd.read_csv(raw_path)
    logger.info(f"Loaded raw dataset with shape {df_raw.shape}")

    # 2. Merge duplicate column 'fluid_overload' and 'fluid_overload.1'
    if "fluid_overload.1" in df_raw.columns:
        logger.info("Merging duplicate column 'fluid_overload.1' into 'fluid_overload'...")
        df_raw["fluid_overload"] = df_raw["fluid_overload"] | df_raw["fluid_overload.1"]
        df_raw = df_raw.drop(columns=["fluid_overload.1"])

    # 3. Normalize symptom column names
    label_col = "prognosis"
    symptom_cols_raw = [c for c in df_raw.columns if c != label_col]
    rename_map = {c: normalize_symptom(c) for c in symptom_cols_raw}
    df_raw = df_raw.rename(columns=rename_map)
    symptom_cols = [rename_map[c] for c in symptom_cols_raw]

    # Clean label column
    df_raw[label_col] = df_raw[label_col].astype(str).str.strip()

    # 4. Deduplicate rows before splitting
    total_raw_rows = len(df_raw)
    df_dedup = df_raw.drop_duplicates().copy()
    unique_rows = len(df_dedup)
    dup_percentage = ((total_raw_rows - unique_rows) / total_raw_rows) * 100.0
    logger.info(
        f"Deduplicated dataset: {total_raw_rows} -> {unique_rows} unique rows "
        f"({dup_percentage:.2f}% duplicate reduction)"
    )

    # 5. Deterministic stratified per-class partitioning
    train_indices: list[int] = []
    val_indices: list[int] = []
    test_indices: list[int] = []

    rng = np.random.default_rng(42)
    for _label, group in df_dedup.groupby(label_col):
        indices = group.index.tolist()
        rng.shuffle(indices)
        # 1 sample to test, 1 sample to val, remaining to train
        test_indices.append(indices[0])
        val_indices.append(indices[1])
        train_indices.extend(indices[2:])

    df_train_clean = df_dedup.loc[train_indices].copy()
    df_val = df_dedup.loc[val_indices].copy()
    df_test = df_dedup.loc[test_indices].copy()

    # Integrity assertions: zero data leakage across splits
    assert set(train_indices).isdisjoint(set(val_indices))
    assert set(train_indices).isdisjoint(set(test_indices))
    assert set(val_indices).isdisjoint(set(test_indices))

    logger.info(
        f"Split sizes: Train={len(df_train_clean)} ({df_train_clean[label_col].nunique()} classes), "
        f"Val={len(df_val)} ({df_val[label_col].nunique()} classes), "
        f"Test={len(df_test)} ({df_test[label_col].nunique()} classes)"
    )

    # 6. Apply Data Augmentation ONLY to Train
    df_train_augmented = augment_train_data(
        df_train=df_train_clean,
        symptom_cols=symptom_cols,
        label_col=label_col,
        variants_per_sample=8,
        random_state=42,
    )
    logger.info(f"Augmented Train size: {len(df_train_augmented)} samples")

    # 7. Create test_noisy from test
    df_test_noisy = create_noisy_test(
        df_test=df_test,
        symptom_cols=symptom_cols,
        label_col=label_col,
        random_state=42,
    )
    logger.info(f"Generated test_noisy size: {len(df_test_noisy)} samples")

    # 8. Export to data/processed/
    proc_dir = settings.PROCESSED_DATA_DIR
    proc_dir.mkdir(parents=True, exist_ok=True)

    train_out = proc_dir / "train.csv"
    val_out = proc_dir / "val.csv"
    test_out = proc_dir / "test.csv"
    noisy_out = proc_dir / "test_noisy.csv"
    meta_out = proc_dir / "dataset_metadata.json"

    df_train_augmented.to_csv(train_out, index=False)
    df_val.to_csv(val_out, index=False)
    df_test.to_csv(test_out, index=False)
    df_test_noisy.to_csv(noisy_out, index=False)

    metadata: dict[str, Any] = {
        "created_at": datetime.now(UTC).isoformat(),
        "raw_source_file": "dataset/Training.csv",
        "raw_sha256": actual_sha,
        "total_raw_rows": total_raw_rows,
        "unique_raw_rows": unique_rows,
        "duplicate_percentage": dup_percentage,
        "symptom_features_count": len(symptom_cols),
        "symptom_features": symptom_cols,
        "num_classes": int(df_dedup[label_col].nunique()),
        "classes": sorted(df_dedup[label_col].unique().tolist()),
        "splits": {
            "train_augmented": len(df_train_augmented),
            "train_clean": len(df_train_clean),
            "val": len(df_val),
            "test": len(df_test),
            "test_noisy": len(df_test_noisy),
        },
        "augmentation": {
            "applied_to": "train_only",
            "variants_per_sample": 8,
            "dropout_rate_range": [0.20, 0.40],
            "noise_symptoms_range": [1, 2],
        },
    }

    with open(meta_out, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    logger.info(f"Datasets and metadata successfully saved to {proc_dir}")
    return metadata


def main() -> None:
    """Build datasets CLI entry point."""
    meta = build_datasets()
    print("=================================================================")
    print("DATASET BUILD COMPLETED SUCCESSFULLY!")
    print(f"Features: {meta['symptom_features_count']} symptoms")
    print(f"Classes: {meta['num_classes']} diseases")
    print(f"Train Augmented: {meta['splits']['train_augmented']} rows")
    print(f"Validation: {meta['splits']['val']} rows")
    print(f"Test Clean: {meta['splits']['test']} rows")
    print(f"Test Noisy: {meta['splits']['test_noisy']} rows")
    print("Zero Leakage across splits: VERIFIED")
    print("=================================================================")


if __name__ == "__main__":
    main()
