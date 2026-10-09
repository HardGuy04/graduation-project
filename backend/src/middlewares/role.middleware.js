// authorize — giới hạn vai trò được gọi endpoint (dùng SAU authenticate).
// Quyền sở hữu dữ liệu (lịch của ai, bệnh án của ai) được kiểm tra tiếp ở service bằng điều kiện WHERE.
import AppError from '../utils/AppError.js';
import { ROLES } from '../utils/constants.js';

export default function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) throw new AppError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục');
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện chức năng này');
    }
    // Tài khoản bác sĩ/bệnh nhân thiếu hồ sơ thì mọi truy vấn theo hồ sơ đều vô nghĩa
    if (req.user.role === ROLES.DOCTOR && !req.user.doctorId) {
      throw new AppError(403, 'PROFILE_MISSING', 'Tài khoản bác sĩ chưa có hồ sơ');
    }
    if (req.user.role === ROLES.PATIENT && !req.user.patientId) {
      throw new AppError(403, 'PROFILE_MISSING', 'Tài khoản bệnh nhân chưa có hồ sơ');
    }
    next();
  };
}
