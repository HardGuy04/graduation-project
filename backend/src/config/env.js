// ─────────────────────────────────────────────────────────────────────────────
// Config env loader — đọc biến môi trường từ .env và export dạng object
// ─────────────────────────────────────────────────────────────────────────────
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // MySQL
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 3306,
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'clinic',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'default_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // CORS
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // Upload
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',

  // AI Service
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',

  // OpenAI / Ollama
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
};
