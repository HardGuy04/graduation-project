// ─────────────────────────────────────────────────────────────────────────────
// Auth middleware — verify JWT từ header Authorization, gắn req.user
// ─────────────────────────────────────────────────────────────────────────────
const { verifyAccessToken } = require('../utils/jwt');
const { fail } = require('../utils/response');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return fail(res, 'Vui lòng đăng nhập để tiếp tục', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Gắn thông tin user vào request để các middleware/controller sau dùng
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return fail(res, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', 401);
    }
    if (err.name === 'JsonWebTokenError') {
      return fail(res, 'Token không hợp lệ', 401);
    }
    return fail(res, 'Xác thực thất bại', 401);
  }
};

module.exports = authenticate;
