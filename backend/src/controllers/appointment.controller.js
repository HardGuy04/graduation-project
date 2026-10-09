import * as service from '../services/appointment.service.js';
import { body } from '../utils/validate.js';
import { ok, created, paginated } from '../utils/response.js';

export async function list(req, res) {
  const r = await service.list(req.user, req.query);
  paginated(res, r.rows, r);
}

export async function get(req, res) {
  ok(res, await service.get(req.user, req.params.id));
}

export async function create(req, res) {
  created(res, await service.create(req.user, body(req)));
}

export async function cancel(req, res) {
  ok(res, await service.cancel(req.user, req.params.id, body(req)));
}

export async function confirm(req, res) {
  ok(res, await service.confirm(req.user, req.params.id));
}

export async function checkIn(req, res) {
  ok(res, await service.checkIn(req.user, req.params.id));
}

export async function noShow(req, res) {
  ok(res, await service.noShow(req.user, req.params.id));
}

export async function changeRoom(req, res) {
  ok(res, await service.changeRoom(req.user, req.params.id, body(req)));
}
