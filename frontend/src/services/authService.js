import http, { unwrap } from "../api/http";
import { toUiUser } from "../api/adapters";
import { TOKEN_KEY, REFRESH_KEY } from "../utils/constants";

function session(data) {
  return {
    token: data.accessToken,
    refreshToken: data.refreshToken,
    user: toUiUser(data.user),
  };
}

export const authService = {
  async login(email, password) {
    const res = unwrap(await http.post("/auth/login", { email, password }));
    return { success: true, data: session(res.data) };
  },
  async register(payload) {
    const res = unwrap(await http.post("/auth/register", payload));
    return { success: true, data: session(res.data) };
  },
  async changePassword({ oldPassword, newPassword }) {
    const res = unwrap(await http.post("/auth/change-password", { oldPassword, newPassword }));
    if (res.data?.accessToken) {
      localStorage.setItem(TOKEN_KEY, res.data.accessToken);
      localStorage.setItem(REFRESH_KEY, res.data.refreshToken);
    }
    return { success: true, data: res.data ? session(res.data) : null };
  },
  async me() {
    const res = unwrap(await http.get("/auth/me"));
    return { success: true, data: toUiUser(res.data) };
  },
  logout(refreshToken) {
    return http.post("/auth/logout", { refreshToken }).catch(() => {});
  },
};
