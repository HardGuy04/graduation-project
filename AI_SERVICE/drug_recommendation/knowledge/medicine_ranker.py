"""Medicine ranking and clinical contraindication checking module.

Ranks medications strictly from the verified Knowledge Base using composite scores:
score(m) = sum(P(d) * w(d, m))
Prioritizes doctor's confirmed diagnosis over model suggestions.
Detects patient allergy conflicts without dropping options to ensure clinical transparency.
"""

import logging
from typing import Any

import rapidfuzz.fuzz as fuzz

from drug_recommendation.knowledge.kb_loader import kb_loader
from drug_recommendation.nlp.normalizer import strip_accents
from drug_recommendation.schemas import MedicineItem, PatientInfo

logger = logging.getLogger("medicine_ranker")


class MedicineRanker:
    """Ranks medicines based on candidate disease probabilities and patient safety profiles."""

    def __init__(self) -> None:
        pass

    def match_doctor_diagnosis(self, diagnosis_text: str) -> dict[str, Any] | None:
        """Fuzzy match doctor's entered diagnosis string against KB diseases."""
        if not diagnosis_text or not diagnosis_text.strip():
            return None

        clean_input = strip_accents(diagnosis_text.strip().lower())
        best_match = None
        best_score = 0.0

        for item in kb_loader.diseases_by_id.values():
            # Check name_vi
            vi_unaccented = strip_accents(item["name_vi"].lower())
            score_vi = fuzz.token_set_ratio(clean_input, vi_unaccented)

            # Check name_en
            en_unaccented = strip_accents(item["name_en"].lower())
            score_en = fuzz.token_set_ratio(clean_input, en_unaccented)

            max_score = max(score_vi, score_en)
            if max_score > best_score:
                best_score = max_score
                best_match = item

        # Accept match if similarity is sufficiently high (>= 80)
        if best_score >= 80.0 and best_match:
            logger.info(
                f"Doctor diagnosis '{diagnosis_text}' matched KB disease '{best_match['name_vi']}' "
                f"with score {best_score:.1f}"
            )
            return best_match
        return None

    def check_allergy_conflict(
        self, patient: PatientInfo | None, contraindications: list[str]
    ) -> list[str]:
        """Check if patient allergies conflict with medicine contraindications."""
        if not patient or not patient.allergies or not contraindications:
            return []

        warnings: list[str] = []
        for allergy in patient.allergies:
            clean_allergy = strip_accents(allergy.strip().lower())
            for contra in contraindications:
                clean_contra = strip_accents(contra.strip().lower())
                # Substring or fuzzy token match
                if clean_allergy in clean_contra or clean_contra in clean_allergy:
                    warnings.append(
                        f"CẢNH BÁO DỊ ỨNG: Bệnh nhân có tiền sử dị ứng với '{allergy}', "
                        f"thuốc có nguy cơ chống chỉ định hoặc dị ứng chéo."
                    )
                    break
                elif fuzz.ratio(clean_allergy, clean_contra) >= 85:
                    warnings.append(
                        f"CẢNH BÁO DỊ ỨNG: Bệnh nhân có tiền sử dị ứng với '{allergy}', "
                        f"thuốc có nguy cơ chống chỉ định hoặc dị ứng chéo."
                    )
                    break

        return warnings

    def rank_medicines(
        self,
        candidate_diseases: list[dict[str, Any]],
        diagnosis: str = "",
        patient: PatientInfo | None = None,
        top_k: int = 5,
    ) -> list[MedicineItem]:
        """Compute composite medicine recommendations."""
        if not kb_loader.is_loaded:
            logger.warning("KB loader is not loaded. Cannot rank medicines.")
            return []

        # 1. Check if doctor provided an explicit diagnosis
        doctor_disease = self.match_doctor_diagnosis(diagnosis)

        # 2. Build weighted disease distribution
        # disease_id -> probability weight (0.0 - 1.0)
        disease_weights: dict[str, float] = {}
        disease_display_names: dict[str, str] = {}

        if doctor_disease:
            # Doctor confirmed diagnosis overrides model with weight 1.0
            doc_id = doctor_disease["id"]
            disease_weights[doc_id] = 1.0
            disease_display_names[doc_id] = doctor_disease["name_vi"]

        for cand in candidate_diseases:
            # Map raw_name or name to disease_id
            raw_name = cand.get("raw_name", "")
            prob = cand.get("probability", 0) / 100.0

            # Find matching disease_id
            matched_id = None
            for d_id, item in kb_loader.diseases_by_id.items():
                if item["name_en"].lower() == raw_name.lower() or item["id"] == raw_name:
                    matched_id = d_id
                    break

            if matched_id:
                # If doctor diagnosis is already present, model weights are additive but scaled down
                scale = 0.5 if doctor_disease else 1.0
                curr = disease_weights.get(matched_id, 0.0)
                disease_weights[matched_id] = max(curr, prob * scale)
                disease_display_names[matched_id] = cand.get("name", matched_id)

        if not disease_weights:
            return []

        # 3. Aggregate scores for each candidate medicine
        # medicine_id -> {score: float, for_diseases: set[str]}
        med_scores: dict[str, float] = {}
        med_for_diseases: dict[str, set[str]] = {}

        for d_id, p_d in disease_weights.items():
            associations = kb_loader.disease_medicines.get(d_id, [])
            d_name = disease_display_names.get(d_id, d_id)

            for assoc in associations:
                m_id = assoc["medicine_id"]
                w_dm = assoc["weight"]
                contribution = p_d * w_dm

                med_scores[m_id] = med_scores.get(m_id, 0.0) + contribution
                if m_id not in med_for_diseases:
                    med_for_diseases[m_id] = set()
                med_for_diseases[m_id].add(d_name)

        # 4. Rank medicines by score descending
        sorted_med_ids = sorted(med_scores.keys(), key=lambda m: med_scores[m], reverse=True)

        results: list[MedicineItem] = []
        for m_id in sorted_med_ids[:top_k]:
            med_info = kb_loader.medicines_by_id.get(m_id)
            if not med_info:
                continue

            raw_score = med_scores[m_id]
            # Convert composite score into integer percentage 0-100
            score_percent = min(100, max(1, int(round(raw_score * 100))))

            # Check patient allergy warnings
            warnings = self.check_allergy_conflict(patient, med_info["contraindications"])

            results.append(
                MedicineItem(
                    name=med_info["name"],
                    probability=score_percent,
                    usage=med_info["usage"],
                    forDiseases=sorted(med_for_diseases.get(m_id, set())),
                    prescriptionRequired=med_info["prescription_required"],
                    warnings=warnings,
                )
            )

        return results


medicine_ranker = MedicineRanker()
