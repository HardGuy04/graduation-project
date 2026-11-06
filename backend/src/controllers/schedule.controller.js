// Bác sĩ thao tác trên lịch của CHÍNH MÌNH (doctorId lấy từ token); admin thao tác theo :doctorId trên URL.
import * as service from '../services/schedule.service.js';
import { body } from '../utils/validate.js';
import { ok, created, paginated, noContent } from '../utils/response.js';

// ── Công khai ──
export async function publicSchedules(req, res) {
  ok(res, await service.listSchedules(req.params.id, { activeOnly: true }));
}

export async function slots(req, res) {
  ok(res, await service.getSlots(req.params.id, req.query));
}

// ── Bác sĩ ──
export async function mySchedules(req, res) {
  ok(res, await service.listSchedules(req.user.doctorId));
}
export async function createMySchedule(req, res) {
  created(res, await service.createSchedule(req.user.doctorId, body(req)));
}
export async function updateMySchedule(req, res) {
  ok(res, await service.updateSchedule(req.user.doctorId, req.params.id, body(req)));
}
export async function deleteMySchedule(req, res) {
  await service.deleteSchedule(req.user.doctorId, req.params.id);
  noContent(res);
}
export async function myLeaves(req, res) {
  const r = await service.listLeaves(req.user.doctorId, req.query);
  paginated(res, r.rows, r);
}
export async function createMyLeave(req, res) {
  created(res, await service.createLeave(req.user.doctorId, body(req)));
}
export async function deleteMyLeave(req, res) {
  await service.deleteLeave(req.user.doctorId, req.params.id);
  noContent(res);
}

// ── Admin ──
export async function doctorSchedules(req, res) {
  ok(res, await service.listSchedules(req.params.doctorId));
}
export async function createDoctorSchedule(req, res) {
  created(res, await service.createSchedule(req.params.doctorId, body(req)));
}
export async function updateDoctorSchedule(req, res) {
  ok(res, await service.updateSchedule(req.params.doctorId, req.params.id, body(req)));
}
export async function deleteDoctorSchedule(req, res) {
  await service.deleteSchedule(req.params.doctorId, req.params.id);
  noContent(res);
}
export async function allLeaves(req, res) {
  const r = await service.listLeaves(null, req.query);
  paginated(res, r.rows, r);
}
export async function doctorLeaves(req, res) {
  const r = await service.listLeaves(req.params.doctorId, req.query);
  paginated(res, r.rows, r);
}
export async function createDoctorLeave(req, res) {
  created(res, await service.createLeave(req.params.doctorId, body(req), { allowPast: true }));
}
export async function deleteDoctorLeave(req, res) {
  await service.deleteLeave(req.params.doctorId, req.params.id, { allowPast: true });
  noContent(res);
}
