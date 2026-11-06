import env from '../config/env.js';

export async function askAI({ message, role, userId }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000); // chờ tối đa 10 giây
  try {
    const r = await fetch(`${env.AI_SERVICE_URL}/internal/chatbot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, role, userId }),
      signal: controller.signal,
    });
    if (!r.ok) throw new Error(`AI_SERVICE trả về HTTP ${r.status}`);
    return await r.json(); // { reply, intent, confidence, source }
  } finally {
    clearTimeout(timer);
  }
}
