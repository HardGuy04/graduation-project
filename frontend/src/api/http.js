// Axios + Bearer + xoay vòng refresh token. Lỗi backend { error: { message } } → Error.message cho toast.
import axios from "axios";
import { TOKEN_KEY, REFRESH_KEY } from "../utils/constants";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export class ApiError extends Error {
  constructor(message, status = 400, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const http = axios.create({ baseURL: API_BASE, timeout: 20_000 });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) throw new ApiError("Phiên đăng nhập đã hết hạn", 401, "NO_REFRESH");
  const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
  const tokens = data.data;
  localStorage.setItem(TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  return tokens.accessToken;
}

http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const status = err.response?.status;
    const body = err.response?.data?.error;
    if (status === 401 && body?.code === "TOKEN_EXPIRED" && !original._retry && !original.url?.includes("/auth/refresh")) {
      original._retry = true;
      try {
        refreshing = refreshing || refreshAccessToken().finally(() => { refreshing = null; });
        const token = await refreshing;
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
      }
    }
    const message = body?.message || err.message || "Không kết nối được máy chủ";
    throw new ApiError(message, status || 0, body?.code);
  }
);

export const unwrap = (res) => ({ success: true, data: res.data.data, pagination: res.data.pagination });

export default http;
