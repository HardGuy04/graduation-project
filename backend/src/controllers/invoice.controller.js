// Admin thao tác mọi hóa đơn/ví; bệnh nhân chỉ hóa đơn và ví của mình (patientId lấy từ token).
import * as service from '../services/invoice.service.js';
import * as payment from '../services/payment.service.js';
import { body } from '../utils/validate.js';
import { ok, created, paginated } from '../utils/response.js';

// ── Dùng chung: phạm vi do service giới hạn theo vai trò ──
export async function list(req, res) {
  const r = await service.list(req.user, req.query);
  paginated(res, r.rows, r);
}

export async function get(req, res) {
  ok(res, await service.get(req.user, req.params.id));
}

// ── Admin ──
export async function create(req, res) {
  created(res, await service.create(body(req)));
}

export async function payOffline(req, res) {
  ok(res, await service.payOffline(req.params.id, body(req)));
}

export async function patientWallet(req, res) {
  ok(res, await service.getWallet(req.params.id));
}

export async function patientWalletTransactions(req, res) {
  const r = await service.listWalletTransactions(req.params.id, req.query);
  paginated(res, r.rows, r);
}

export async function topupForPatient(req, res) {
  created(res, await service.topup(req.params.id, body(req)));
}

// ── Bệnh nhân ──
export async function payWithWallet(req, res) {
  ok(res, await service.payWithWallet(req.user, req.params.id));
}

export async function myWallet(req, res) {
  ok(res, await service.getWallet(req.user.patientId));
}

export async function myWalletTransactions(req, res) {
  const r = await service.listWalletTransactions(req.user.patientId, req.query);
  paginated(res, r.rows, r);
}

export async function myTopup(req, res) {
  const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  created(res, await payment.patientTopup(req.user.patientId, body(req), { ip }));
}
