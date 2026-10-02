// ─────────────────────────────────────────────────────────────────────────────
// Chatbot routes — POST /api/chatbot/message
// ─────────────────────────────────────────────────────────────────────────────
const { Router } = require('express');
const authenticate = require('../middlewares/auth.middleware');

const router = Router();

// POST /api/chatbot/message (cần auth)
router.post('/message', authenticate, (req, res) => {
  // TODO: Phase sau — kết nối chatbot.controller.js → Ollama / AI_SERVICE
  res.json({
    success: true,
    message: 'Thành công',
    data: {
      reply: 'Chatbot đang trong quá trình phát triển. Vui lòng thử lại sau!',
      createdAt: new Date().toISOString(),
    },
  });
});

module.exports = router;
