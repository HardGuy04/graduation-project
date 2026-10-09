// Access token: JWT ngắn hạn. Refresh token: chuỗi ngẫu nhiên, DB chỉ giữ SHA-256 nên lộ DB cũng không dùng được token.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

const ALGORITHM = 'HS256';

export function signAccessToken({ userId, role }) {
  return jwt.sign({ role }, env.JWT_SECRET, {
    subject: String(userId),
    expiresIn: env.ACCESS_TOKEN_TTL,
    algorithm: ALGORITHM,
  });
}

/** Ném lỗi của jsonwebtoken nếu token sai/hết hạn; middleware sẽ quy về 401. */
export function verifyAccessToken(token) {
  // Cố định thuật toán để chặn tấn công đổi "alg" trong header
  return jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
}

/** Thời gian sống (giây) của access token, trả cho client để biết khi nào cần refresh. */
let ttlSeconds;
export function accessTokenTtlSeconds() {
  // ACCESS_TOKEN_TTL có thể là '15m', '1h'... — để jsonwebtoken tự quy đổi cho thống nhất
  if (ttlSeconds === undefined) {
    const { exp, iat } = jwt.decode(signAccessToken({ userId: 0, role: 'X' }));
    ttlSeconds = exp - iat;
  }
  return ttlSeconds;
}

export const generateRefreshToken = () => crypto.randomBytes(32).toString('base64url');

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const newFamilyId = () => crypto.randomUUID();
