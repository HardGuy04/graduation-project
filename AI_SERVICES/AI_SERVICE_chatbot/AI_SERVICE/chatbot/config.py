"""
Đọc cấu hình từ file .env (hoặc biến môi trường hệ thống).
Khi copy folder AI_SERVICE/ vào dự án chính, chỉ cần sửa file .env
(đổi DB_MODE=mysql và điền thông tin MySQL thật) mà KHÔNG cần sửa code.
"""
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

AI_SERVICE_PORT = int(os.getenv("AI_SERVICE_PORT", "8000"))

# "mock"  -> dùng SQLite giả lập, tự sinh sẵn dữ liệu mẫu, phục vụ test độc lập
# "mysql" -> dùng MySQL thật của dự án chính
DB_MODE = os.getenv("DB_MODE", "mock").lower()

MYSQL_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "localhost"),
    "port": int(os.getenv("MYSQL_PORT", "3306")),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
    "database": os.getenv("MYSQL_DATABASE", "clinic"),
}

MOCK_DB_PATH = os.path.join(BASE_DIR, "chatbot", "data", "mock_clinic.db")

INTENT_CONFIDENCE_THRESHOLD = float(os.getenv("INTENT_CONFIDENCE_THRESHOLD", "0.30"))

MODEL_DIR = os.path.join(BASE_DIR, "chatbot", "models")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "vectorizer.pkl")
CLASSIFIER_PATH = os.path.join(MODEL_DIR, "classifier.pkl")

INTENTS_PATH = os.path.join(BASE_DIR, "chatbot", "data", "intents.json")
STOPWORDS_PATH = os.path.join(BASE_DIR, "chatbot", "data", "stopwords_vi.txt")
