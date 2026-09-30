"""Drug recommendation service facade.

Coordinates NLP extraction, ML prediction, safety red flags, and medicine ranking.
"""

import logging
from typing import Any

from drug_recommendation.config import settings
from drug_recommendation.knowledge.kb_loader import kb_loader
from drug_recommendation.knowledge.medicine_ranker import medicine_ranker
from drug_recommendation.knowledge.safety import MANDATORY_DISCLAIMER, safety_checker
from drug_recommendation.model.predictor import DiseasePredictor
from drug_recommendation.nlp.symptom_extractor import SymptomExtractor
from drug_recommendation.schemas import (
    DiseaseItem,
    DiseasePredictionData,
    DiseasePredictionRequest,
)

logger = logging.getLogger("ai_service.drug_service")


class DrugService:
    """Facade for disease suggestion and medicine ranking."""

    def __init__(self) -> None:
        self.model_loaded: bool = False
        self.model_version: str | None = None
        self.extractor: SymptomExtractor | None = None
        self.predictor: DiseasePredictor | None = None
        self.kb_loader = kb_loader
        self.safety = safety_checker
        self.ranker = medicine_ranker

    def initialize(
        self,
        model_path: Any = None,
        metadata_path: Any = None,
        kb_dir: Any = None,
    ) -> bool:
        """Attempt to load artifacts and knowledge base."""
        m_path = model_path or settings.MODEL_PATH
        meta_path = metadata_path or settings.METADATA_PATH
        k_dir = kb_dir or settings.KB_DIR

        if not m_path.exists() or not meta_path.exists():
            logger.info("Model artifacts not found. Service running without active model.")
            self.model_loaded = False
            self.model_version = None
            return False

        try:
            # 1. Load Knowledge Base
            self.kb_loader.kb_dir = k_dir
            self.kb_loader.load()

            # 2. Initialize Symptom Extractor
            self.extractor = SymptomExtractor(
                kb_dir=k_dir, fuzzy_threshold=settings.FUZZY_THRESHOLD
            )

            # 3. Load ML Disease Predictor
            self.predictor = DiseasePredictor()
            self.predictor.load(
                model_path=m_path,
                metadata_path=meta_path,
                kb_dir=k_dir,
            )

            self.model_version = self.predictor.model_version
            self.model_loaded = True
            logger.info(
                f"Successfully initialized DrugService with model version {self.model_version}."
            )
            return True
        except Exception as e:
            logger.exception(f"Failed to initialize DrugService: {e}")
            self.model_loaded = False
            self.model_version = None
            return False

    async def predict(self, request: DiseasePredictionRequest) -> DiseasePredictionData:
        """Execute clinical prediction and medicine ranking pipeline."""
        if not self.model_loaded or self.predictor is None or self.extractor is None:
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
                modelVersion=self.model_version or "unknown",
            )

        # 4. Predict disease candidates
        candidates = self.predictor.predict(
            symptom_ids=recognized_ids,
            symptom_name_map=self.extractor.symptom_names,
            top_k=request.topK or 3,
        )

        # 5. Clinical Fallback Rule 2: Low confidence (< 30%)
        top_confidence = candidates[0]["probability"] if candidates else 0
        if top_confidence < 30:
            warnings.append(
                f"Độ tin cậy của mô hình thấp ({top_confidence}% < 30%). "
                "Hệ thống không đưa ra chẩn đoán phỏng đoán; "
                "vui lòng kiểm tra lại triệu chứng hoặc thăm khám lâm sàng trực tiếp."
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
                modelVersion=self.model_version or "unknown",
            )

        # 6. Assemble disease items
        disease_items = [
            DiseaseItem(
                name=c["name"],
                probability=c["probability"],
                description=c.get("description", ""),
                specialty=c["specialty"],
                matchedSymptoms=c.get("matchedSymptoms", []),
            )
            for c in candidates
        ]

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
            recognizedSymptoms=recognized_names,
            unrecognizedTerms=unrecognized,
            redFlags=red_flags,
            warnings=warnings,
            disclaimer=MANDATORY_DISCLAIMER,
            modelVersion=self.model_version or "unknown",
        )


drug_service = DrugService()
