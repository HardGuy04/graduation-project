import * as service from '../services/patient.service.js';
import * as notification from '../services/notification.service.js';
import { ok, paginated, noContent } from '../utils/response.js';

// ── Bệnh nhân: thông báo của tôi ──
export async function myNotifications(req, res) {
  const r = await notification.list(req.user.patientId, req.query);
  paginated(res, r.rows, r);
}

export async function myUnreadCount(req, res) {
  ok(res, await notification.unreadCount(req.user.patientId));
}

export async function markNotificationRead(req, res) {
  await notification.markRead(req.user.patientId, req.params.id);
  noContent(res);
}

export async function markAllNotificationsRead(req, res) {
  ok(res, await notification.markAllRead(req.user.patientId));
}

// ── Admin ──
export async function listAdmin(req, res) {
  const r = await service.listAdmin(req.query);
  paginated(res, r.rows, r);
}

export async function getAdmin(req, res) {
  ok(res, await service.getAdmin(req.params.id));
}

// ── Bác sĩ: bệnh nhân của tôi ──
export async function listForDoctor(req, res) {
  const r = await service.listForDoctor(req.user.doctorId, req.query);
  paginated(res, r.rows, r);
}

export async function getForDoctor(req, res) {
  ok(res, await service.getForDoctor(req.user.doctorId, req.params.id));
}
