// ─────────────────────────────────────────────────────────────────────────────
// OpenAI / Ollama config — dùng cho chatbot và AI gợi ý bệnh
// ─────────────────────────────────────────────────────────────────────────────
const axios = require('axios');
const env = require('./env');

// Tạo axios instance gọi tới AI_SERVICE (Flask/FastAPI chạy trên :8000)
const aiClient = axios.create({
  baseURL: env.AI_SERVICE_URL,
  timeout: 30000, // AI model có thể mất thời gian trả lời
  headers: { 'Content-Type': 'application/json' },
});

// Tạo axios instance gọi Ollama local (nếu có)
const ollamaClient = axios.create({
  baseURL: env.OLLAMA_BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

module.exports = { aiClient, ollamaClient };
