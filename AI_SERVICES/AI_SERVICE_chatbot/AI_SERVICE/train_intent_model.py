"""
Script train lại model phân loại ý định (intent classifier) một cách thủ công.
Dùng khi:
    - Vừa thêm/sửa dữ liệu trong chatbot/data/intents.json
    - Muốn huấn luyện lại mà không cần xoá tay file .pkl cũ

Chạy:
    python train_intent_model.py
"""
from chatbot.intent_classifier import IntentClassifier

if __name__ == "__main__":
    clf = IntentClassifier()
    print("Đang huấn luyện model phân loại ý định từ chatbot/data/intents.json ...")
    clf.train(save=True)
    print("Huấn luyện xong. Model đã được lưu vào chatbot/models/")

    # Thử vài câu để kiểm tra nhanh
    samples = [
        "bị sốt cao phải làm sao",
        "đau đầu chóng mặt nên làm gì",
        "cảm ơn bạn nhiều nhé",
        "xin chào",
    ]
    print("\nKiểm tra nhanh:")
    for s in samples:
        tag, conf = clf.predict(s)
        print(f"  '{s}' -> intent='{tag}' (confidence={conf:.2f})")
