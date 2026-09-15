// Dùng chung cho việc xem/cập nhật hồ sơ cá nhân + ảnh đại diện của cả 3 vai trò.
// (Việc Admin quản lý/sửa thông tin bác sĩ khác qua CRUD vẫn dùng adminService riêng)
import { apiGetProfile, apiUpdateProfile } from "../mock/mockApi";

export const profileService = {
  getProfile: (userId) => apiGetProfile(userId),
  updateProfile: (userId, payload) => apiUpdateProfile(userId, payload),
};
