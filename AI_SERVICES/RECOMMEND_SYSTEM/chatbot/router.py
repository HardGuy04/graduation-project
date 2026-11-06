"""FastAPI Router for Chatbot Service."""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from chatbot.chatbot_service import process_message

router = APIRouter(prefix="/internal", tags=["Chatbot Assistant"])


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Nội dung câu hỏi của người dùng")
    role: str = Field(default="patient", description="Vai trò: patient, doctor, admin")
    userId: int | None = Field(default=None, description="ID người dùng nếu đã đăng nhập")


class InternalChatResponse(BaseModel):
    reply: str
    intent: str | None = None
    confidence: float | None = None
    source: str


@router.post(
    "/chatbot",
    response_model=InternalChatResponse,
    summary="Tiếp nhận và xử lý tin nhắn từ Trợ lý Chatbot MediCare",
    description="Nhận câu hỏi từ Backend, tiền xử lý và trả về phản hồi theo Rule-based hoặc Intent classification ML.",
)
def internal_chatbot(payload: ChatRequest) -> InternalChatResponse:
    """Xử lý câu hỏi chatbot và trả lời theo Rule-based hoặc ML Intent."""
    result = process_message(payload.message, payload.role, payload.userId)
    return InternalChatResponse(
        reply=result.reply,
        intent=result.intent,
        confidence=result.confidence,
        source=result.source,
    )
