import * as service from '../services/specialty.service.js';
import { body } from '../utils/validate.js';
import { ok, created, paginated, noContent } from '../utils/response.js';

export async function list(req, res) {
  const r = await service.list(req.query);
  paginated(res, r.rows, r);
}

export async function get(req, res) {
  ok(res, await service.get(req.params.id));
}

export async function create(req, res) {
  created(res, await service.create(body(req)));
}

export async function update(req, res) {
  ok(res, await service.update(req.params.id, body(req)));
}

export async function remove(req, res) {
  await service.remove(req.params.id);
  noContent(res);
}
