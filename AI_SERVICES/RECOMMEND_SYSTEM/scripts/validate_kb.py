"""Knowledge Base Validation Script for AI_SERVICE.

Validates schema, data integrity, foreign key references, and clinical constraints
across all CSV files in data/kb/.
"""

import csv
import logging
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from drug_recommendation.config import settings  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s]: %(message)s")
logger = logging.getLogger("validate_kb")

VALID_SPECIALTIES: set[str] = {
    "Nội tổng quát",
    "Nhi khoa",
    "Da liễu",
    "Tai Mũi Họng",
    "Tim mạch",
    "Cơ xương khớp",
    "OUT_OF_SCOPE",
}


class KBValidationError(Exception):
    """Raised when Knowledge Base fails schema or integrity checks."""


def validate_csv_columns(filepath: Path, required_cols: list[str]) -> list[dict[str, str]]:
    """Verify that file exists and contains all required column headers."""
    if not filepath.exists():
        raise KBValidationError(f"Missing required Knowledge Base file: {filepath}")

    with open(filepath, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise KBValidationError(f"File {filepath} is empty or has no header")

        missing_cols = set(required_cols) - set(reader.fieldnames)
        if missing_cols:
            raise KBValidationError(
                f"File {filepath.name} is missing required columns: {sorted(missing_cols)}"
            )

        return list(reader)


def validate_kb(kb_dir: Path | None = None) -> bool:
    """Run comprehensive validation on all Knowledge Base files."""
    if kb_dir is None:
        kb_dir = settings.KB_DIR

    logger.info(f"Validating Knowledge Base in {kb_dir}...")
    errors: list[str] = []

    # 1. Validate diseases.csv
    diseases_path = kb_dir / "diseases.csv"
    disease_rows = validate_csv_columns(
        diseases_path,
        [
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
    disease_ids: set[str] = set()
    for idx, r in enumerate(disease_rows, 1):
        d_id = r["id"].strip()
        if not d_id:
            errors.append(f"diseases.csv row {idx}: Empty disease id")
        elif d_id in disease_ids:
            errors.append(f"diseases.csv row {idx}: Duplicate disease id '{d_id}'")
        disease_ids.add(d_id)

        spec = r["specialty"].strip()
        if spec not in VALID_SPECIALTIES:
            errors.append(
                f"diseases.csv row {idx}: Invalid specialty '{spec}'. Allowed: {sorted(VALID_SPECIALTIES)}"
            )

        rf = r["red_flag"].strip().lower()
        if rf not in ("true", "false"):
            errors.append(f"diseases.csv row {idx}: red_flag must be 'true' or 'false', got '{rf}'")

        if settings.KB_REQUIRE_REVIEWED and r["reviewed"].strip().lower() != "true":
            errors.append(f"diseases.csv row {idx} ('{d_id}'): reviewed is not true")

    # 2. Validate symptoms.csv
    symptoms_path = kb_dir / "symptoms.csv"
    symptom_rows = validate_csv_columns(
        symptoms_path,
        [
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
    symptom_ids: set[str] = set()
    for idx, r in enumerate(symptom_rows, 1):
        s_id = r["id"].strip()
        if not s_id:
            errors.append(f"symptoms.csv row {idx}: Empty symptom id")
        elif s_id in symptom_ids:
            errors.append(f"symptoms.csv row {idx}: Duplicate symptom id '{s_id}'")
        symptom_ids.add(s_id)

        try:
            w = int(r["severity_weight"])
            if w < 1 or w > 10:
                errors.append(f"symptoms.csv row {idx}: severity_weight {w} out of range [1, 10]")
        except ValueError:
            errors.append(f"symptoms.csv row {idx}: severity_weight is not an integer")

        if settings.KB_REQUIRE_REVIEWED and r["reviewed"].strip().lower() != "true":
            errors.append(f"symptoms.csv row {idx} ('{s_id}'): reviewed is not true")

    # 3. Validate symptom_map_vi.csv
    map_path = kb_dir / "symptom_map_vi.csv"
    map_rows = validate_csv_columns(
        map_path,
        ["symptom_id", "name_en", "name_vi", "aliases_vi", "reviewed", "source"],
    )
    for idx, r in enumerate(map_rows, 1):
        sid = r["symptom_id"].strip()
        if sid not in symptom_ids:
            errors.append(
                f"symptom_map_vi.csv row {idx}: Foreign key violation - symptom_id '{sid}' does not exist in symptoms.csv"
            )
        if not r["name_vi"].strip():
            errors.append(f"symptom_map_vi.csv row {idx}: Empty name_vi for '{sid}'")

    # 4. Validate medicines.csv
    medicines_path = kb_dir / "medicines.csv"
    medicine_rows = validate_csv_columns(
        medicines_path,
        [
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
    medicine_ids: set[str] = set()
    for idx, r in enumerate(medicine_rows, 1):
        m_id = r["id"].strip()
        if not m_id:
            errors.append(f"medicines.csv row {idx}: Empty medicine id")
        elif m_id in medicine_ids:
            errors.append(f"medicines.csv row {idx}: Duplicate medicine id '{m_id}'")
        medicine_ids.add(m_id)

        rx = r["prescription_required"].strip().lower()
        if rx not in ("true", "false"):
            errors.append(
                f"medicines.csv row {idx}: prescription_required must be 'true' or 'false', got '{rx}'"
            )

        if settings.KB_REQUIRE_REVIEWED and r["reviewed"].strip().lower() != "true":
            errors.append(f"medicines.csv row {idx} ('{m_id}'): reviewed is not true")

    # 5. Validate disease_medicine.csv
    dm_path = kb_dir / "disease_medicine.csv"
    dm_rows = validate_csv_columns(
        dm_path,
        ["disease_id", "medicine_id", "weight", "line", "note", "source", "reviewed"],
    )
    for idx, r in enumerate(dm_rows, 1):
        did = r["disease_id"].strip()
        mid = r["medicine_id"].strip()

        if did not in disease_ids:
            errors.append(
                f"disease_medicine.csv row {idx}: Foreign key violation - disease_id '{did}' does not exist in diseases.csv"
            )
        if mid not in medicine_ids:
            errors.append(
                f"disease_medicine.csv row {idx}: Foreign key violation - medicine_id '{mid}' does not exist in medicines.csv"
            )

        try:
            wt = float(r["weight"])
            if wt < 0.0 or wt > 1.0:
                errors.append(
                    f"disease_medicine.csv row {idx}: weight {wt} out of range [0.0, 1.0]"
                )
        except ValueError:
            errors.append(f"disease_medicine.csv row {idx}: weight is not a float")

        try:
            ln = int(r["line"])
            if ln not in (1, 2, 3):
                errors.append(f"disease_medicine.csv row {idx}: line must be 1, 2, or 3, got {ln}")
        except ValueError:
            errors.append(f"disease_medicine.csv row {idx}: line is not an integer")

        if settings.KB_REQUIRE_REVIEWED and r["reviewed"].strip().lower() != "true":
            errors.append(f"disease_medicine.csv row {idx} ('{did}'-'{mid}'): reviewed is not true")

    if errors:
        logger.error(f"Knowledge Base validation failed with {len(errors)} error(s):")
        for err in errors[:20]:
            logger.error(f"  - {err}")
        if len(errors) > 20:
            logger.error(f"  ... and {len(errors) - 20} more errors")
        return False

    logger.info(
        f"Knowledge Base validation passed successfully! "
        f"({len(disease_ids)} diseases, {len(symptom_ids)} symptoms, "
        f"{len(medicine_ids)} medicines, {len(dm_rows)} associations)"
    )
    return True


def main() -> None:
    """Validate KB CLI entry point."""
    success = validate_kb()
    if not success:
        sys.exit(1)
    print("KB Validation: SUCCESS")


if __name__ == "__main__":
    main()
