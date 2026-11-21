// Xoá bộ đếm đăng nhập sai (bảng login_attempts) trước khi chạy test.
//
// Vì sao cần: giới hạn đăng nhập tính theo IP (MAX_PER_IP = 30 lần / 15 phút).
// Mỗi lần chạy test cố tình dùng sai mật khẩu vài lần, và tất cả đều dồn về cùng
// một IP (::1 khi gọi localhost) → nếu không xoá, IP sẽ bị chặn 429 và mọi test
// phía sau đều fail dây chuyền.
//
// Bảng login_attempts chỉ lưu dấu vết "đăng nhập sai", không chứa dữ liệu nghiệp vụ
// nên xoá toàn bộ là an toàn.
import pool from '../src/config/db.js';

try {
  const [r] = await pool.query('DELETE FROM login_attempts');
  console.log(`Đã xoá ${r.affectedRows} bản ghi login_attempts.`);
} catch (err) {
  // Bảng chưa được migration 001 tạo → không sao, bộ đếm sẽ dùng bộ nhớ.
  if (err.code === 'ER_NO_SUCH_TABLE') console.log('Bảng login_attempts chưa tồn tại — bỏ qua.');
  else { console.error('Xoá login_attempts thất bại:', err.code || '', err.message); process.exitCode = 1; }
} finally {
  await pool.end();
}
