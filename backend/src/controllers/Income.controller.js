import * as service from '../services/Income.service.js';
import { body } from '../utils/validate.js';
import { ok, paginated } from '../utils/response.js';

// ── Admin ──
export async function listByMonth(req, res) {
  const r = await service.listByMonth(req.query);
  paginated(res, r.rows, r);
}

export async function upsert(req, res) {
  ok(res, await service.upsert(req.params.doctorId, req.params.month, body(req)));
}

// ── Bác sĩ ──
export async function listMine(req, res) {
  const r = await service.listMine(req.user.doctorId, req.query);
  paginated(res, r.rows, r);
}
