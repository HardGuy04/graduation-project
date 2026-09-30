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


app = FastAPI(
    title="AI_SERVICE - Clinic Decision Support System",
    description="Disease & medicine recommendation and internal AI module for Clinic Management System",
    version="0.0.1",
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
    """Standardized validation error response format."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Dữ liệu đầu vào không hợp lệ",
            "error": "ValidationError",
        },
    )


@app.get("/health", response_model=HealthResponse, tags=["system"])
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
