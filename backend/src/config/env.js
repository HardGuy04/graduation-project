// Nạp và kiểm tra biến môi trường MỘT lần; mọi module khác đọc cấu hình từ đây.
import 'dotenv/config';

// Thiếu cấu hình bắt buộc thì dừng ngay lúc khởi động, tránh chạy với giá trị mặc định nguy hiểm
const REQUIRED = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  throw new Error(`Thiếu biến môi trường bắt buộc: ${missing.join(', ')} (xem .env.example)`);
}
if (process.env.JWT_SECRET.length < 32) {
  console.warn('[env] JWT_SECRET ngắn hơn 32 ký tự — nên dùng chuỗi ngẫu nhiên dài hơn.');
}

const offset = process.env.CLINIC_UTC_OFFSET || '+07:00';
const m = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
if (!m) throw new Error('CLINIC_UTC_OFFSET phải có dạng +HH:MM, ví dụ +07:00');

const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5000),

  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT || 3306),
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,

  JWT_SECRET: process.env.JWT_SECRET,
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || '15m',
  REFRESH_TOKEN_DAYS: Number(process.env.REFRESH_TOKEN_DAYS || 30),

  CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',').map((s) => s.trim()).filter(Boolean),

  // Giờ làm việc trong doctor_schedule là giờ địa phương; Việt Nam không có giờ mùa hè nên offset cố định là đủ
  CLINIC_UTC_OFFSET: offset,
  CLINIC_OFFSET_MINUTES: (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])),

  // Bật nhắc lịch tự động (đặt REMINDER_ENABLED=false khi chạy test)
  REMINDER_ENABLED: process.env.REMINDER_ENABLED !== 'false',

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  VNPAY_TMN_CODE: process.env.VNPAY_TMN_CODE || '',
  VNPAY_HASH_SECRET: process.env.VNPAY_HASH_SECRET || '',
  VNPAY_RETURN_URL: process.env.VNPAY_RETURN_URL || `http://localhost:${process.env.PORT || 5000}/api/payments/vnpay/return`,
});

export default env;
