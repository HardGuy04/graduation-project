# AI_SERVICE — Chatbot tư vấn (Rule-based + Machine Learning)

Dự án con độc lập cho phần **Chatbot tư vấn** của đồ án "Hệ thống quản lý
phòng khám tích hợp AI chatbot". Có thể chạy và test riêng, sau đó chỉ cần
**copy nguyên folder `AI_SERVICE/` này** vào dự án chính (đặt ngang hàng với
`backend/` và `frontend/`) mà không cần sửa code.

## 1. Cấu trúc thư mục

```
AI_SERVICE/
├── main.py                     # FastAPI app: /internal/chatbot, /api/chatbot/ask, giao diện test
├── requirements.txt
├── .env.example                # copy thành .env
├── chatbot/
│   ├── chatbot_service.py      # điều phối rule-based / ML, xử lý /internal/chatbot
│   ├── rule_based.py           # trả lời câu hỏi dữ liệu nội bộ (chuyên khoa, bác sĩ, lịch, phòng khám)
│   ├── intent_classifier.py    # TF-IDF + Logistic Regression, phân loại ý định câu hỏi y tế chung
│   ├── knowledge_base.py       # nạp intents.json, tra cứu câu trả lời theo intent
│   ├── preprocessing.py        # tiền xử lý tiếng Việt (chuẩn hoá, bỏ stopword)
│   ├── database.py             # repository: MockRepository (SQLite) / MySQLRepository (MySQL thật)
│   ├── config.py                # đọc biến môi trường .env
│   ├── data/
│   │   ├── intents.json        # dữ liệu mẫu Q&A y tế chung để huấn luyện model
│   │   ├── stopwords_vi.txt
│   │   └── mock_clinic.db      # tự sinh khi chạy lần đầu (SQLite, dữ liệu giả lập)
│   └── models/                 # tự sinh: vectorizer.pkl, classifier.pkl (model đã huấn luyện)
├── drug_recommendation/        # placeholder, ngoài phạm vi yêu cầu lần này
├── train_intent_model.py       # script train lại model thủ công (tuỳ chọn)
└── static/
    └── test_ui.html            # giao diện web để TEST thử chatbot
```

## 2. Cài đặt

```bash
cd AI_SERVICE
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

## 3. Chạy thử (chế độ mock — không cần MySQL)

Mặc định `.env` có `DB_MODE=mock`: hệ thống tự tạo file SQLite mẫu
(`chatbot/data/mock_clinic.db`) với vài chuyên khoa, bác sĩ, lịch làm việc
giả lập — đủ để demo mà không cần cài MySQL.

```bash
uvicorn main:app --reload --port 8000
```

Mở trình duyệt tại: **http://localhost:8000/** để vào giao diện chat test
(`static/test_ui.html`). Lần chạy đầu tiên, model sẽ tự động huấn luyện
(mất vài giây) và lưu vào `chatbot/models/`.

Một vài câu hỏi thử:
- "Phòng khám có những chuyên khoa nào?" → rule-based, trả lời từ DB
- "Lịch làm việc của bác sĩ Lê Văn Cường" → rule-based, trả lời từ DB
- "Bác sĩ nào chuyên khoa Tim mạch?" → rule-based, trả lời từ DB
- "Địa chỉ phòng khám ở đâu?" → rule-based, trả lời từ DB
- "Bị sốt cao nên làm gì?" / "Đau đầu phải làm sao?" → chuyển sang model ML (intent classification)
- "Ê chatbot ơi 123 abc" → không khớp intent nào rõ ràng → trả lời fallback

Giao diện test hiển thị rõ **nguồn trả lời** (rule_based / ml_model / fallback)
và độ tin cậy của model để tiện kiểm tra khi bảo vệ đồ án.

## 4. Test bằng curl / Postman

```bash
curl -X POST http://localhost:8000/internal/chatbot \
  -H "Content-Type: application/json" \
  -d '{"message": "Phòng khám có những chuyên khoa nào?", "role": "patient", "userId": 1}'
```

## 5. Copy vào dự án chính

1. Copy nguyên thư mục `AI_SERVICE/` vào thư mục gốc dự án chính (ngang hàng
   `backend/`, `frontend/`).
2. Trong `AI_SERVICE/.env`, đổi `DB_MODE=mysql` và điền thông tin MySQL thật
   (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`).
3. Trong `chatbot/database.py`, lớp `MySQLRepository` đang giả định tên bảng
   `Specialty`, `Doctor`, `DoctorSchedule` với các cột như trong tài liệu API
   (`specialtyId`, `dayOfWeek`, `startTime`...). Nếu schema MySQL thực tế của
   bạn đặt tên khác, chỉ cần sửa lại câu SQL trong file này — phần logic
   chatbot ở các file khác không cần đổi.
4. Trong Back-end (Node.js), route `POST /api/chatbot/ask` (mục 3.2.9 tài liệu
   API) sẽ forward các câu hỏi kiến thức chung sang
   `POST http://localhost:8000/internal/chatbot` như đã mô tả trong đồ án
   (mục 3.2.11), dùng biến môi trường `AI_SERVICE_URL`.
5. Có thể xoá route test-only `/api/chatbot/ask` trong `main.py` của
   `AI_SERVICE` (vì Back-end thật đã có route riêng), giữ lại `/internal/chatbot`.
6. Chạy AI_SERVICE song song với Back-end: `uvicorn main:app --port 8000`.

## 6. Mở rộng thêm

- Thêm intent mới: sửa `chatbot/data/intents.json` (thêm `tag`, `patterns`,
  `response`), sau đó xoá `chatbot/models/*.pkl` để hệ thống tự huấn luyện
  lại ở lần chạy kế tiếp (hoặc chạy `python train_intent_model.py`).
- Nâng cấp độ chính xác NLP: thay hàm `tokenize()` trong `preprocessing.py`
  bằng thư viện tách từ tiếng Việt (underthesea, pyvi...).
- Mở rộng lên RAG (Retrieval-Augmented Generation) ở phiên bản sau: thay
  `intent_classifier.py` bằng pipeline embedding + vector search trên kho
  tài liệu y tế lớn hơn, giữ nguyên phần rule-based cho dữ liệu nội bộ.
