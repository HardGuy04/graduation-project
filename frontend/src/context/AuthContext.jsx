import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { TOKEN_KEY, REFRESH_KEY, USER_KEY } from "../utils/constants";

const AuthContext = createContext(null);

function persist(user, tokens) {
  localStorage.setItem(TOKEN_KEY, tokens.token);
  if (tokens.refreshToken) localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const rawUser = localStorage.getItem(USER_KEY);
        if (!token || !rawUser) return;
        setUser(JSON.parse(rawUser));
        try {
          const res = await authService.me();
          localStorage.setItem(USER_KEY, JSON.stringify(res.data));
          setUser(res.data);
        } catch {
          // token hết hạn: interceptor sẽ refresh; nếu vẫn lỗi thì giữ user local đến khi gọi API thất bại
        }
      } catch {
        // ignore corrupted storage
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  async function login(email, password) {
    const res = await authService.login(email, password);
    persist(res.data.user, res.data);
    setUser(res.data.user);
    return res.data.user;
  }

  async function register(payload) {
    const res = await authService.register(payload);
    persist(res.data.user, res.data);
    setUser(res.data.user);
    return res.data.user;
  }

  function updateLocalUser(patch) {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }

  function logout() {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    authService.logout(refreshToken);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, initializing, login, register, logout, updateLocalUser }),
    [user, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
