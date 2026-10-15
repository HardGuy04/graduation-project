"""Chatbot router stub module.

PLACEHOLDER - owned by chatbot owner, replace entirely.
"""

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/internal/chatbot", tags=["Chatbot Service"])


@router.post(
    "",
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    summary="Tiếp nhận hội thoại Chatbot bệnh nhân (Placeholder)",
)
@router.post(
    "/",
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    summary="Tiếp nhận hội thoại Chatbot bệnh nhân (Placeholder)",
)
async def internal_chatbot_stub() -> JSONResponse:
    # PLACEHOLDER - owned by chatbot owner, replace entirely
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={
            "success": False,
            "message": "Chatbot service is not implemented yet",
            "error": "NotImplementedError",
        },
    )
