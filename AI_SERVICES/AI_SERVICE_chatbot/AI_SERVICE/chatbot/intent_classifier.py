"""
Mô hình phân loại ý định (Intent Classification) cho các câu hỏi kiến thức
y tế chung, kết hợp:
    - TfidfVectorizer: biến câu hỏi (đã tiền xử lý) thành vector đặc trưng
    - So khớp gần nhất (cosine similarity) với kho câu hỏi mẫu đã xây dựng
      sẵn trong chatbot/data/intents.json để xác định intent phù hợp nhất.

Đây chính là cách hiện thực hoá nguyên lý đã mô tả: "phân loại ý định kết hợp
với kho dữ liệu câu hỏi – câu trả lời đã được xây dựng sẵn". Cách tiếp cận
này (TF-IDF + Cosine Similarity, tương tự k-Nearest-Neighbor) phù hợp với dữ
liệu mẫu ít, cho điểm tin cậy trực quan hơn so với xác suất softmax của các
mô hình phân loại nhiều lớp khi dữ liệu mẫu còn nhỏ.

Model (vectorizer + ma trận TF-IDF của kho câu mẫu) được huấn luyện từ
chatbot/data/intents.json và lưu lại dưới dạng file .pkl để không phải xử lý
lại mỗi lần khởi động server. Nếu chưa có file model (lần chạy đầu tiên),
hệ thống sẽ TỰ ĐỘNG huấn luyện.
"""
import os
import pickle
from typing import Tuple, List

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from . import config
from . import knowledge_base
from .preprocessing import preprocess


class IntentClassifier:
    def __init__(self):
        self.vectorizer: TfidfVectorizer = None
        self.sample_matrix = None          # ma trận TF-IDF của toàn bộ câu mẫu
        self.sample_labels: List[str] = None  # nhãn (tag) tương ứng từng câu mẫu

    def train(self, save: bool = True):
        texts, labels = knowledge_base.get_training_data()
        processed = [preprocess(t) for t in texts]

        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
        self.sample_matrix = self.vectorizer.fit_transform(processed)
        self.sample_labels = labels

        if save:
            os.makedirs(config.MODEL_DIR, exist_ok=True)
            with open(config.VECTORIZER_PATH, "wb") as f:
                pickle.dump(self.vectorizer, f)
            with open(config.CLASSIFIER_PATH, "wb") as f:
                pickle.dump({"matrix": self.sample_matrix, "labels": self.sample_labels}, f)

    def load(self) -> bool:
        if os.path.exists(config.VECTORIZER_PATH) and os.path.exists(config.CLASSIFIER_PATH):
            with open(config.VECTORIZER_PATH, "rb") as f:
                self.vectorizer = pickle.load(f)
            with open(config.CLASSIFIER_PATH, "rb") as f:
                payload = pickle.load(f)
                self.sample_matrix = payload["matrix"]
                self.sample_labels = payload["labels"]
            return True
        return False

    def load_or_train(self):
        if not self.load():
            self.train(save=True)

    def predict(self, text: str) -> Tuple[str, float]:
        """Trả về (intent_tag, confidence) cho câu hỏi đầu vào, bằng cách tìm
        câu mẫu có độ tương đồng cosine cao nhất trong kho dữ liệu."""
        processed = preprocess(text)
        if not processed:
            return "unknown", 0.0
        X = self.vectorizer.transform([processed])
        sims = cosine_similarity(X, self.sample_matrix)[0]
        best_idx = sims.argmax()
        tag = self.sample_labels[best_idx]
        confidence = float(sims[best_idx])
        return tag, confidence


# Instance dùng chung toàn app (singleton đơn giản)
_classifier_instance: IntentClassifier = None


def get_classifier() -> IntentClassifier:
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = IntentClassifier()
        _classifier_instance.load_or_train()
    return _classifier_instance
