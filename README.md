# MediCare Hub

Hệ thống quản lý phòng khám ngoại trú: Backend (Express ESM) + Frontend (Vite/React) + AI Service (FastAPI).

## Cấu trúc

```
graduation-project/
  backend/                  API Node.js (Express, ESM) - cổng 5000
  frontend/                 Giao diện React + Vite - cổng 5173
  AI_SERVICES/
    RECOMMEND_SYSTEM/       Dịch vụ AI Python/FastAPI - cổng 8000
```

## Yêu cầu

- Node.js 18+ và Python 3.10+
- MySQL 8+ (khuyến nghị chạy bằng Docker)

## 1. Database

Dùng Docker cho nhanh:

```bash
docker run -d --name clinic-mysql -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=clinic \
  -e MYSQL_USER=clinic_app \
  -e MYSQL_PASSWORD=123456 \
  mysql:9
```

Tạo user ứng dụng và nạp schema:

```bash
docker exec -i clinic-mysql mysql -uroot -proot clinic < backend/database/schema.sql
docker exec -i clinic-mysql mysql -uroot -proot clinic < backend/database/seed.sql
```

Chạy các migration (bảng `login_attempts`, `notification`, thanh toán VNPay, hồ sơ bác sĩ):

```bash
for f in backend/database/migrations/*.sql; do
  docker exec -i clinic-mysql mysql -uroot -proot clinic < "$f"
done
```

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env      # sửa DB_USER, DB_PASSWORD, JWT_SECRET
npm run seed              # dữ liệu thử nghiệm (tài khoản tên người Việt Nam)
npm run dev               # http://localhost:5000
```

Biến bắt buộc trong `backend/.env`: `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` (>= 32 ký tự).

## 3. AI Service

```bash
cd AI_SERVICES/RECOMMEND_SYSTEM
python -m venv .venv
.\.venv\Scripts\activate            # Windows: .\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env               # đặt DB_MODE=mysql và thông tin MySQL
uvicorn main:app --host 127.0.0.1 --port 8000
```

`AI_INTERNAL_KEY` trong `AI_SERVICES/RECOMMEND_SYSTEM/.env` phải **giống hệt** giá trị trong `backend/.env`.

Chức năng: chẩn đoán bệnh theo triệu chứng, đề xuất thuốc theo phác đồ, kiểm tra tương tác thuốc, gợi ý chế độ ăn/tập luyện, chatbot tra cứu trực tiếp dữ liệu phòng khám.

## 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:5000/api
npm run dev                 # http://localhost:5173
```

## Luồng dữ liệu AI

```
Trình duyệt → Frontend (:5173) → Backend (:5000) → AI Service (:8000) → MySQL
```

Backend là lớp trung gian duy nhất được phép gọi AI Service, và gửi kèm header `X-Internal-Key`.

## Tài khoản thử nghiệm

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị viên | `admin@medicare.vn` | `Test@12345` |
| Bác sĩ | `tranthib@medicare.vn` | `Test@12345` |
| Bệnh nhân | `nguyenvanan@gmail.com` | `Test@12345` |

Tài khoản do `npm run seed` tạo dùng miền `@test.medicare.vn` để dễ nhận biết và dọn được bằng `npm run test:cleanup`.

## Kiểm thử

```bash
# Backend: cần backend đang chạy ở :5000
cd backend
npm test                      # 71 test
npm run test:cleanup          # xóa dữ liệu thử nghiệm

# AI Service
cd AI_SERVICES/RECOMMEND_SYSTEM
.\.venv\Scripts\python.exe -m pytest    # 65 test

# Frontend
cd frontend
npm run lint
npm run build
```

## Cấu trúc API chính

| Nhóm | Đường dẫn | Quyền |
|---|---|---|
| Xác thực | `/api/auth/*` | công khai / đã đăng nhập |
| Bác sĩ | `/api/doctor/*` | DOCTOR |
| Bệnh nhân | `/api/patient/*` | PATIENT |
| Quản trị | `/api/admin/*` | ADMIN |
| Lịch hẹn | `/api/appointments/*` | theo vai trò |
| Thanh toán | `/api/payments/*` | theo vai trò |
| AI | `/api/ai/predict-disease`, `/api/ai/medicines-by-disease` | DOCTOR, ADMIN |
| Chatbot | `/api/chatbot/message` | mọi vai trò đã đăng nhập |
