import * as authService from '../services/auth.service.js';
import { body } from '../utils/validate.js';
import { ok, created, noContent } from '../utils/response.js';
import AppError from '../utils/AppError.js';

export async function register(req, res) {
  created(res, await authService.register(body(req)));
}

export async function login(req, res) {
  ok(res, await authService.login(body(req), req.ip));
}

export async function refresh(req, res) {
  ok(res, await authService.refresh(body(req)));
}

export async function logout(req, res) {
  await authService.logout(body(req));
  noContent(res);
}

export async function getMe(req, res) {
  const user = await authService.getUserProfile(req.user.id);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản');
  ok(res, user);
}

export async function updateMe(req, res) {
  ok(res, await authService.updateMe(req.user, body(req)));
}

export async function changePassword(req, res) {
  ok(res, await authService.changePassword(req.user, body(req)));
}
