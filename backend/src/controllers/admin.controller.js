import * as service from '../services/admin.service.js';
import { body } from '../utils/validate.js';
import { ok, created, paginated, noContent } from '../utils/response.js';

export async function listUsers(req, res) {
  const r = await service.listUsers(req.query);
  paginated(res, r.rows, r);
}

export async function getUser(req, res) {
  ok(res, await service.getUser(req.params.id));
}

export async function createUser(req, res) {
  created(res, await service.createUser(body(req)));
}

export async function updateUser(req, res) {
  ok(res, await service.updateUser(req.params.id, body(req)));
}

export async function setStatus(req, res) {
  ok(res, await service.setStatus(req.user, req.params.id, body(req)));
}

export async function resetPassword(req, res) {
  await service.resetPassword(req.params.id, body(req));
  noContent(res);
}
