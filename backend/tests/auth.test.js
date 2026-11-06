// Kiểm thử Auth: node --test tests/auth.test.js (server phải đang chạy)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, testEmail, registerPatient, login } from './helpers.js';

let p; // bệnh nhân test chính

test('đăng ký bệnh nhân → 201, có token, không lộ password_hash', async () => {
  p = await registerPatient('auth', { gender: 'female', dateOfBirth: '1995-04-01', address: 'Hà Nội' });
  assert.equal(p.user.role, 'PATIENT');
  assert.ok(p.user.patient.id);
  assert.ok(p.accessToken && p.refreshToken);
  assert.equal(JSON.stringify(p.user).toLowerCase().includes('password'), false);
});

test('đăng ký trùng email → 409 EMAIL_TAKEN', async () => {
  const r = await api('POST', '/api/auth/register', {
    body: { fullName: 'Dup', email: p.email, password: 'Test@12345' },
  });
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'EMAIL_TAKEN');
});

test('đăng ký thiếu họ tên → 400', async () => {
  const r = await api('POST', '/api/auth/register', { body: { email: testEmail('noname'), password: 'Test@12345' } });
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'INVALID_INPUT');
});

test('sai mật khẩu và sai email trả cùng một thông báo 401', async () => {
  const a = await api('POST', '/api/auth/login', { body: { email: p.email, password: 'sai-mat-khau' } });
  const b = await api('POST', '/api/auth/login', { body: { email: testEmail('khongton'), password: 'x' } });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.deepEqual(a.body, b.body);
});

test('GET /me: không token → 401, có token → 200', async () => {
  assert.equal((await api('GET', '/api/auth/me')).status, 401);
  assert.equal((await api('GET', '/api/auth/me', { token: 'abc.def.ghi' })).status, 401);
  const r = await api('GET', '/api/auth/me', { token: p.accessToken });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.email, p.email);
  assert.equal(r.body.data.patient.gender, 'FEMALE');
});

test('PATCH /me cập nhật hồ sơ; avatar base64 bị từ chối', async () => {
  const r = await api('PATCH', '/api/auth/me', { token: p.accessToken, body: { address: 'Cầu Giấy', fullName: 'Test Updated' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.patient.address, 'Cầu Giấy');
  const bad = await api('PATCH', '/api/auth/me', { token: p.accessToken, body: { avatarUrl: 'data:image/png;base64,AAAA' } });
  assert.equal(bad.status, 400);
});

test('refresh xoay vòng; dùng lại token cũ → 401 và thu hồi cả family', async () => {
  const r1 = await api('POST', '/api/auth/refresh', { body: { refreshToken: p.refreshToken } });
  assert.equal(r1.status, 200);
  const newer = r1.body.data.refreshToken;
  assert.notEqual(newer, p.refreshToken);

  const reuse = await api('POST', '/api/auth/refresh', { body: { refreshToken: p.refreshToken } });
  assert.equal(reuse.status, 401);
  assert.equal(reuse.body.error.code, 'REFRESH_TOKEN_REUSED');

  // Token mới cùng family cũng phải bị thu hồi
  const after = await api('POST', '/api/auth/refresh', { body: { refreshToken: newer } });
  assert.equal(after.status, 401);
});

test('2 request refresh đồng thời cùng token → đúng 1 thành công', async () => {
  const s = await login(p.email, 'Test@12345');
  const rs = await Promise.all([1, 2].map(() => api('POST', '/api/auth/refresh', { body: { refreshToken: s.refreshToken } })));
  assert.deepEqual(rs.map((r) => r.status).sort(), [200, 401]);
});

test('đổi mật khẩu: sai mật khẩu cũ → 400; đúng → 200 và thu hồi refresh token cũ', async () => {
  const s = await login(p.email, 'Test@12345');
  const wrong = await api('POST', '/api/auth/change-password', {
    token: s.accessToken, body: { oldPassword: 'sai', newPassword: 'Moi@12345' },
  });
  assert.equal(wrong.status, 400);

  const r = await api('POST', '/api/auth/change-password', {
    token: s.accessToken, body: { oldPassword: 'Test@12345', newPassword: 'Moi@12345' },
  });
  assert.equal(r.status, 200);
  assert.ok(r.body.data.refreshToken);

  const old = await api('POST', '/api/auth/refresh', { body: { refreshToken: s.refreshToken } });
  assert.equal(old.status, 401);
  const fresh = await api('POST', '/api/auth/refresh', { body: { refreshToken: r.body.data.refreshToken } });
  assert.equal(fresh.status, 200);
  await login(p.email, 'Moi@12345');
});

test('logout → 204, refresh sau đó → 401', async () => {
  const s = await login(p.email, 'Moi@12345');
  assert.equal((await api('POST', '/api/auth/logout', { body: { refreshToken: s.refreshToken } })).status, 204);
  assert.equal((await api('POST', '/api/auth/refresh', { body: { refreshToken: s.refreshToken } })).status, 401);
});

test('sai mật khẩu 5 lần → lần thứ 6 bị chặn 429 kể cả khi đúng mật khẩu', async () => {
  const q = await registerPatient('ratelimit');
  for (let i = 0; i < 5; i += 1) {
    const r = await api('POST', '/api/auth/login', { body: { email: q.email, password: 'sai' } });
    assert.equal(r.status, 401);
  }
  const blocked = await api('POST', '/api/auth/login', { body: { email: q.email, password: q.password } });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.error.code, 'TOO_MANY_ATTEMPTS');
});
