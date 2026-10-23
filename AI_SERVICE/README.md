# AI_SERVICE: Hệ Thống Hỗ Trợ Quyết Định Lâm Sàng (CDSS)

> **Module AI Gợi ý Bệnh & Thuốc theo Triệu chứng hỗ trợ Bác sĩ**
> Thuộc Đồ án tốt nghiệp: Hệ thống Quản lý Phòng khám đa khoa (React + Node/Express + MySQL + FastAPI)

---

## 1. Mục tiêu và Nguyên tắc Thiết kế
Hệ thống đóng vai trò hỗ trợ quyết định lâm sàng (Clinical Decision Support System - CDSS). Khi Bác sĩ khám bệnh và nhập triệu chứng, hệ thống đưa ra danh sách các bệnh khả nghi và thuốc liên quan để bác sĩ **tham khảo**.

**Thứ tự ưu tiên cốt lõi:**
1. **Đúng Contract:** Tuân thủ 100% schema và mã lỗi đã cam kết.
2. **An toàn:** Có bộ lọc Red Flag cảnh báo cấp cứu độc lập; kiểm tra dị ứng thuốc; không sinh liều dùng; luôn kèm disclaimer.
3. **Giải thích được:** Trả về triệu chứng khớp thực tế (`matchedSymptoms`), giải thích lý do gợi ý.
4. **Đo lường trung thực:** Đánh giá trên test split trước khi augment, kiểm thử độ bền với nhiễu và golden set; không báo cáo số liệu ảo.
5. **Thông minh:** Kết hợp mô hình ML (calibrated probabilities) với Knowledge Base y khoa xác thực.

---

## 2. Kiến trúc Hệ thống
```
[ Frontend: React (:5173) ]
           │
           ▼
[ Backend: Node/Express (:5000) ] (Auth JWT, verify role == 'doctor')
           │ (Forward with X-Internal-Key)
           ▼
[ AI_SERVICE: FastAPI (:8000) ]
     ├── /health                     -> Trạng thái nạp model
     ├── /internal/predict-disease    -> Module gợi ý bệnh & thuốc
     └── /internal/chatbot           -> [Stub 501 - Chủ sở hữu Chatbot triển khai sau]
```

*Lưu ý bảo mật: AI_SERVICE không mở public ra Internet; chỉ nhận request nội bộ từ Backend Node.js qua header `X-Internal-Key`.*

---

## 3. Cấu trúc Thư mục
```
AI_SERVICE/
├── dataset/                     # Dữ liệu gốc (READ-ONLY)
├── main.py                      # FastAPI entrypoint & Lifespan
├── requirements.txt             # Runtime dependencies pinned
├── requirements-dev.txt         # Dev & test dependencies pinned
├── pyproject.toml               # Config ruff, mypy, pytest
├── Makefile                     # Make commands (lint, test, run, audit, train...)
├── Dockerfile                   # Production container definition
├── .env.example                 # Mẫu cấu hình môi trường
├── chatbot/                     # STUB router (POST /internal/chatbot -> 501)
├── drug_recommendation/
│   ├── config.py                # Quản lý đường dẫn tương đối và biến môi trường
│   ├── schemas.py               # Pydantic v2 schemas chuẩn Contract
│   ├── drug_service.py          # Facade điều phối NLP, Model, Safety, KB
│   ├── router.py                # Endpoint POST /internal/predict-disease
│   ├── nlp/                     # Normalizer, Fuzzy matcher, Phủ định tiếng Việt
│   ├── model/                   # Trainer, Calibrated Predictor
│   ├── knowledge/               # Knowledge Base loader, Safety rules, Medicine ranker
│   └── artifacts/               # model.joblib + metadata.json
├── data/
│   ├── raw/README.md            # Hash SHA-256 dữ liệu raw
│   ├── processed/               # Dữ liệu sau pipeline
│   └── kb/                      # Knowledge Base (diseases, symptoms, medicines)
├── scripts/                     # Scripts audit, build, train, evaluate, export
├── tests/                       # Unit tests, Contract tests, Fixtures độc lập
└── docs/                        # DATA_AUDIT.md, MODEL_CARD.md, openapi.json
```

---

## 4. Quyết định Quản lý Model Artifacts
Kích thước mô hình dự kiến (Calibrated Logistic Regression / Random Forest trên ~132 feature nhị phân) dự kiến dưới **15 MB**.
- **Quyết định:** Commit trực tiếp `model.joblib` và `metadata.json` vào git.
- Nếu artifact vượt quá **20 MB**, hệ thống sẽ chuyển sang quản lý qua **Git LFS**.

---

## 5. Hướng dẫn Khởi chạy Thủ công bằng Dòng lệnh (CLI)

```bash
# 1. Kích hoạt môi trường ảo
.venv\Scripts\activate      # Windows (PowerShell/CMD)
source .venv/bin/activate    # Linux/macOS

# 2. Chạy toàn bộ kiểm thử và kiểm tra chất lượng mã nguồn
pytest
ruff check .
mypy drug_recommendation/

# 3. Khởi chạy máy chủ AI_SERVICE
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Kiểm tra hoạt động dịch vụ:
* **Kiểm tra tình trạng sẵn sàng của mô hình (Health Check):**
  ```bash
  curl http://localhost:8000/health
  ```
  *Kết quả:*
  ```json
  {"status":"ok","model_loaded":true,"model_version":"2026.10.0"}
  ```

* **Giao diện Demo Tương tác trực quan (Playground UI):**
  Mở trình duyệt truy cập: `http://localhost:8000/demo` (Hỗ trợ chọn nhanh các ca bệnh mẫu, nhập triệu chứng tiếng Việt, hiển thị kết quả chẩn đoán, phác đồ thuốc kèm liều lượng và tư vấn lối sống).

* **Giao diện Swagger tương tác trực tiếp:**
  Mở trình duyệt truy cập: `http://localhost:8000/docs`

* **Chạy thử chẩn đoán lâm sàng bằng cURL:**
  ```bash
  curl -X POST http://localhost:8000/internal/predict-disease \
    -H "Content-Type: application/json" \
    -H "X-Internal-Key: dev-internal-secret-key-change-in-prod" \
    -d "{\"symptoms\":\"bệnh nhân sốt cao, đau đầu, đau nhức khớp, không nôn mửa\",\"patientInfo\":{\"age\":28,\"gender\":\"Nam\"}}"
  ```
