// ─────────────────────────────────────────────────────────────────────────────
// Admin routes — /api/admin/*
// ─────────────────────────────────────────────────────────────────────────────
const { Router } = require('express');
const authenticate = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

const router = Router();

// Tất cả route admin cần auth + role admin
router.use(authenticate, requireRole('admin'));

// TODO: Phase 1+ — kết nối admin.controller.js
router.get('/dashboard', (req, res) => {
  res.json({ success: true, message: 'Admin dashboard placeholder' });
});

module.exports = router;
