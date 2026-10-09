// authenticate — xác thực Bearer access token, gắn req.user = { id, role, doctorId, patientId, adminId }
import pool from '../config/db.js';
import AppError from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { USER_STATUS } from '../utils/constants.js';

export default async function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Phiên đăng nhập đã hết hạn');
    }
    throw new AppError(401, 'INVALID_TOKEN', 'Token không hợp lệ');
  }

  // Đọc lại trạng thái từ DB để tài khoản bị khóa mất quyền ngay, không phải chờ token hết hạn;
  // vai trò cũng lấy từ DB chứ không tin hoàn toàn vào token.
  const [rows] = await pool.query(
    `SELECT u.id, u.role, u.status, d.id AS doctorId, p.id AS patientId, a.id AS adminId
       FROM users u
       LEFT JOIN doctor d        ON d.user_id = u.id
       LEFT JOIN patient p       ON p.user_id = u.id
       LEFT JOIN admin_profile a ON a.user_id = u.id
      WHERE u.id = ?`,
    [Number(payload.sub)],
  );
  const user = rows[0];
  if (!user) throw new AppError(401, 'INVALID_TOKEN', 'Token không hợp lệ');
  if (user.status !== USER_STATUS.ACTIVE) {
    throw new AppError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa, vui lòng liên hệ phòng khám');
  }

  req.user = {
    id: user.id,
    role: user.role,
    doctorId: user.doctorId,
    patientId: user.patientId,
    adminId: user.adminId,
  };
  next();
}
