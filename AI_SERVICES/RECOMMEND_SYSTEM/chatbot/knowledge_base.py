"""
Nạp kho dữ liệu câu hỏi - câu trả lời (intents.json) đã xây dựng sẵn,
phục vụ cho việc huấn luyện mô hình phân loại ý định (Intent Classification)
và tra cứu câu trả lời tương ứng với từng ý định (tag).
"""
import json
from functools import lru_cache
from typing import Dict, List, Tuple

from . import config


@lru_cache(maxsize=1)
def load_intents() -> dict:
    with open(config.INTENTS_PATH, encoding="utf-8") as f:
        return json.load(f)


def get_training_data() -> Tuple[List[str], List[str]]:
    """Trả về (danh sách câu mẫu, danh sách nhãn tương ứng) để huấn luyện model."""
    data = load_intents()
    texts, labels = [], []
    for intent in data["intents"]:
        for pattern in intent["patterns"]:
            texts.append(pattern)
            labels.append(intent["tag"])
    return texts, labels


@lru_cache(maxsize=1)
def get_responses() -> Dict[str, str]:
    data = load_intents()
    return {intent["tag"]: intent["response"] for intent in data["intents"]}


def get_response_for_tag(tag: str) -> str:
    return get_responses().get(
        tag,
        "Xin lỗi, tôi chưa có thông tin về vấn đề này. Bạn vui lòng liên hệ trực tiếp lễ tân để được hỗ trợ thêm.",
    )
