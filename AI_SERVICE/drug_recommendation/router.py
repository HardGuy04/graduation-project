"""Internal API router for disease & drug recommendation."""

import logging
import secrets
import time

from fastapi import APIRouter, Header, Query, Request, status
from fastapi.responses import JSONResponse

from drug_recommendation.config import settings
from drug_recommendation.drug_service import drug_service
from drug_recommendation.schemas import (
    DDICheckRequest,
    DDICheckResponse,
    DiseaseMedicineSearchResponse,
    DiseasePredictionRequest,
    DiseasePredictionResponse,
    ErrorResponse,
    MedicineSearchResponse,
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


@router.get(
    "/medicines-by-disease",
    response_model=DiseaseMedicineSearchResponse,
    summary="Tra cứu tất cả các loại thuốc điều trị theo tên bệnh lý riêng biệt",
    description="""
API tra cứu danh mục thuốc điều trị cho từng bệnh lý cụ thể:
- Tìm kiếm linh hoạt theo: Tên bệnh tiếng Việt (có dấu hoặc không dấu), Tên tiếng Anh, hoặc Mã bệnh lý (ID).
- Tự động gợi ý và xếp hạng thuốc theo: Phác đồ hàng 1 (First-line) ưu tiên trước, phác đồ hàng 2 (Second-line) sau.
- Cung cấp đầy đủ: Hoạt chất, nhóm dược lý, chỉ định, liều dùng (`dosage`), hướng dẫn an toàn (`instruction`), cảnh báo chống chỉ định và phân loại kê đơn (`Rx` vs `OTC`).
- Đi kèm thông tin bệnh lý toàn diện: Chuyên khoa, mô tả tổng quan, triệu chứng đặc trưng và chế độ dinh dưỡng, lối sống phục hồi.
""",
    responses={
        401: {"model": ErrorResponse, "description": "Sai hoặc thiếu Header X-Internal-Key hoặc api_key"},
        503: {"model": ErrorResponse, "description": "Hệ thống AI chưa sẵn sàng"},
    },
)
async def get_medicines_by_disease(
    disease: str = Query("", description="Tên bệnh lý cần tra cứu (ví dụ: 'Sốt xuất huyết', 'dengue', 'DENGUE_FEVER')"),
    x_internal_key: str | None = Header(None, alias="X-Internal-Key"),
    api_key: str | None = Query(None, description="API key nội bộ (tùy chọn thay thế cho Header)"),
) -> JSONResponse:
    key_to_check = x_internal_key or api_key
    if not verify_internal_key(key_to_check):
        logger.warning("Unauthorized access to medicines-by-disease: invalid or missing key")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "success": False,
                "message": "Sai hoặc thiếu API key nội bộ",
                "error": "Unauthorized",
            },
        )

    search_result = drug_service.search_medicines_by_disease(disease)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "success": True,
            "data": search_result.model_dump(),
        },
    )


@router.get(
    "/diseases",
    summary="Danh sách tất cả các bệnh lý trong cơ sở tri thức (CDSS)",
    description="Trả về danh sách toàn bộ 41 bệnh lý chuẩn hóa kèm chuyên khoa phục vụ tính năng autocomplete và gợi ý tìm kiếm nhanh.",
    responses={
        401: {"model": ErrorResponse, "description": "Sai hoặc thiếu Header X-Internal-Key hoặc api_key"},
    },
)
async def list_all_diseases(
    x_internal_key: str | None = Header(None, alias="X-Internal-Key"),
    api_key: str | None = Query(None, description="API key nội bộ"),
) -> JSONResponse:
    key_to_check = x_internal_key or api_key
    if not verify_internal_key(key_to_check):
        logger.warning("Unauthorized access to /diseases: invalid or missing key")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "success": False,
                "message": "Sai hoặc thiếu API key nội bộ",
                "error": "Unauthorized",
            },
        )

    diseases = drug_service.get_all_diseases()
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "success": True,
            "data": diseases,
        },
    )


@router.get(
    "/diseases-by-medicine",
    response_model=MedicineSearchResponse,
    summary="Tra cứu ngược: Tìm các bệnh lý được chỉ định điều trị theo tên thuốc",
    description="""
API tra cứu ngược danh mục bệnh lý được chỉ định cho một loại thuốc hoặc hoạt chất cụ thể:
- Tìm kiếm theo: Tên thương mại thuốc, Hoạt chất chính (Active Ingredient), hoặc Mã thuốc (ID).
- Tự động lọc và trả về: Danh mục các bệnh lý có chỉ định dùng thuốc này, kèm chuyên khoa, phác đồ điều trị (Hàng 1 / Hàng 2).
- Cung cấp đầy đủ thông tin thuốc: Hoạt chất, nhóm dược lý, phân loại Rx/OTC, chỉ định cơ chế, liều dùng, hướng dẫn dùng và chống chỉ định.
""",
    responses={
        401: {"model": ErrorResponse, "description": "Sai hoặc thiếu Header X-Internal-Key hoặc api_key"},
    },
)
async def get_diseases_by_medicine(
    medicine: str = Query("", description="Tên thuốc hoặc hoạt chất cần tra cứu (ví dụ: 'Fluconazole', 'Paracetamol')"),
    x_internal_key: str | None = Header(None, alias="X-Internal-Key"),
    api_key: str | None = Query(None, description="API key nội bộ"),
) -> JSONResponse:
    key_to_check = x_internal_key or api_key
    if not verify_internal_key(key_to_check):
        logger.warning("Unauthorized access to /diseases-by-medicine: invalid or missing key")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "success": False,
                "message": "Sai hoặc thiếu API key nội bộ",
                "error": "Unauthorized",
            },
        )

    search_result = drug_service.search_diseases_by_medicine(medicine)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "success": True,
            "data": search_result.model_dump(),
        },
    )


@router.get(
    "/medicines",
    summary="Danh sách tất cả các loại thuốc trong cơ sở tri thức (CDSS)",
    description="Trả về danh sách toàn bộ các loại thuốc chuẩn hóa phục vụ tính năng autocomplete và gợi ý tra cứu ngược.",
    responses={
        401: {"model": ErrorResponse, "description": "Sai hoặc thiếu Header X-Internal-Key hoặc api_key"},
    },
)
async def list_all_medicines(
    x_internal_key: str | None = Header(None, alias="X-Internal-Key"),
    api_key: str | None = Query(None, description="API key nội bộ"),
) -> JSONResponse:
    key_to_check = x_internal_key or api_key
    if not verify_internal_key(key_to_check):
        logger.warning("Unauthorized access to /medicines: invalid or missing key")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "success": False,
                "message": "Sai hoặc thiếu API key nội bộ",
                "error": "Unauthorized",
            },
        )

    medicines = drug_service.get_all_medicines()
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "success": True,
            "data": medicines,
        },
    )


@router.post(
    "/check-ddi",
    response_model=DDICheckResponse,
    summary="Kiểm tra tương tác thuốc (Drug-Drug Interaction - DDI)",
    description="""
API kiểm tra an toàn dược lý và cảnh báo tương tác thuốc khi kê đơn đồng thời nhiều loại thuốc:
- Phân tích tất cả các cặp thuốc kết hợp giữa các thuốc được chọn.
- Phân cấp mức độ nguy cơ lâm sàng: Chống chỉ định tuyệt đối, Mức độ nặng, Thận trọng mức độ vừa, Chú ý mức độ nhẹ.
- Cung cấp cơ chế dược lý (dược động học / dược lực học), hậu quả lâm sàng và khuyến nghị xử trí cho bác sĩ.
""",
    responses={
        401: {"model": ErrorResponse, "description": "Sai hoặc thiếu Header X-Internal-Key hoặc api_key"},
    },
)
async def check_ddi_post(
    request: DDICheckRequest,
    x_internal_key: str | None = Header(None, alias="X-Internal-Key"),
    api_key: str | None = Query(None, description="API key nội bộ"),
) -> JSONResponse:
    key_to_check = x_internal_key or api_key
    if not verify_internal_key(key_to_check):
        logger.warning("Unauthorized access to /check-ddi: invalid or missing key")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "success": False,
                "message": "Sai hoặc thiếu API key nội bộ",
                "error": "Unauthorized",
            },
        )

    result = drug_service.check_drug_interactions(request.drugs)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "success": True,
            "data": result.model_dump(),
        },
    )


@router.get(
    "/check-ddi",
    response_model=DDICheckResponse,
    summary="Kiểm tra tương tác thuốc qua GET query string",
    description="Hỗ trợ tra cứu nhanh tương tác thuốc bằng danh sách phân cách bởi dấu phẩy: `?drugs=Aspirin,Ibuprofen,Blood thinners`",
    responses={
        401: {"model": ErrorResponse, "description": "Sai hoặc thiếu Header X-Internal-Key hoặc api_key"},
    },
)
async def check_ddi_get(
    drugs: str = Query(..., description="Danh sách tên thuốc hoặc mã thuốc cách nhau bằng dấu phẩy"),
    x_internal_key: str | None = Header(None, alias="X-Internal-Key"),
    api_key: str | None = Query(None, description="API key nội bộ"),
) -> JSONResponse:
    key_to_check = x_internal_key or api_key
    if not verify_internal_key(key_to_check):
        logger.warning("Unauthorized access to /check-ddi: invalid or missing key")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "success": False,
                "message": "Sai hoặc thiếu API key nội bộ",
                "error": "Unauthorized",
            },
        )

    drug_list = [d.strip() for d in drugs.split(",") if d.strip()]
    result = drug_service.check_drug_interactions(drug_list)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "success": True,
            "data": result.model_dump(),
        },
    )

