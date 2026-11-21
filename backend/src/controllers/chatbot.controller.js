import { askAI } from '../services/chatbot.service.js';

export async function sendMessage(req, res) {
  const message = (req.body?.message || '').trim();
  if (!message) {
    return res.status(400).json({
      success: false,
      error: { code: 'EMPTY_MESSAGE', message: 'Vui lòng nhập câu hỏi' },
    });
  }

  // Danh tính lấy từ token, không tin dữ liệu client gửi lên
  const userId = req.user?.id;
  const role = String(req.user?.role || 'patient').toLowerCase();

  try {
    const ai = await askAI({ message, role, userId });
    res.json({
      success: true,
      message: 'Thành công',
      data: { reply: ai.reply, createdAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error('[chatbot]', err.message);
    res.status(502).json({
      success: false,
      error: { code: 'AI_SERVICE_UNAVAILABLE', message: 'Trợ lý ảo đang bận, vui lòng thử lại sau' },
    });
  }
}