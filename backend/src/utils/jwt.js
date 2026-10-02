// ─────────────────────────────────────────────────────────────────────────────
// JWT utility — sign & verify access token và refresh token
// ─────────────────────────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Tạo access token
 * Payload thường chứa: { id, role }
 */
const signAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
};

/**
 * Verify access token
 * Trả về decoded payload hoặc throw error
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

/**
 * Tạo refresh token (thời hạn dài hơn)
 */
const signRefreshToken = (payload) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

module.exports = {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
};
