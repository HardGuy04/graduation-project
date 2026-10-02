// ─────────────────────────────────────────────────────────────────────────────
// Patient routes — /api/patient/*
// ─────────────────────────────────────────────────────────────────────────────
const { Router } = require('express');
const authenticate = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

const router = Router();

// Tất cả route patient cần auth + role patient
router.use(authenticate, requireRole('patient'));

// TODO: Phase 1+ — kết nối patient.controller.js
router.get('/dashboard', (req, res) => {
  res.json({ success: true, message: 'Patient dashboard placeholder' });
});

module.exports = router;
