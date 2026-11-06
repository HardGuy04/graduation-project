"""Diagnosis and clinical prediction service.

Handles natural symptom extraction, safety red flag detection,
ML model disease prediction, and therapeutic medicine ranking.
"""

import logging

from drug_recommendation.knowledge.kb_loader import KBLoader
from drug_recommendation.knowledge.medicine_ranker import MedicineRanker
from drug_recommendation.knowledge.safety import MANDATORY_DISCLAIMER, SafetyChecker
from drug_recommendation.model.predictor import DiseasePredictor
from drug_recommendation.nlp.symptom_extractor import SymptomExtractor
from drug_recommendation.schemas import (
    DiseaseItem,
    DiseasePredictionData,
    DiseasePredictionRequest,
    LifestyleAdvice,
)

logger = logging.getLogger("ai_service.diagnosis_service")


class DiagnosisService:
    """Service responsible for clinical disease diagnosis and treatment recommendation."""

    def __init__(
        self,
        extractor: SymptomExtractor | None,
        predictor: DiseasePredictor | None,
        safety: SafetyChecker,
        ranker: MedicineRanker,
        kb_loader: KBLoader,
    ) -> None:
        self.extractor = extractor
        self.predictor = predictor
        self.safety = safety
        self.ranker = ranker
        self.kb_loader = kb_loader

    def update_components(
        self, extractor: SymptomExtractor | None, predictor: DiseasePredictor | None
    ) -> None:
        """Update runtime model predictor and symptom extractor."""
        self.extractor = extractor
        self.predictor = predictor

    async def predict(
        self, request: DiseasePredictionRequest, model_version: str = "unknown"
    ) -> DiseasePredictionData:
        """Execute clinical prediction and medicine ranking pipeline."""
        if self.predictor is None or self.extractor is None or not self.predictor.is_loaded:
            raise RuntimeError("Model is not loaded")

        # 1. Extract symptoms from input text
        extraction = self.extractor.extract(request.symptoms)
        recognized_ids = extraction.recognized_symptoms
        recognized_names = extraction.recognized_symptom_names
        unrecognized = extraction.unrecognized_terms
        negated = extraction.negated_symptoms

        # 2. Emergency red flag detection (runs independently of classifier)
        red_flags = self.safety.check_red_flags(request.symptoms, recognized_ids)

        warnings: list[str] = []
        if negated:
            warnings.append(f"Đã loại trừ triệu chứng phủ định: {', '.join(negated)}")

        has_doctor_diagnosis = bool(request.diagnosis and request.diagnosis.strip())

        # 3. Clinical Fallback Rule 1: Insufficient symptoms (< 2)
        if len(recognized_ids) < 2:
            warnings.append(
                "Thông tin triệu chứng chưa đủ để gợi ý bệnh chính xác "
                "(cần ít nhất 2 triệu chứng lâm sàng rõ ràng)."
            )
            medicines = []
            if has_doctor_diagnosis:
                medicines = self.ranker.rank_medicines(
                    candidate_diseases=[],
                    diagnosis=request.diagnosis or "",
                    patient=request.patient,
                )
                warnings.append("Danh sách thuốc được gợi ý dựa trên chẩn đoán của bác sĩ.")

            return DiseasePredictionData(
                diseases=[],
                medicines=medicines,
                recognizedSymptoms=recognized_names,
                unrecognizedTerms=unrecognized,
                redFlags=red_flags,
                warnings=warnings,
                disclaimer=MANDATORY_DISCLAIMER,
                modelVersion=model_version,
            )

        # 4. Predict disease candidates (guarantee at least 5 candidates if available)
        top_k = max(request.topK or 5, 5)
        candidates = self.predictor.predict(
            symptom_ids=recognized_ids,
            symptom_name_map=self.extractor.symptom_names,
            top_k=top_k,
        )

        # 5. Advisory warning if top confidence is low
        top_confidence = candidates[0]["probability"] if candidates else 0
        if top_confidence < 30 and candidates:
            warnings.append(
                f"Độ tin cậy của mô hình ở mức tham khảo ({top_confidence}%). "
                "Bác sĩ vui lòng đối chiếu thêm biểu hiện lâm sàng."
            )

        # 6. Assemble disease items with lifestyle guidance
        disease_items = []
        for c in candidates:
            ls = self.kb_loader.get_lifestyle_by_disease(c.get("raw_name", ""))
            if not ls["diets"] and not ls["precautions"]:
                ls = self.kb_loader.get_lifestyle_by_disease(c["name"])

            disease_items.append(
                DiseaseItem(
                    name=c["name"],
                    probability=c["probability"],
                    description=c.get("description", ""),
                    specialty=c["specialty"],
                    matchedSymptoms=c.get("matchedSymptoms", []),
                    allSymptoms=c.get("allSymptoms", []),
                    diets=ls["diets"],
                    precautions=ls["precautions"],
                    workouts=ls["workouts"],
                )
            )

        top_lifestyle = None
        if disease_items:
            top_dis = disease_items[0]
            top_lifestyle = LifestyleAdvice(
                disease=top_dis.name,
                diets=top_dis.diets,
                precautions=top_dis.precautions,
                workouts=top_dis.workouts,
            )

        # 7. Rank medicines based on candidate diseases and doctor diagnosis
        medicines = self.ranker.rank_medicines(
            candidate_diseases=candidates,
            diagnosis=request.diagnosis or "",
            patient=request.patient,
        )

        if has_doctor_diagnosis:
            doc_matched = self.ranker.match_doctor_diagnosis(request.diagnosis or "")
            if doc_matched:
                warnings.append(
                    f"Gợi ý thuốc được ưu tiên theo chẩn đoán của bác sĩ: '{doc_matched['name_vi']}'."
                )

        return DiseasePredictionData(
            diseases=disease_items,
            medicines=medicines,
            lifestyleAdvice=top_lifestyle,
            recognizedSymptoms=recognized_names,
            unrecognizedTerms=unrecognized,
            redFlags=red_flags,
            warnings=warnings,
            disclaimer=MANDATORY_DISCLAIMER,
            modelVersion=model_version,
        )
