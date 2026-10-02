// ─────────────────────────────────────────────────────────────────────────────
// Doctor routes — /api/doctor/*
// ─────────────────────────────────────────────────────────────────────────────
const { Router } = require('express');
const authenticate = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

const router = Router();

// Tất cả route doctor cần auth + role doctor
router.use(authenticate, requireRole('doctor'));

// TODO: Phase 1+ — kết nối doctor.controller.js
router.get('/dashboard', (req, res) => {
  res.json({ success: true, message: 'Doctor dashboard placeholder' });
});

module.exports = router;
