"""Text normalization module for clinical Vietnamese input.

Applies Unicode NFC normalization, control character removal, whitespace collapsing,
and maintains parallel accented and unaccented representations.
"""

import re
import unicodedata
from dataclasses import dataclass


@dataclass(frozen=True)
class NormalizedText:
    """Container holding parallel accented and unaccented normalized forms."""

    accented: str
    unaccented: str
    clauses: list[str]


def strip_accents(text: str) -> str:
    """Remove Vietnamese diacritics while preserving base ASCII characters and case."""
    # Convert 'đ' and 'Đ' preserving case
    text = text.replace("đ", "d").replace("Đ", "D")
    nfd = unicodedata.normalize("NFKD", text)
    stripped = "".join(c for c in nfd if not unicodedata.combining(c))
    return unicodedata.normalize("NFC", stripped)


def normalize_text(raw_text: str) -> NormalizedText:
    """Normalize input text into standardized accented and unaccented forms.

    Steps:
    1. Unicode NFC normalization.
    2. Lowercase conversion.
    3. Removal of non-printable / control characters.
    4. Standardization of punctuation separators (commas, semicolons, dashes).
    5. Whitespace collapsing.
    6. Splitting into semantic clauses for negation scope.
    """
    if not raw_text:
        return NormalizedText(accented="", unaccented="", clauses=[])

    # 1. Unicode NFC
    text = unicodedata.normalize("NFC", raw_text)

    # 2. Lowercase
    text = text.lower()

    # 3. Remove control characters (except newline)
    text = "".join(
        ch if ch == "\n" or not unicodedata.category(ch).startswith("C") else " " for ch in text
    )

    # 4. Standardize punctuation: convert dashes, slashes, bullets into commas
    text = re.sub(r"[\t\r]+", " ", text)
    text = re.sub(r"\s*[\n;+•\-–—/]+\s*", ", ", text)
    # Collapse multiple commas/periods and clean whitespace around punctuation
    text = re.sub(r"\s*[,]+\s*", ", ", text)
    text = re.sub(r"\s*[.]+\s*", ". ", text)

    # 5. Whitespace collapsing
    text = re.sub(r"\s+", " ", text).strip(" ,.")

    # 6. Unaccented version
    unaccented = strip_accents(text)

    # 7. Semantic clauses (split on commas, periods, conjunctions ' và ', ' kèm ')
    clause_delimiters = re.compile(r"[,.]|\b(?:và|kèm|cùng với|nhưng)\b")
    raw_clauses = clause_delimiters.split(text)
    clauses = [c.strip() for c in raw_clauses if c.strip()]

    return NormalizedText(accented=text, unaccented=unaccented, clauses=clauses)
