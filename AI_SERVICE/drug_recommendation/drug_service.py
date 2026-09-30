"""Drug recommendation service facade.

Coordinates NLP extraction, ML prediction, safety red flags, and medicine ranking.
"""

import logging

from drug_recommendation.config import settings
from drug_recommendation.schemas import (
    DiseasePredictionData,
    DiseasePredictionRequest,
)

logger = logging.getLogger("ai_service.drug_service")


class DrugService:
    """Facade for disease suggestion and medicine ranking."""

    def __init__(self) -> None:
        self.model_loaded: bool = False
        self.model_version: str | None = None
        self._predictor: object | None = None
        self._kb_loader: object | None = None
        self._safety: object | None = None
        self._ranker: object | None = None

    def initialize(self) -> bool:
        """Attempt to load artifacts and knowledge base."""
        if not settings.MODEL_PATH.exists() or not settings.METADATA_PATH.exists():
            logger.info("Model artifacts not found. Service running without active model.")
            self.model_loaded = False
            self.model_version = None
            return False

        try:
            # Model loading logic will be fully wired in Phase 3/4
            import json

            with open(settings.METADATA_PATH, encoding="utf-8") as f:
                meta = json.load(f)
            self.model_version = meta.get("model_version", "unknown")
            self.model_loaded = True
            logger.info(f"Loaded model version {self.model_version}")
            return True
        except Exception as e:
            logger.error(f"Failed to load model artifacts: {e}")
            self.model_loaded = False
            self.model_version = None
            return False

    async def predict(self, request: DiseasePredictionRequest) -> DiseasePredictionData:
        """Execute prediction pipeline."""
        if not self.model_loaded:
            raise RuntimeError("Model is not loaded")

        # In Phase 0a stub:
        return DiseasePredictionData(
            diseases=[],
            medicines=[],
            recognizedSymptoms=[],
            unrecognizedTerms=[],
            redFlags=[],
            warnings=["Service initialized in bootstrap mode"],
            disclaimer="Kết quả chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ.",
            modelVersion=self.model_version or "bootstrap",
        )


drug_service = DrugService()
