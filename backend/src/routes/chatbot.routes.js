// ─────────────────────────────────────────────────────────────────────────────
// Chatbot routes — POST /api/chatbot/message
// Luồng: FE -> BE (route này) -> chatbot.controller -> chatbot.service -> AI_SERVICE (:8000)
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express';
import authenticate from '../middlewares/auth.middleware.js';
import { sendMessage } from '../controllers/chatbot.controller.js';

const router = Router();

// POST /api/chatbot/message (cần đăng nhập, mọi vai trò đều dùng được)
router.post('/message', authenticate, sendMessage);

export default router;