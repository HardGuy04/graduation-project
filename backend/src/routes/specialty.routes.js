// ─────────────────────────────────────────────────────────────────────────────
// Specialty routes — GET /api/specialties (public)
// ─────────────────────────────────────────────────────────────────────────────
const { Router } = require('express');
const { ok, fail } = require('../utils/response');
const pool = require('../config/db');

const router = Router();

// GET /api/specialties — danh sách chuyên khoa (public, không cần auth)
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, COUNT(d.id) AS doctorCount
      FROM specialty s
      LEFT JOIN doctor d ON d.specialty_id = s.id
        AND d.user_id IN (SELECT id FROM users WHERE status = 'active' AND role = 'doctor')
      GROUP BY s.id
      ORDER BY s.id
    `);
    return ok(res, rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
