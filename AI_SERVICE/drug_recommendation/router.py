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

router = APIRouter(prefix="/internal", tags=["Clinical Decision Support (CDSS)"])


def verify_internal_key(x_internal_key: str | None) -> bool:
    """Validate internal API key using constant-time comparison."""
    if not x_internal_key or not settings.AI_INTERNAL_KEY:
        return False
    return secrets.compare_digest(x_internal_key, settings.AI_INTERNAL_KEY)


@router.post(
    "/predict-disease",
    response_model=DiseasePredictionResponse,
    summary="Chẩn đoán bệnh lý, đề xuất phác đồ thuốc & tư vấn lối sống",
    description="""
API hạt nhân phân tích y khoa hỗ trợ bác sĩ và bệnh nhân:
1. **Trích xuất triệu chứng NLP**: Nhận diện triệu chứng tiếng Việt tự nhiên (hỗ trợ cả có dấu và không dấu), tự động loại trừ triệu chứng phủ định (*"không sốt", "chưa từng nôn"*).
2. **Cảnh báo dấu hiệu nguy hiểm (Red Flags)**: Phát hiện và cảnh báo sớm các triệu chứng báo động đỏ cần cấp cứu.
3. **Mô hình học máy phân loại bệnh**: Dự đoán xác suất và xếp hạng các bệnh lý phù hợp nhất.
4. **Khuyến nghị thuốc & An toàn**: Đề xuất thuốc theo phác đồ, kèm liều lượng (`dosage`), hướng dẫn (`instruction`), tự động rà soát dị ứng và chống chỉ định.
5. **Tư vấn lối sống toàn diện**: Cung cấp chế độ dinh dưỡng (`diets`), phòng ngừa (`precautions`) và vận động (`workouts`).
""",
    responses={
        401: {"model": ErrorResponse, "description": "Sai hoặc thiếu Header X-Internal-Key"},
        422: {"model": ErrorResponse, "description": "Dữ liệu đầu vào không hợp lệ"},
        503: {"model": ErrorResponse, "description": "Mô hình AI chưa nạp hoặc đang khởi động"},
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
    except Exception:
        logger.exception("Unexpected error during disease prediction")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "Lỗi nội bộ khi xử lý gợi ý bệnh",
                "error": "InternalServerError",
            },
        )
