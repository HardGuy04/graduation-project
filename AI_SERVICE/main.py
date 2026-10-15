"""Main FastAPI Application entry point for AI_SERVICE."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from chatbot.router import router as chatbot_router
from drug_recommendation.config import settings
from drug_recommendation.drug_service import drug_service
from drug_recommendation.router import router as drug_router
from drug_recommendation.schemas import HealthResponse

# Configure structured logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
)
logger = logging.getLogger("ai_service.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager to initialize models and KB once on startup."""
    logger.info("Initializing AI_SERVICE application lifespan...")
    drug_service.initialize()
    logger.info(
        f"AI_SERVICE started. Model loaded: {drug_service.model_loaded}, "
        f"Version: {drug_service.model_version}"
    )
    yield
    logger.info("AI_SERVICE shutting down...")


tags_metadata = [
    {
        "name": "Clinical Decision Support (CDSS)",
        "description": "Các API phục vụ chẩn đoán bệnh lâm sàng, khuyến nghị đơn thuốc an toàn và tư vấn lối sống phục hồi cho Bác sĩ & Bệnh nhân.",
    },
    {
        "name": "System & Health",
        "description": "Các endpoint kiểm tra trạng thái hoạt động của máy chủ và phiên bản mô hình máy học đã nạp.",
    },
    {
        "name": "Chatbot Service",
        "description": "Phân hệ tiếp nhận hội thoại và tương tác trực tiếp với bệnh nhân.",
    },
]

app = FastAPI(
    title="Hệ Thống AI Hỗ Trợ Ra Quyết Định Lâm Sàng & Khuyến Nghị Điều Trị (CDSS)",
    description="""
# AI_SERVICE - Clinical Decision Support System (CDSS)

Tài liệu tương tác API chính thức của phân hệ Trí tuệ Nhân tạo **AI_SERVICE** trong Hệ thống Quản lý Phòng khám Đa khoa.

### 🌟 Các chức năng cốt lõi:
* **Hỗ trợ Chẩn đoán Lâm sàng**: Trích xuất triệu chứng tự nhiên tiếng Việt (có dấu & không dấu), phân tích và dự đoán Top bệnh lý tiềm năng.
* **Khuyến nghị Kê đơn An toàn**: Tự động gợi ý thuốc theo phác đồ, kèm liều dùng (`dosage`), hướng dẫn uống (`instruction`), rà soát tiền sử dị ứng và chống chỉ định.
* **Tư vấn Lối sống & Dinh dưỡng**: Hướng dẫn chế độ ăn uống (`diets`), các lưu ý phòng ngừa (`precautions`) và vận động (`workouts`).
* **Cảnh báo Dấu hiệu Nguy hiểm (Red Flags)**: Phát hiện sớm các ca bệnh có dấu hiệu cấp cứu cần can thiệp y tế ngay lập tức.

---
* **Xác thực bảo mật nội bộ**: Yêu cầu Header `X-Internal-Key` (Mặc định môi trường Dev: `dev-internal-secret-key-change-in-prod`).
""",
    version="2026.10.0",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)

# CORS: Restricted strictly to backend calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://127.0.0.1:5000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Standardized validation error response format with friendly message."""
    errors = exc.errors()
    msg = "Dữ liệu đầu vào không hợp lệ"
    if errors:
        first_err = errors[0]
        custom_msg = str(first_err.get("msg", "")).strip()
        if custom_msg.startswith("Value error, "):
            custom_msg = custom_msg.replace("Value error, ", "").strip()
        if custom_msg and not custom_msg.startswith("Field required"):
            msg = f"Dữ liệu đầu vào không hợp lệ: {custom_msg}"
        elif custom_msg.startswith("Field required"):
            loc = " -> ".join(str(item) for item in first_err.get("loc", []))
            msg = f"Dữ liệu đầu vào không hợp lệ: Thiếu trường bắt buộc '{loc}'"

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": msg,
            "error": "ValidationError",
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Fallback handler ensuring API never returns raw 500 HTML or unhandled crashes."""
    logger.exception(f"Unhandled server error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "Hệ thống gặp sự cố trong quá trình xử lý. Vui lòng thử lại sau.",
            "error": "InternalServerError",
        },
    )


@app.get("/", tags=["System & Health"], summary="Kiểm tra trạng thái máy chủ AI")
async def root() -> dict[str, Any]:
    """Root endpoint welcoming users and providing documentation links."""
    return {
        "service": "AI_SERVICE - Clinic Decision Support System",
        "status": "running",
        "docs_url": "/docs",
        "health_url": "/health",
    }


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["System & Health"],
    summary="Kiểm tra tình trạng sẵn sàng của mô hình AI",
)
async def health_check() -> dict[str, Any]:
    """Health check endpoint indicating model readiness and version."""
    return {
        "status": "ok",
        "model_loaded": drug_service.model_loaded,
        "model_version": drug_service.model_version,
    }


# Include internal sub-routers
app.include_router(chatbot_router)
app.include_router(drug_router)
