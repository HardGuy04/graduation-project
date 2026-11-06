"""
main.py - Khởi chạy AI_SERVICE (FastAPI)

Chạy:
    uvicorn main:app --reload --port 8000

Endpoint:
    GET  /                    -> Giao diện test chatbot (chỉ phục vụ TEST độc lập)
    GET  /health              -> Kiểm tra service còn sống không
    POST /internal/chatbot    -> Hợp đồng nội bộ Back-end (Node.js) <-> AI_SERVICE (Python)
                                  (đúng theo mục 3.2.11 trong tài liệu API của đồ án)
    POST /api/chatbot/ask     -> Endpoint TIỆN TEST: giả lập response mà Back-end thật
                                  sẽ trả về cho Front-end (mục 3.2.9), để test_ui.html
                                  có thể gọi thẳng khi chưa có Back-end Node.js chạy cùng.

Khi COPY folder AI_SERVICE/ này vào dự án chính:
    - Back-end (Node.js/Express) sẽ gọi sang POST /internal/chatbot (giữ nguyên).
    - Route /api/chatbot/ask ở đây chỉ để test độc lập, có thể bỏ qua/xoá vì
      Back-end thật đã tự có route POST /api/chatbot/ask riêng của nó rồi.
"""
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os

from chatbot.chatbot_service import process_message
from chatbot import config

app = FastAPI(
    title="AI_SERVICE - Chatbot tư vấn phòng khám",
    description="Module AI độc lập: Rule-based + Machine Learning cho chatbot tư vấn.",
    version="1.0.0",
)

# Cho phép Front-end / test UI gọi trực tiếp khi chạy độc lập
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# ------------------------- Schemas -------------------------
class ChatRequest(BaseModel):
    message: str
    role: str = "patient"
    userId: int | None = None


class InternalChatResponse(BaseModel):
    reply: str
    intent: str | None = None
    confidence: float | None = None
    source: str


class PublicChatData(BaseModel):
    reply: str
    createdAt: str


class PublicChatResponse(BaseModel):
    success: bool
    data: PublicChatData


# ------------------------- Routes -------------------------
@app.get("/")
def serve_test_ui():
    """Giao diện web đơn giản để test thử chatbot (chỉ dùng khi phát triển/test)."""
    return FileResponse(os.path.join(STATIC_DIR, "test_ui.html"))


@app.get("/health")
def health_check():
    return {"status": "ok", "db_mode": config.DB_MODE}


@app.post("/internal/chatbot", response_model=InternalChatResponse)
def internal_chatbot(payload: ChatRequest):
    """
    Hợp đồng nội bộ: Back-end (Node.js) gọi endpoint này sau khi đã xác thực
    JWT và xác định đây là câu hỏi kiến thức chung cần chuyển cho AI_SERVICE.
    """
    result = process_message(payload.message, payload.role, payload.userId)
    return InternalChatResponse(
        reply=result.reply,
        intent=result.intent,
        confidence=result.confidence,
        source=result.source,
    )


@app.post("/api/chatbot/ask", response_model=PublicChatResponse)
def public_chatbot_ask(payload: ChatRequest):
    """
    CHỈ DÙNG ĐỂ TEST ĐỘC LẬP: mô phỏng đúng response mà Back-end thật (mục 3.2.9)
    sẽ trả về cho Front-end, để test_ui.html có thể gọi thẳng khi chưa ghép
    với Back-end Node.js.
    """
    result = process_message(payload.message, payload.role, payload.userId)
    return PublicChatResponse(
        success=True,
        data=PublicChatData(
            reply=result.reply,
            createdAt=datetime.now(timezone.utc).isoformat(),
        ),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=config.AI_SERVICE_PORT, reload=True)
