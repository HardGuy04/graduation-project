"""Unit tests for Vietnamese NLP text normalizer."""

from drug_recommendation.nlp.normalizer import normalize_text, strip_accents


def test_strip_accents() -> None:
    """Verify accurate Vietnamese diacritic removal with case preservation."""
    assert strip_accents("Đau họng") == "Dau hong"
    assert strip_accents("Đau họng".lower()) == "dau hong"
    assert strip_accents("Mệt mỏi kiệt sức") == "Met moi kiet suc"
    assert strip_accents("Sốt cao co giật") == "Sot cao co giat"
    assert strip_accents("Khó thở, ho đờm") == "Kho tho, ho dom"
    assert strip_accents("ĐÁI THÁO ĐƯỜNG") == "DAI THAO DUONG"


def test_normalize_text_basic() -> None:
    """Verify Unicode NFC, lowercase, whitespace collapsing, and clause splitting."""
    raw = "  Đau Họng,   Sốt Nhẹ - Ho Khan...   "
    res = normalize_text(raw)
    assert res.accented == "đau họng, sốt nhẹ, ho khan"
    assert res.unaccented == "dau hong, sot nhe, ho khan"
    assert len(res.clauses) == 3
    assert res.clauses[0] == "đau họng"
    assert res.clauses[1] == "sốt nhẹ"
    assert res.clauses[2] == "ho khan"


def test_normalize_text_control_characters() -> None:
    """Verify control characters and tabs are cleaned."""
    raw = "Bệnh nhân sốt\t\rcao\x00\x08, mệt mỏi\n"
    res = normalize_text(raw)
    assert "\t" not in res.accented
    assert "\x00" not in res.accented
    assert "sốt cao" in res.accented


def test_normalize_empty_and_whitespace() -> None:
    """Verify graceful handling of empty or blank strings."""
    res = normalize_text("")
    assert res.accented == ""
    assert res.unaccented == ""
    assert res.clauses == []

    res2 = normalize_text("   , - .   ")
    assert res2.accented == ""
    assert res2.clauses == []
