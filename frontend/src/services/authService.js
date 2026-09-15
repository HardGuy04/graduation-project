// Lớp service này mô phỏng lời gọi tới `/api/auth/*`.
// Khi kết nối Back-end thật, chỉ cần thay các hàm bên dưới bằng axios.post(...)
import { apiLogin, apiRegister, apiChangePassword } from "../mock/mockApi";

export const authService = {
  login: (email, password) => apiLogin({ email, password }),
  register: (payload) => apiRegister(payload),
  changePassword: (payload) => apiChangePassword(payload),
};
