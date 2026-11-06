"""Symptom extraction module from clinical free-form text.

Supports:
- Longest-match n-gram dictionary lookup.
- Fuzzy matching with RapidFuzz for typos.
- Accented and unaccented Vietnamese matching.
- Vietnamese negation detection ("không sốt", "chưa bị ho", "hết đau đầu").
- Unrecognized terms reporting.
"""

import csv
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

import rapidfuzz.fuzz as fuzz

from drug_recommendation.config import settings
from drug_recommendation.nlp.normalizer import (
    NormalizedText,
    normalize_text,
    strip_accents,
)

logger = logging.getLogger("symptom_extractor")

# Vietnamese negation prefixes (accented and unaccented)
NEGATION_PATTERNS = [
    r"\bkhong bi\b",
    r"\bkhong co\b",
    r"\bkhong con\b",
    r"\bkhong thay\b",
    r"\bchua bi\b",
    r"\bchua tung\b",
    r"\bhet bi\b",
    r"\bhet dau\b",
    r"\bkhong\b",
    r"\bchua\b",
    r"\bhet\b",
]


@dataclass
class ExtractionResult:
    """Extraction output containing recognized, negated, and unrecognized terms."""

    recognized_symptoms: list[str] = field(default_factory=list)  # Canonical IDs
    recognized_symptom_names: list[str] = field(default_factory=list)  # Display names
    unrecognized_terms: list[str] = field(default_factory=list)
    negated_symptoms: list[str] = field(default_factory=list)


class SymptomExtractor:
    """Extracts clinical symptoms from Vietnamese text."""

    def __init__(
        self,
        kb_dir: Path | None = None,
        fuzzy_threshold: int = settings.FUZZY_THRESHOLD,
    ) -> None:
        self.fuzzy_threshold = fuzzy_threshold
        self.symptom_dict: dict[str, str] = {}  # phrase -> symptom_id
        self.symptom_names: dict[str, str] = {}  # symptom_id -> name_vi
        self.sorted_phrases: list[tuple[str, str, int]] = []  # (phrase, symptom_id, length)

        if kb_dir is not None:
            self.load_dictionary(kb_dir)
        elif (settings.KB_DIR / "symptoms.csv").exists():
            self.load_dictionary(settings.KB_DIR)

    def load_dictionary(self, kb_dir: Path) -> None:
        """Load symptoms and aliases from KB CSV files."""
        sym_file = kb_dir / "symptoms.csv"
        if not sym_file.exists():
            logger.warning(f"Symptoms file {sym_file} does not exist.")
            return

        with open(sym_file, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                s_id = row["id"].strip()
                name_vi = row.get("name_vi", s_id).strip()
                self.symptom_names[s_id] = name_vi

                # Index canonical name and aliases
                aliases = [name_vi, row.get("name_en", "")]
                raw_aliases = row.get("aliases", "")
                if raw_aliases:
                    aliases.extend(raw_aliases.split(";"))

                for a in aliases:
                    cleaned = a.strip().lower()
                    if not cleaned:
                        continue
                    # Accented version
                    self.symptom_dict[cleaned] = s_id
                    # Unaccented version
                    unaccented = strip_accents(cleaned)
                    self.symptom_dict[unaccented] = s_id

        # Sort phrases by descending token count / length for longest-match
        phrases = []
        for phrase, s_id in self.symptom_dict.items():
            phrases.append((phrase, s_id, len(phrase.split())))
        # Sort primarily by token count descending, secondarily by char length descending
        phrases.sort(key=lambda x: (x[2], len(x[0])), reverse=True)
        self.sorted_phrases = phrases
        self.compiled_phrases = [
            (re.compile(r"(?:\b|^)" + re.escape(p) + r"(?:\b|$)"), p, s_id, length)
            for p, s_id, length in phrases
        ]
        logger.info(
            f"Loaded {len(self.symptom_names)} symptoms with {len(self.symptom_dict)} phrase aliases."
        )

    def is_negated(self, clause_text: str, match_start_idx: int) -> bool:
        """Check if negation term precedes the matched symptom within the clause."""
        prefix_text = clause_text[:match_start_idx].strip()
        if not prefix_text:
            return False

        # Convert to unaccented for matching negation patterns
        prefix_unaccented = strip_accents(prefix_text)
        for pattern in NEGATION_PATTERNS:
            if re.search(pattern, prefix_unaccented):
                return True
        return False

    def extract(self, text: str) -> ExtractionResult:
        """Extract symptoms from free-form Vietnamese clinical description."""
        norm: NormalizedText = normalize_text(text)
        if not norm.accented:
            return ExtractionResult()

        recognized: dict[str, str] = {}  # symptom_id -> display_name
        negated: set[str] = set()
        unrecognized: list[str] = []

        # Process each clause independently to preserve negation scopes
        for clause in norm.clauses:
            clause_cleaned = clause.strip()
            if not clause_cleaned:
                continue

            clause_unaccented = strip_accents(clause_cleaned)
            matched_in_clause = False

            # 1. Exact / Word Boundary Longest Match
            for pattern, phrase, s_id, _ in self.compiled_phrases:
                m = pattern.search(clause_cleaned)
                if not m:
                    m = pattern.search(clause_unaccented)

                if m:
                    matched_in_clause = True
                    match_pos = m.start()
                    display_name = self.symptom_names.get(s_id, phrase)

                    # Check for negation
                    if self.is_negated(clause_cleaned, match_pos):
                        negated.add(display_name)
                    else:
                        recognized[s_id] = display_name
                    # Once a major symptom in this clause is identified, continue scanning for others
                    break

            # 2. Fuzzy match fallback if no exact match found in clause
            if not matched_in_clause and len(clause_unaccented.split()) <= 6:
                best_score = 0.0
                best_s_id = None
                best_phrase = None

                for phrase, s_id, _ in self.sorted_phrases:
                    # Score against clause
                    score = fuzz.ratio(clause_unaccented, phrase)
                    if score > best_score:
                        best_score = score
                        best_s_id = s_id
                        best_phrase = phrase

                if best_score >= self.fuzzy_threshold and best_s_id:
                    matched_in_clause = True
                    display_name = self.symptom_names.get(best_s_id, best_phrase or clause_cleaned)
                    # Check negation at start of clause
                    if self.is_negated(clause_cleaned, len(clause_cleaned)):
                        negated.add(display_name)
                    else:
                        recognized[best_s_id] = display_name

            # 3. If clause contained substantive words but matched nothing
            if not matched_in_clause:
                # Filter out pure clinical stopwords/filler words
                filler_words = {
                    "benh nhan",
                    "kham",
                    "than phien",
                    "ngay thu",
                    "khoang",
                    "thay",
                    "bi",
                }
                clause_words = [w for w in clause_unaccented.split() if w not in filler_words]
                if len(clause_words) >= 2:
                    unrecognized.append(clause_cleaned)

        return ExtractionResult(
            recognized_symptoms=list(recognized.keys()),
            recognized_symptom_names=list(recognized.values()),
            unrecognized_terms=unrecognized,
            negated_symptoms=sorted(negated),
        )
