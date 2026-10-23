"""Drug recommendation service facade.

Coordinates specialized sub-services (Diagnosis, Medicine Search, DDI)
under a unified, clean interface following the Facade Pattern.
"""

import logging
from typing import Any

from drug_recommendation.config import settings
from drug_recommendation.knowledge.ddi_checker import ddi_checker
from drug_recommendation.knowledge.kb_loader import kb_loader
from drug_recommendation.knowledge.medicine_ranker import medicine_ranker
from drug_recommendation.knowledge.safety import safety_checker
from drug_recommendation.model.predictor import DiseasePredictor
from drug_recommendation.nlp.symptom_extractor import SymptomExtractor
from drug_recommendation.schemas import (
    DDICheckData,
    DiseaseMedicineSearchData,
    DiseasePredictionData,
    DiseasePredictionRequest,
    MedicineSearchData,
)
from drug_recommendation.services.ddi_service import DDIService
from drug_recommendation.services.diagnosis_service import DiagnosisService
from drug_recommendation.services.medicine_search_service import MedicineSearchService

logger = logging.getLogger("ai_service.drug_service")


class DrugService:
    """Facade orchestrating diagnosis, prescription ranking, drug search, and DDI checks."""

    def __init__(self) -> None:
        self.model_loaded: bool = False
        self.model_version: str | None = None
        self.extractor: SymptomExtractor | None = None
        self.predictor: DiseasePredictor | None = None
        self.kb_loader = kb_loader
        self.safety = safety_checker
        self.ranker = medicine_ranker
        self.ddi_checker = ddi_checker

        # Sub-services
        self.diagnosis_service = DiagnosisService(
            extractor=self.extractor,
            predictor=self.predictor,
            safety=self.safety,
            ranker=self.ranker,
            kb_loader=self.kb_loader,
        )
        self.search_service = MedicineSearchService(
            kb_loader=self.kb_loader,
            ranker=self.ranker,
            extractor=self.extractor,
            predictor=self.predictor,
        )
        self.ddi_service = DDIService(ddi_checker=self.ddi_checker)

    def initialize(
        self,
        model_path: Any = None,
        metadata_path: Any = None,
        kb_dir: Any = None,
    ) -> bool:
        """Attempt to load artifacts and knowledge base, then configure sub-services."""
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

            # 4. Update sub-service references
            self.diagnosis_service.update_components(
                extractor=self.extractor, predictor=self.predictor
            )
            self.search_service.update_components(
                extractor=self.extractor, predictor=self.predictor
            )

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
        """Delegate diagnosis and treatment recommendation to DiagnosisService."""
        return await self.diagnosis_service.predict(
            request=request, model_version=self.model_version or "unknown"
        )

    def get_all_diseases(self) -> list[dict[str, Any]]:
        """Delegate disease listing to MedicineSearchService."""
        return self.search_service.get_all_diseases()

    def search_medicines_by_disease(self, query: str) -> DiseaseMedicineSearchData:
        """Delegate medicine lookup by disease to MedicineSearchService."""
        return self.search_service.search_medicines_by_disease(query=query)

    def get_all_medicines(self) -> list[dict[str, Any]]:
        """Delegate medicine listing to MedicineSearchService."""
        return self.search_service.get_all_medicines()

    def search_diseases_by_medicine(self, query: str) -> MedicineSearchData:
        """Delegate reverse disease lookup to MedicineSearchService."""
        return self.search_service.search_diseases_by_medicine(query=query)

    def check_drug_interactions(self, drugs: list[str]) -> DDICheckData:
        """Delegate drug-drug interaction check to DDIService."""
        return self.ddi_service.check_drug_interactions(drugs=drugs)


drug_service = DrugService()
