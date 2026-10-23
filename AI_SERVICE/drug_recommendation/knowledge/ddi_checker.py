"""Drug-Drug Interaction (DDI) clinical safety checking module.

Evaluates pairs of medications against a validated pharmacological interaction database.
Provides severity grading, pharmacological mechanisms, clinical risks, and actionable recommendations.
"""

from __future__ import annotations

import itertools
import json
import logging
from pathlib import Path
from typing import Any

from drug_recommendation.config import settings
from drug_recommendation.nlp.normalizer import strip_accents

logger = logging.getLogger("ddi_checker")

SEVERITY_ORDER = {
    "contraindicated": 1,
    "major": 2,
    "moderate": 3,
    "minor": 4,
}

SEVERITY_LABELS = {
    "contraindicated": "Chống chỉ định tuyệt đối",
    "major": "Cảnh báo mức độ nặng",
    "moderate": "Thận trọng mức độ vừa",
    "minor": "Chú ý mức độ nhẹ",
}


class DDIChecker:
    """Clinical Drug-Drug Interaction Checker engine."""

    def __init__(self, json_path: Path | None = None) -> None:
        self.json_path = json_path or (settings.KB_DIR / "drug_interactions.json")
        self.rules: list[dict[str, Any]] = []
        self._is_loaded = False

    def load(self) -> None:
        """Load interaction rules from JSON file."""
        if not self.json_path.exists():
            logger.warning(f"DDI rules file not found at {self.json_path}. DDI checking will be inactive.")
            self.rules = []
            self._is_loaded = True
            return

        try:
            with open(self.json_path, encoding="utf-8") as f:
                self.rules = json.load(f)
            self._is_loaded = True
            logger.info(f"Successfully loaded {len(self.rules)} Drug-Drug Interaction rules.")
        except Exception as e:
            logger.error(f"Failed to load DDI rules from {self.json_path}: {e}")
            self.rules = []
            self._is_loaded = True

    def _normalize_token(self, text: str) -> str:
        """Strip accents, lowercase, and remove non-alphanumeric noise."""
        clean = strip_accents(text.lower().strip())
        return " ".join(clean.split())

    def _matches_pattern(self, query_norm: str, pattern_list: list[str]) -> bool:
        """Check if query_norm matches any pattern in pattern_list."""
        for pat in pattern_list:
            pat_norm = self._normalize_token(pat)
            if not pat_norm:
                continue
            if query_norm == pat_norm:
                return True
            # Substring match if token length is significant
            if len(pat_norm) >= 4 and (pat_norm in query_norm or query_norm in pat_norm):
                return True
        return False

    def check_interactions(self, drugs: list[str]) -> dict[str, Any]:
        """Check all pair combinations in a given list of medicines.

        Args:
            drugs: List of medicine names or IDs (minimum 2 items required for pairs).

        Returns:
            Dictionary containing detected interactions, severity counts, and clinical summary.
        """
        if not self._is_loaded:
            self.load()

        # Clean and deduplicate drugs
        cleaned_drugs: list[str] = []
        seen_drugs = set()
        for d in drugs:
            s = d.strip()
            if s and s.lower() not in seen_drugs:
                seen_drugs.add(s.lower())
                cleaned_drugs.append(s)

        if len(cleaned_drugs) < 2:
            return {
                "drugsAnalyzed": cleaned_drugs,
                "totalInteractions": 0,
                "hasCriticalConflict": False,
                "severitySummary": {
                    "contraindicated": 0,
                    "major": 0,
                    "moderate": 0,
                    "minor": 0,
                    "total": 0,
                },
                "interactions": [],
                "message": "Cần tối thiểu 2 loại thuốc để thực hiện kiểm tra tương tác thuốc (DDI).",
                "disclaimer": "Kết quả chỉ mang tính tham khảo y khoa, không thay thế chẩn đoán và quyết định kê đơn của bác sĩ điều trị.",
            }

        detected_interactions: list[dict[str, Any]] = []
        seen_rule_pairs: set[str] = set()

        # Test all unique pairs (d1, d2)
        for d1, d2 in itertools.combinations(cleaned_drugs, 2):
            norm1 = self._normalize_token(d1)
            norm2 = self._normalize_token(d2)

            for rule in self.rules:
                rule_id = rule["id"]
                pair_key = f"{rule_id}:{min(norm1, norm2)}-{max(norm1, norm2)}"
                if pair_key in seen_rule_pairs:
                    continue

                d1_patterns = rule.get("drug1_ids", [])
                d2_patterns = rule.get("drug2_ids", [])

                # Check forward: d1 matches drug1 and d2 matches drug2
                forward = self._matches_pattern(norm1, d1_patterns) and self._matches_pattern(norm2, d2_patterns)
                # Check reverse: d2 matches drug1 and d1 matches drug2
                backward = self._matches_pattern(norm2, d1_patterns) and self._matches_pattern(norm1, d2_patterns)

                if forward or backward:
                    seen_rule_pairs.add(pair_key)
                    severity = rule.get("severity", "moderate").lower()
                    detected_interactions.append(
                        {
                            "id": rule_id,
                            "drug1": d1 if forward else d2,
                            "drug2": d2 if forward else d1,
                            "matchedRuleDrug1": rule.get("drug1_name", ""),
                            "matchedRuleDrug2": rule.get("drug2_name", ""),
                            "severity": severity,
                            "severityLabel": rule.get("severity_label") or SEVERITY_LABELS.get(severity, "Thận trọng"),
                            "mechanism": rule.get("mechanism", ""),
                            "clinicalEffect": rule.get("clinical_effect", ""),
                            "recommendation": rule.get("recommendation", ""),
                        }
                    )

        # Sort: Most severe first (Contraindicated -> Major -> Moderate -> Minor)
        detected_interactions.sort(key=lambda x: SEVERITY_ORDER.get(x["severity"], 99))

        severity_summary = {
            "contraindicated": sum(1 for i in detected_interactions if i["severity"] == "contraindicated"),
            "major": sum(1 for i in detected_interactions if i["severity"] == "major"),
            "moderate": sum(1 for i in detected_interactions if i["severity"] == "moderate"),
            "minor": sum(1 for i in detected_interactions if i["severity"] == "minor"),
            "total": len(detected_interactions),
        }

        has_critical = (severity_summary["contraindicated"] > 0) or (severity_summary["major"] > 0)

        if len(detected_interactions) == 0:
            msg = f"Đã kiểm tra an toàn {len(cleaned_drugs)} thuốc: Không phát hiện tương tác đối kháng nguy hiểm trong cơ sở dữ liệu."
        else:
            msg = f"Cảnh báo: Phát hiện {len(detected_interactions)} tương tác thuốc tiềm ẩn giữa {len(cleaned_drugs)} thuốc được chọn."

        return {
            "drugsAnalyzed": cleaned_drugs,
            "totalInteractions": len(detected_interactions),
            "hasCriticalConflict": has_critical,
            "severitySummary": severity_summary,
            "interactions": detected_interactions,
            "message": msg,
            "disclaimer": "Kết quả chỉ mang tính tham khảo y khoa, không thay thế chẩn đoán và quyết định kê đơn của bác sĩ điều trị.",
        }


ddi_checker = DDIChecker()
