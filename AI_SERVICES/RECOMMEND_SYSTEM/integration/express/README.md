# HƯỚNG DẪN TÍCH HỢP AI_SERVICE DÀNH CHO NODE.JS / EXPRESS BACKEND

> **Tài liệu bàn giao:** Module AI Gợi ý Bệnh & Thuốc Hỗ trợ Quyết định Lâm sàng (CDSS)
> **Đối tượng sử dụng:** Đội ngũ phát triển Back-end Node.js / Express

---

## 1. Kiến Trúc Luồng Gọi và An Toàn Dữ Liệu

```
[React Frontend (:5173)]
        │  (1) POST /api/ai/predict-disease
        │      Authorization: Bearer <Doctor_JWT>
        ▼
[Node.js Express Backend (:5000)]
        │  (2) Xác thực JWT token
        │  (3) Kiểm tra role === 'doctor'
        │  (4) Gắn header: X-Internal-Key
        │      Timeout: 5,000ms
        ▼
[Python FastAPI AI_SERVICE (:8000)]
        │  (5) Trích xuất triệu chứng NLP tiếng Việt
        │  (6) Quét dấu hiệu nguy cấp Red Flag
        │  (7) Dự đoán bệnh & Xếp hạng thuốc theo KB
        ▼
[Node.js Express Backend (:5000)]
        │  (8) Trả kết quả JSON về cho Frontend
        ▼
[React Frontend (:5173)]
        │  (9) Hiển thị gợi ý dạng dropdown để Bác sĩ tham khảo
```

> [!IMPORTANT]
> **Quy tắc bảo mật bắt buộc:**
> 1. Front-end **tuyệt đối không gọi trực tiếp** sang `AI_SERVICE:8000`. Mọi cuộc gọi phải đi qua Back-end Node.js.
> 2. `X-Internal-Key` là khóa nội bộ bảo mật giữa Node.js và Python, không bao giờ lộ ra trình duyệt.
> 3. Chỉ người dùng có vai trò `doctor` mới được phép kích hoạt tính năng gợi ý bệnh & thuốc.

---

## 2. Cài Đặt Biến Môi Trường (.env của Node.js Backend)

Thêm các dòng sau vào tệp `.env` của dự án Node.js:

```env
# URL trỏ đến Python AI_SERVICE
AI_SERVICE_URL=http://localhost:8000

# Khóa bí mật nội bộ (phải khớp với AI_INTERNAL_KEY trong .env của AI_SERVICE)
AI_INTERNAL_KEY=dev-internal-secret-key-change-in-prod

# Thời gian chờ tối đa (mili-giây) trước khi tự động kích hoạt fallback
AI_TIMEOUT_MS=5000
```

---

## 3. Cách Tích Hợp Vào Dự Án Express

### Bước 1: Sao chép file proxy
Sao chép tệp `aiProxy.route.js` vào thư mục routes của dự án Node.js:
```bash
cp integration/express/aiProxy.route.js /path/to/backend/routes/aiProxy.route.js
```

### Bước 2: Đăng ký router trong `app.js` hoặc `server.js`
```javascript
const express = require('express');
const app = express();

// Middleware xác thực JWT của hệ thống
const { authenticateJWT, checkRole } = require('./middlewares/auth');

// Đăng ký route proxy AI
const aiProxyRouter = require('./routes/aiProxy.route');

// Áp dụng middleware kiểm tra vai trò bác sĩ
app.use('/api/ai', authenticateJWT, checkRole(['doctor']), aiProxyRouter);
```

---

## 4. Contract API (Chi Tiết Request & Response)

### Endpoint: `POST /api/ai/predict-disease`

#### Header yêu cầu từ Frontend:
- `Authorization: Bearer <Doctor_JWT>`
- `Content-Type: application/json`

#### Request Body mẫu:
```json
{
  "symptoms": "Đau họng, sốt nhẹ, ho khan",
  "diagnosis": "Viêm họng cấp",
  "patient": {
    "age": 28,
    "gender": "male",
    "allergies": ["penicillin"]
  },
  "topK": 3
}
```

#### Response Body thành công (HTTP 200):
```json
{
  "success": true,
  "data": {
    "diseases": [
      {
        "name": "Viêm họng cấp",
        "probability": 72,
        "description": "Viêm niêm mạc họng cấp tính do virus hoặc vi khuẩn.",
        "specialty": "Tai Mũi Họng",
        "matchedSymptoms": ["Đau họng", "Sốt nhẹ"]
      }
    ],
    "medicines": [
      {
        "name": "Paracetamol 500mg",
        "probability": 85,
        "usage": "Giảm đau, hạ sốt",
        "forDiseases": ["Viêm họng cấp"],
        "prescriptionRequired": false,
        "warnings": []
      },
      {
        "name": "Augmentin 625mg",
        "probability": 65,
        "usage": "Kháng sinh đường hô hấp",
        "forDiseases": ["Viêm họng cấp"],
        "prescriptionRequired": true,
        "warnings": [
          "CẢNH BÁO DỊ ỨNG: Bệnh nhân có tiền sử dị ứng với 'penicillin', thuốc có nguy cơ chống chỉ định hoặc dị ứng chéo."
        ]
      }
    ],
    "recognizedSymptoms": ["Đau họng", "Sốt nhẹ", "Ho khan"],
    "unrecognizedTerms": [],
    "redFlags": [],
    "warnings": [],
    "disclaimer": "Kết quả chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ.",
    "modelVersion": "2026.10.0"
  }
}
```

---

## 5. Chiến Lược Xử Lý Sự Cố và Dự Phòng (Fallback Resilience)

Trong môi trường khám bệnh thực tế, trải nghiệm của bác sĩ không bao giờ được phép bị chặn đứng bởi dịch vụ gợi ý:

1. **Timeout (> 5 giây):** Proxy tự động ngắt kết nối axios và trả về HTTP 200 với danh sách `diseases: []` và warning: `"Hệ thống AI phản hồi quá 5 giây. Đã tự động chuyển sang chế độ dự phòng lâm sàng."`.
2. **AI_SERVICE chưa khởi động (503):** Trả về HTTP 200 với thông báo mô hình đang nạp.
3. **Mất kết nối mạng / Crash:** Trả về HTTP 200 kèm cảnh báo để bác sĩ ghi bệnh án bình thường.
4. **Cảnh báo dị ứng thuốc:** Không tự ý ẩn/xóa thuốc trong danh sách nhằm đảm bảo tính minh bạch y khoa, thay vào đó hiển thị cảnh báo đỏ nổi bật trong mảng `medicine.warnings`.
