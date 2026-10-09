import * as service from '../services/doctor.service.js';
import { body } from '../utils/validate.js';
import { ok, paginated } from '../utils/response.js';

// ── Công khai (bệnh nhân xem khi đặt lịch) ──
export async function listPublic(req, res) {
  const r = await service.listPublic(req.query);
  paginated(res, r.rows, r);
}

export async function getPublic(req, res) {
  ok(res, await service.getPublic(req.params.id));
}

// ── Admin ──
export async function listAdmin(req, res) {
  const r = await service.listAdmin(req.query);
  paginated(res, r.rows, r);
}

export async function getAdmin(req, res) {
  ok(res, await service.getAdmin(req.params.id));
}

export async function updateByAdmin(req, res) {
  ok(res, await service.updateByAdmin(req.params.id, body(req)));
}
