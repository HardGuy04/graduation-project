import * as service from '../services/stats.service.js';
import { ok } from '../utils/response.js';

export async function overview(_req, res) {
  ok(res, await service.overview());
}

export async function visits(req, res) {
  ok(res, await service.visits(req.query));
}

export async function byDoctor(req, res) {
  ok(res, await service.byDoctor(req.query));
}

export async function bySpecialty(req, res) {
  ok(res, await service.bySpecialty(req.query));
}

export async function revenue(req, res) {
  ok(res, await service.revenue(req.query));
}

export async function cancellation(req, res) {
  ok(res, await service.cancellation(req.query));
}
