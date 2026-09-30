"""Internal API router for disease & drug recommendation."""

import logging
import secrets
import time

from fastapi import APIRouter, Header, Request, status
from fastapi.responses import JSONResponse

from drug_recommendation.config import settings
from drug_recommendation.drug_service import drug_service
from drug_recommendation.schemas import (
    DiseasePredictionRequest,
    DiseasePredictionResponse,
    ErrorResponse,
)

logger = logging.getLogger("ai_service.router")

router = APIRouter(prefix="/internal", tags=["drug_recommendation"])


def verify_internal_key(x_internal_key: str | None) -> bool:
    """Validate internal API key using constant-time comparison."""
    if not x_internal_key or not settings.AI_INTERNAL_KEY:
        return False
    return secrets.compare_digest(x_internal_key, settings.AI_INTERNAL_KEY)


@router.post(
    "/predict-disease",
    response_model=DiseasePredictionResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid or missing internal key"},
        422: {"model": ErrorResponse, "description": "Validation error"},
        503: {"model": ErrorResponse, "description": "Model not loaded yet"},
    },
)
async def predict_disease(
    request: DiseasePredictionRequest,
    req: Request,
    x_internal_key: str | None = Header(None, alias="X-Internal-Key"),
) -> JSONResponse:
    """Predict suspect diseases and recommend medicines based on symptoms."""
    start_time = time.perf_counter()

    # 1. Authentication check
    if not verify_internal_key(x_internal_key):
        logger.warning("Unauthorized access attempt: invalid or missing X-Internal-Key")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "success": False,
                "message": "Sai hoặc thiếu API key nội bộ",
                "error": "Unauthorized",
            },
        )

    # 2. Check model readiness
    if not drug_service.model_loaded:
        logger.warning("Predict request rejected: model is not loaded")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "success": False,
                "message": "Hệ thống AI chưa sẵn sàng hoặc model chưa nạp",
                "error": "ServiceUnavailable",
            },
        )

    try:
        # 3. Execute prediction facade
        result_data = await drug_service.predict(request)

        duration_ms = (time.perf_counter() - start_time) * 1000.0
        # Privacy-conscious logging: NEVER log raw symptoms!
        logger.info(
            f"Prediction completed: length={len(request.symptoms)}, "
            f"recognized_count={len(result_data.recognizedSymptoms)}, "
            f"diseases_count={len(result_data.diseases)}, "
            f"latency={duration_ms:.2f}ms, model_version={result_data.modelVersion}"
        )

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "data": result_data.model_dump(),
            },
        )
    except Exception as e:
        logger.exception("Unexpected error during disease prediction")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "Lỗi nội bộ khi xử lý gợi ý bệnh",
                "error": str(type(e).__name__),
            },
        )
