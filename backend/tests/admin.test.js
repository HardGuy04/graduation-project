// Kiểm thử danh mục & quản trị: node --test tests/admin.test.js (cần `npm run seed` trước)
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { api, RUN, testEmail, registerPatient, seedLogin, login } from './helpers.js';

let admin; let doctorSeed; let patient;
let specialtyId; let newDoctor; let roomId;

before(async () => {
  admin = await seedLogin('admin');
  doctorSeed = await seedLogin('doctor1');
  patient = await registerPatient('admin-suite');
});

test('phân quyền: PATIENT/DOCTOR gọi API admin → 403, không token → 401', async () => {
  assert.equal((await api('GET', '/api/admin/users')).status, 401);
  const p = await api('GET', '/api/admin/users', { token: patient.accessToken });
  assert.equal(p.status, 403);
  assert.equal(p.body.error.code, 'FORBIDDEN');
  assert.equal((await api('GET', '/api/admin/users', { token: doctorSeed.accessToken })).status, 403);
});

test('chuyên khoa: tạo 201, trùng tên 409, sửa 200, xem công khai', async () => {
  const name = `TEST-Khoa-${RUN}`;
  const r = await api('POST', '/api/admin/specialties', { token: admin.accessToken, body: { name, description: 'x' } });
  assert.equal(r.status, 201);
  specialtyId = r.body.data.id;
  const dup = await api('POST', '/api/admin/specialties', { token: admin.accessToken, body: { name } });
  assert.equal(dup.status, 409);
  const u = await api('PATCH', `/api/admin/specialties/${specialtyId}`, { token: admin.accessToken, body: { description: 'Mô tả mới' } });
  assert.equal(u.status, 200);
  assert.equal(u.body.data.description, 'Mô tả mới');
  const pub = await api('GET', `/api/specialties/${specialtyId}`);
  assert.equal(pub.status, 200);
  assert.equal(pub.body.data.doctorCount, 0);
});

test('admin tạo tài khoản bác sĩ; chuyên khoa không tồn tại → 400', async () => {
  const bad = await api('POST', '/api/admin/users', {
    token: admin.accessToken,
    body: { role: 'DOCTOR', email: testEmail('doc-bad'), fullName: 'X', password: 'Test@12345', specialtyId: 999999 },
  });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, 'SPECIALTY_NOT_FOUND');

  const r = await api('POST', '/api/admin/users', {
    token: admin.accessToken,
    body: {
      role: 'DOCTOR', email: testEmail('doc'), fullName: 'TEST Bác sĩ Mới', password: 'Test@12345',
      phone: '0911222333', specialtyId, experience: 7, degree: 'Thạc sĩ',
    },
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.role, 'DOCTOR');
  newDoctor = { email: testEmail('doc'), id: r.body.data.doctor.id, userId: r.body.data.id };
});

test('danh sách bác sĩ công khai: lọc theo chuyên khoa, không lộ email/SĐT', async () => {
  const r = await api('GET', `/api/doctors?specialtyId=${specialtyId}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.pagination.total, 1);
  assert.equal(r.body.data[0].id, newDoctor.id);
  assert.equal(r.body.data[0].email, undefined);
  assert.equal(r.body.data[0].phone, undefined);
});

test('khóa tài khoản: đăng nhập → 403, token đang có mất hiệu lực, ẩn khỏi danh sách công khai', async () => {
  const s = await login(newDoctor.email, 'Test@12345');
  const lock = await api('PATCH', `/api/admin/users/${newDoctor.userId}/status`, { token: admin.accessToken, body: { status: 'LOCKED' } });
  assert.equal(lock.status, 200);
  assert.equal(lock.body.data.status, 'LOCKED');

  const l = await api('POST', '/api/auth/login', { body: { email: newDoctor.email, password: 'Test@12345' } });
  assert.equal(l.status, 403);
  assert.equal((await api('GET', '/api/auth/me', { token: s.accessToken })).status, 403);
  assert.equal((await api('POST', '/api/auth/refresh', { body: { refreshToken: s.refreshToken } })).status, 401);
  assert.equal((await api('GET', `/api/doctors/${newDoctor.id}`)).status, 404);

  const unlock = await api('PATCH', `/api/admin/users/${newDoctor.userId}/status`, { token: admin.accessToken, body: { status: 'ACTIVE' } });
  assert.equal(unlock.status, 200);
  assert.equal((await api('GET', `/api/doctors/${newDoctor.id}`)).status, 200);
});

test('admin không tự khóa chính mình → 400', async () => {
  const r = await api('PATCH', `/api/admin/users/${admin.user.id}/status`, { token: admin.accessToken, body: { status: 'LOCKED' } });
  assert.equal(r.status, 400);
});

test('admin sửa hồ sơ bác sĩ', async () => {
  const r = await api('PATCH', `/api/admin/doctors/${newDoctor.id}`, { token: admin.accessToken, body: { experience: 9, degree: 'Tiến sĩ' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.experience, 9);
  assert.equal(r.body.data.email, newDoctor.email);
});

test('admin tạo bệnh nhân (có ví 0đ) và xem hồ sơ bệnh nhân', async () => {
  const r = await api('POST', '/api/admin/users', {
    token: admin.accessToken,
    body: { role: 'PATIENT', email: testEmail('pat-by-admin'), fullName: 'TEST BN tại quầy', password: 'Test@12345', gender: 'male' },
  });
  assert.equal(r.status, 201);
  const d = await api('GET', `/api/admin/patients/${r.body.data.patient.id}`, { token: admin.accessToken });
  assert.equal(d.status, 200);
  assert.equal(d.body.data.walletBalance, '0.00');
  assert.equal(d.body.data.gender, 'MALE');
});

test('phân trang + id sai định dạng → 400, không tồn tại → 404', async () => {
  const r = await api('GET', '/api/admin/users?limit=2&page=1', { token: admin.accessToken });
  assert.equal(r.status, 200);
  assert.ok(r.body.data.length <= 2);
  assert.ok(r.body.pagination.total >= 3);
  assert.equal((await api('GET', '/api/admin/users?limit=500', { token: admin.accessToken })).status, 400);
  assert.equal((await api('GET', '/api/admin/doctors/abc', { token: admin.accessToken })).status, 400);
  assert.equal((await api('GET', '/api/admin/doctors/999999', { token: admin.accessToken })).status, 404);
});

test('phòng: tạo, trùng tên, phòng trống, bảo trì, xóa', async () => {
  const name = `TEST-Room-${RUN}`;
  const r = await api('POST', '/api/admin/rooms', { token: admin.accessToken, body: { name } });
  assert.equal(r.status, 201);
  roomId = r.body.data.id;
  assert.equal((await api('POST', '/api/admin/rooms', { token: admin.accessToken, body: { name } })).status, 409);

  const qs = '?startAt=2030-01-07T02:00:00Z&endAt=2030-01-07T02:30:00Z';
  let av = await api('GET', `/api/admin/rooms/available${qs}`, { token: admin.accessToken });
  assert.equal(av.status, 200);
  assert.ok(av.body.data.some((x) => x.id === roomId));

  await api('PATCH', `/api/admin/rooms/${roomId}`, { token: admin.accessToken, body: { status: 'maintenance' } });
  av = await api('GET', `/api/admin/rooms/available${qs}`, { token: admin.accessToken });
  assert.ok(!av.body.data.some((x) => x.id === roomId));

  assert.equal((await api('DELETE', `/api/admin/rooms/${roomId}`, { token: admin.accessToken })).status, 204);
  assert.equal((await api('GET', `/api/admin/rooms/${roomId}`, { token: admin.accessToken })).status, 404);
});

test('xóa chuyên khoa đang có bác sĩ → 409; chuyên khoa trống → 204', async () => {
  const r = await api('DELETE', `/api/admin/specialties/${specialtyId}`, { token: admin.accessToken });
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'SPECIALTY_IN_USE');
  const empty = await api('POST', '/api/admin/specialties', { token: admin.accessToken, body: { name: `TEST-Empty-${RUN}` } });
  assert.equal((await api('DELETE', `/api/admin/specialties/${empty.body.data.id}`, { token: admin.accessToken })).status, 204);
});

test('admin đặt lại mật khẩu → phiên cũ bị thu hồi, đăng nhập bằng mật khẩu mới', async () => {
  const s = await login(newDoctor.email, 'Test@12345');
  const r = await api('POST', `/api/admin/users/${newDoctor.userId}/reset-password`, { token: admin.accessToken, body: { newPassword: 'Reset@123' } });
  assert.equal(r.status, 204);
  assert.equal((await api('POST', '/api/auth/refresh', { body: { refreshToken: s.refreshToken } })).status, 401);
  await login(newDoctor.email, 'Reset@123');
});
