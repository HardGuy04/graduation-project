"""
chatbot_service.py
-------------------
Điểm vào xử lý logic chính của chatbot (được main.py gọi tại endpoint
POST /internal/chatbot). Luồng xử lý theo đúng nguyên lý đã thiết kế:

    1) Tiền xử lý câu hỏi (chuẩn hóa tiếng Việt, loại bỏ ký tự thừa).
    2) Rule-based: nếu câu hỏi liên quan dữ liệu nội bộ (chuyên khoa, bác sĩ,
       lịch làm việc, thông tin phòng khám) -> truy vấn thẳng từ DB, trả lời
       ngay, KHÔNG cần qua model AI (nhanh, chính xác, không rò rỉ dữ liệu).
    3) Nếu không khớp rule-based -> chuyển cho model phân loại ý định
       (Intent Classification) để xác định câu hỏi thuộc nhóm kiến thức y tế
       chung nào, rồi trả lời bằng câu trả lời tương ứng trong knowledge_base.
    4) Nếu độ tin cậy của model quá thấp -> trả lời fallback, gợi ý liên hệ lễ tân.
"""
from dataclasses import dataclass

from . import rule_based
from . import knowledge_base
from . import config
from .preprocessing import normalize_text
from .intent_classifier import get_classifier

FALLBACK_MESSAGE = (
    "Xin lỗi, tôi chưa hiểu rõ câu hỏi của bạn. Bạn có thể diễn đạt lại, "
    "hoặc liên hệ trực tiếp lễ tân phòng khám để được hỗ trợ nhanh nhất."
)


@dataclass
class ChatbotResult:
    reply: str
    source: str          # "rule_based" | "ml_model" | "fallback"
    intent: str = None   # tag của intent nếu trả lời bằng ml_model
    confidence: float = None


def process_message(message: str, role: str = "patient", user_id: int = None) -> ChatbotResult:
    if not message or not message.strip():
        return ChatbotResult(reply="Bạn vui lòng nhập câu hỏi.", source="fallback")

    text_norm = normalize_text(message)

    # 1) Thử rule-based trước (dữ liệu nội bộ: chuyên khoa / bác sĩ / lịch / phòng khám)
    rb_answer = rule_based.try_answer(message, text_norm)
    if rb_answer:
        return ChatbotResult(reply=rb_answer, source="rule_based")

    # 2) Không khớp rule-based -> chuyển cho model phân loại ý định (ML)
    classifier = get_classifier()
    tag, confidence = classifier.predict(message)

    if confidence >= config.INTENT_CONFIDENCE_THRESHOLD:
        reply = knowledge_base.get_response_for_tag(tag)
        return ChatbotResult(reply=reply, source="ml_model", intent=tag, confidence=confidence)

    # 3) Độ tin cậy thấp -> fallback
    return ChatbotResult(reply=FALLBACK_MESSAGE, source="fallback", intent=tag, confidence=confidence)
