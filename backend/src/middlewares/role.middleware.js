// ─────────────────────────────────────────────────────────────────────────────
// Role middleware — kiểm tra vai trò (phải dùng SAU auth middleware)
// Sử dụng: requireRole('admin') hoặc requireRole('admin', 'doctor')
// ─────────────────────────────────────────────────────────────────────────────
const { fail } = require('../utils/response');

/**
 * Factory tạo middleware kiểm tra role.
 * @param  {...string} allowedRoles - Các role được phép truy cập
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 'Vui lòng đăng nhập để tiếp tục', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return fail(res, 'Bạn không có quyền truy cập chức năng này', 403);
    }

    next();
  };
};

module.exports = requireRole;
