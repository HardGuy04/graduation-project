"""Unit tests for Symptom Extractor module."""

from pathlib import Path

from drug_recommendation.nlp.symptom_extractor import SymptomExtractor


def test_extractor_exact_accented(mini_kb_dir: Path) -> None:
    """Verify standard accented Vietnamese symptom extraction."""
    extractor = SymptomExtractor(kb_dir=mini_kb_dir)
    res = extractor.extract("Bệnh nhân đau họng, sốt nhẹ và ho khan")
    assert "dau_hong" in res.recognized_symptoms
    assert "sot" in res.recognized_symptoms
    assert "ho_khan" in res.recognized_symptoms
    assert len(res.negated_symptoms) == 0


def test_extractor_unaccented(mini_kb_dir: Path) -> None:
    """Verify unaccented typing (dau hong, sot nhe, ho khan)."""
    extractor = SymptomExtractor(kb_dir=mini_kb_dir)
    res = extractor.extract("dau hong, sot nhe, ho khan")
    assert "dau_hong" in res.recognized_symptoms
    assert "sot" in res.recognized_symptoms
    assert "ho_khan" in res.recognized_symptoms


def test_extractor_fuzzy_typo(mini_kb_dir: Path) -> None:
    """Verify RapidFuzz fuzzy match on typing errors."""
    extractor = SymptomExtractor(kb_dir=mini_kb_dir, fuzzy_threshold=85)
    res = extractor.extract("dau hog, soot nhe")
    # "dau hog" -> dau_hong, "soot nhe" -> sot
    assert "dau_hong" in res.recognized_symptoms or "sot" in res.recognized_symptoms


def test_extractor_negation_handling(mini_kb_dir: Path) -> None:
    """Verify negation terms in Vietnamese do NOT activate the symptom."""
    extractor = SymptomExtractor(kb_dir=mini_kb_dir)
    # Patient does NOT have fever, but has sore throat and cough
    res = extractor.extract("Bệnh nhân không sốt, chỉ bị đau họng và ho khan")
    assert "sot" not in res.recognized_symptoms
    assert "dau_hong" in res.recognized_symptoms
    assert "ho_khan" in res.recognized_symptoms
    assert len(res.negated_symptoms) >= 1


def test_extractor_negation_chua_het(mini_kb_dir: Path) -> None:
    """Verify 'chưa bị' and 'hết đau' negation phrases."""
    extractor = SymptomExtractor(kb_dir=mini_kb_dir)
    res = extractor.extract("Chưa bị sốt, đã hết đau đầu, hiện chỉ thấy đau khớp")
    assert "sot" not in res.recognized_symptoms
    assert "dau_dau" not in res.recognized_symptoms
    assert "dau_khop" in res.recognized_symptoms


def test_extractor_unrecognized_terms(mini_kb_dir: Path) -> None:
    """Verify unknown medical phrases are surfaced as unrecognized terms."""
    extractor = SymptomExtractor(kb_dir=mini_kb_dir)
    res = extractor.extract("đau răng hàm mặt, sốt nhẹ")
    assert "sot" in res.recognized_symptoms
    assert any("răng" in term or "rang" in term for term in res.unrecognized_terms)


def test_extractor_empty_input(mini_kb_dir: Path) -> None:
    """Verify empty input returns empty result gracefully."""
    extractor = SymptomExtractor(kb_dir=mini_kb_dir)
    res = extractor.extract("")
    assert len(res.recognized_symptoms) == 0
    assert len(res.unrecognized_terms) == 0
