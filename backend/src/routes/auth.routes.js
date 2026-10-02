// ─────────────────────────────────────────────────────────────────────────────
// Auth routes — POST /api/auth/login, /register, /change-password
// ─────────────────────────────────────────────────────────────────────────────
const { Router } = require('express');
const authenticate = require('../middlewares/auth.middleware');

const router = Router();

// TODO: Phase 1 — kết nối auth.controller.js
// POST /api/auth/login
router.post('/login', (req, res) => {
  res.json({ success: true, message: 'Auth route placeholder — sẽ triển khai ở Phase 1' });
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  res.json({ success: true, message: 'Register route placeholder' });
});

// POST /api/auth/change-password (cần đăng nhập)
router.post('/change-password', authenticate, (req, res) => {
  res.json({ success: true, message: 'Change password route placeholder' });
});

module.exports = router;
