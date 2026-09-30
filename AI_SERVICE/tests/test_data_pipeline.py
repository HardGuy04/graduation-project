"""Unit tests for dataset pipeline and augmentation."""

import pandas as pd

from scripts.build_dataset import augment_train_data, create_noisy_test


def test_data_augmentation_only_affects_train() -> None:
    """Verify data augmentation preserves structure and only expands training data."""
    # Create simple dummy dataset
    symptom_cols = [f"sym_{i}" for i in range(10)]
    data = []
    for i in range(5):
        row = {s: 0 for s in symptom_cols}
        row["sym_0"] = 1
        row["sym_1"] = 1
        row["sym_2"] = 1
        row["prognosis"] = f"disease_{i}"
        data.append(row)

    df_train = pd.DataFrame(data)
    variants = 4
    df_aug = augment_train_data(
        df_train=df_train,
        symptom_cols=symptom_cols,
        label_col="prognosis",
        variants_per_sample=variants,
        random_state=42,
    )

    # 1 original + 4 variants = 5 rows per input sample -> 5 * 5 = 25
    assert len(df_aug) == len(df_train) * (variants + 1)
    # Original rows must exist in augmented df
    for _, orig_row in df_train.iterrows():
        matches = (df_aug == orig_row).all(axis=1)
        assert matches.any()


def test_noisy_test_generation_preserves_length() -> None:
    """Verify test_noisy has identical length to test set and introduces perturbations."""
    symptom_cols = [f"sym_{i}" for i in range(10)]
    data = []
    for i in range(5):
        row = {s: 0 for s in symptom_cols}
        row["sym_0"] = 1
        row["sym_1"] = 1
        row["sym_2"] = 1
        row["sym_3"] = 1
        row["prognosis"] = f"disease_{i}"
        data.append(row)

    df_test = pd.DataFrame(data)
    df_noisy = create_noisy_test(
        df_test=df_test,
        symptom_cols=symptom_cols,
        label_col="prognosis",
        random_state=42,
    )

    assert len(df_noisy) == len(df_test)
    assert set(df_noisy.columns) == set(df_test.columns)
