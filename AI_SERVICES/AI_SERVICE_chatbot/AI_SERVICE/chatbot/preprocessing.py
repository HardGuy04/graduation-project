"""
Tiền xử lý ngôn ngữ tự nhiên tiếng Việt cho chatbot:
    - Chuẩn hóa unicode (tổ hợp dấu -> dựng sẵn)
    - Đưa về chữ thường
    - Loại bỏ ký tự đặc biệt / số dư thừa
    - Tách từ đơn giản theo khoảng trắng (không dùng thư viện nặng để dễ triển khai)
    - Loại bỏ stopword tiếng Việt

Ghi chú: hệ thống dùng tách từ theo khoảng trắng (word-level) kết hợp n-gram
trong TfidfVectorizer để bù lại việc không tách từ ghép chính xác 100%.
Nếu muốn nâng cấp độ chính xác, có thể thay thế hàm `tokenize` bằng thư viện
tách từ tiếng Việt như underthesea / pyvi mà không cần đổi phần còn lại.
"""
import re
import unicodedata
from functools import lru_cache
from typing import List

from . import config


@lru_cache(maxsize=1)
def _load_stopwords() -> set:
    try:
        with open(config.STOPWORDS_PATH, encoding="utf-8") as f:
            return {line.strip().lower() for line in f if line.strip()}
    except FileNotFoundError:
        return set()


_PUNCT_RE = re.compile(r"[^\w\sÀ-ỹ]", re.UNICODE)
_MULTI_SPACE_RE = re.compile(r"\s+")


def normalize_text(text: str) -> str:
    """Chuẩn hóa unicode, hạ chữ thường, bỏ ký tự đặc biệt, gộp khoảng trắng."""
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text)
    text = text.lower().strip()
    text = _PUNCT_RE.sub(" ", text)
    text = _MULTI_SPACE_RE.sub(" ", text).strip()
    return text


def tokenize(text: str) -> List[str]:
    return normalize_text(text).split()


def remove_stopwords(tokens: List[str]) -> List[str]:
    stopwords = _load_stopwords()
    return [t for t in tokens if t not in stopwords]


def preprocess(text: str) -> str:
    """Pipeline đầy đủ: chuẩn hóa -> tách từ -> loại stopword -> ghép lại thành chuỗi.
    Dùng chuỗi kết quả này làm đầu vào cho TfidfVectorizer.
    """
    tokens = tokenize(text)
    tokens = remove_stopwords(tokens)
    return " ".join(tokens)
