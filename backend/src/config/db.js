import mysql from 'mysql2/promise';
import env from './env.js';

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  // Trả DATETIME dạng chuỗi, tránh driver tự đổi múi giờ. Toàn hệ thống lưu UTC.
  dateStrings: true,
  timezone: 'Z',
});

// timezone:'Z' chỉ ảnh hưởng phía driver; CURRENT_TIMESTAMP/NOW() dùng múi giờ của phiên MySQL nên phải ép UTC
pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+00:00'");
});

/**
 * Chạy fn(conn) trong một transaction. Giữ fn ngắn: không gọi HTTP/gửi email bên trong
 * vì transaction đang giữ khóa dòng.
 */
export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch { /* kết nối hỏng thì rollback cũng lỗi — giữ lỗi gốc */ }
    throw err;
  } finally {
    conn.release();
  }
}

export default pool;
