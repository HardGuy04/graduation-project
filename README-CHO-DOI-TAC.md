MediCare Hub — bản gửi tích hợp AI

Cấu trúc:
- frontend/     React (Vite) — UI, chatbot widget
- backend/      Express API :5000 — nghiệp vụ + MySQL
- AI_SERVICE/   Service AI :8000 (bạn triển khai tại đây)
- clinic-api/   Prototype cũ, không dùng cho luồng chính

Luồng dự kiến:
  FE -> Backend (http://localhost:5000) -> AI_SERVICE (http://localhost:8000)

Backend đã có biến AI_SERVICE_URL trong .env.example.
Chatbot/AI hiện FE còn mock; BE chưa mount route chatbot thật.

Cách chạy (máy nhận):
1) MySQL + tạo DB theo backend/database/schema.sql
2) cd backend && copy .env.example .env && điền DB_* JWT_SECRET && npm i && npm run seed && npm run dev
3) cd frontend && copy .env.example .env && npm i && npm run dev
4) AI_SERVICE lắng nghe :8000 theo contract nhóm thống nhất

KHÔNG gửi kèm .env (chứa secret). Dùng .env.example.
