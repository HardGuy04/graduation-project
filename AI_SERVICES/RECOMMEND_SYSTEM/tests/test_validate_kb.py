"""Unit tests for Knowledge Base validation rules."""

from pathlib import Path

from scripts.validate_kb import validate_kb


def test_validate_kb_passes_on_valid_fixture(mini_kb_dir: Path) -> None:
    """Valid fixture Knowledge Base must pass validation cleanly."""
    assert validate_kb(mini_kb_dir) is True


def test_validate_kb_detects_foreign_key_violation(mini_kb_dir: Path) -> None:
    """Referencing non-existent disease_id in disease_medicine.csv must fail."""
    dm_path = mini_kb_dir / "disease_medicine.csv"
    with open(dm_path, "a", encoding="utf-8") as f:
        f.write("non_existent_disease,med_paracetamol,0.9,1,test note,fixture,true\n")

    assert validate_kb(mini_kb_dir) is False


def test_validate_kb_detects_invalid_specialty(mini_kb_dir: Path) -> None:
    """Invalid specialty in diseases.csv must fail validation."""
    dis_path = mini_kb_dir / "diseases.csv"
    content = dis_path.read_text(encoding="utf-8")
    # Replace valid specialty with invalid one
    bad_content = content.replace("Tai Mũi Họng", "Khoa_Khong_Hop_Le")
    dis_path.write_text(bad_content, encoding="utf-8")

    assert validate_kb(mini_kb_dir) is False
