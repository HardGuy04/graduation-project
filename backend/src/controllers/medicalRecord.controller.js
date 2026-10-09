import * as service from '../services/medicalRecord.service.js';
import { getForDoctor } from '../services/patient.service.js';
import { body } from '../utils/validate.js';
import { ok, created, paginated } from '../utils/response.js';

// ── Bác sĩ ──
export async function create(req, res) {
  created(res, await service.create(req.user, body(req)));
}

export async function update(req, res) {
  ok(res, await service.update(req.user, req.params.id, body(req)));
}

export async function setPrescription(req, res) {
  ok(res, await service.setPrescription(req.user, req.params.id, body(req)));
}

/** Lịch sử bệnh án của một bệnh nhân (mọi bác sĩ) — chỉ khi bệnh nhân đó có lịch với bác sĩ đang gọi. */
export async function patientHistory(req, res) {
  const patient = await getForDoctor(req.user.doctorId, req.params.id);
  const r = await service.list(req.user, req.query, { patientId: patient.id });
  paginated(res, r.rows, r);
}

// ── Dùng chung (phạm vi đọc do service quyết định theo vai trò) ──
export async function list(req, res) {
  const r = await service.list(req.user, req.query);
  paginated(res, r.rows, r);
}

export async function get(req, res) {
  ok(res, await service.get(req.user, req.params.id));
}
