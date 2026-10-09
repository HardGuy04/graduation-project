// Kiểm thử lịch làm việc, ngày nghỉ, khung giờ trống: node --test tests/schedule.test.js (cần `npm run seed` trước)
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { api, registerPatient, seedLogin, createTestDoctor, clinicDate } from './helpers.js';

let admin; let doc; let otherDoc; let patient;
let morningId; let afternoonId;
const day = clinicDate(8); // ngày làm việc dùng trong test (tương lai, cùng thứ với ca tạo ra)
const leaveDay = clinicDate(9);

before(async () => {
  admin = await seedLogin('admin');
  otherDoc = await seedLogin('doctor1');
  doc = await createTestDoctor(admin.accessToken, 'sched-doc');
  patient = await registerPatient('sched-patient');
});

test('bác sĩ tạo ca làm việc; chồng lấn / sai giờ bị từ chối', async () => {
  const t = doc.accessToken;
  const r = await api('POST', '/api/doctor/schedules', {
    token: t, body: { dayOfWeek: day.dow, startTime: '08:00', endTime: '12:00', slotDuration: 30, maxPatient: 20 },
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.deepEqual(
    { s: r.body.data.startTime, e: r.body.data.endTime, st: r.body.data.status },
    { s: '08:00', e: '12:00', st: 'ACTIVE' },
  );
  morningId = r.body.data.id;

  const overlap = await api('POST', '/api/doctor/schedules', {
    token: t, body: { dayOfWeek: day.dow, startTime: '11:30', endTime: '13:00', slotDuration: 30 },
  });
  assert.equal(overlap.status, 409);
  assert.equal(overlap.body.error.code, 'SCHEDULE_OVERLAP');

  const sameStart = await api('POST', '/api/doctor/schedules', {
    token: t, body: { dayOfWeek: day.dow, startTime: '08:00', endTime: '09:00', slotDuration: 30 },
  });
  assert.equal(sameStart.status, 409);

  const reversed = await api('POST', '/api/doctor/schedules', {
    token: t, body: { dayOfWeek: day.dow, startTime: '15:00', endTime: '14:00', slotDuration: 30 },
  });
  assert.equal(reversed.status, 400);
  const tooShort = await api('POST', '/api/doctor/schedules', {
    token: t, body: { dayOfWeek: day.dow, startTime: '14:00', endTime: '14:20', slotDuration: 30 },
  });
  assert.equal(tooShort.status, 400);
  const badDow = await api('POST', '/api/doctor/schedules', {
    token: t, body: { dayOfWeek: 8, startTime: '14:00', endTime: '15:00', slotDuration: 30 },
  });
  assert.equal(badDow.status, 400);

  // Ca liền kề (bắt đầu đúng lúc ca sáng kết thúc) là hợp lệ
  const adjacent = await api('POST', '/api/doctor/schedules', {
    token: t, body: { dayOfWeek: day.dow, startTime: '12:00', endTime: '13:00', slotDuration: 60, maxPatient: 1 },
  });
  assert.equal(adjacent.status, 201);
  afternoonId = adjacent.body.data.id;
});

test('phân quyền: bệnh nhân không vào được /api/doctor; bác sĩ khác không sửa/xóa được ca → 404', async () => {
  assert.equal((await api('GET', '/api/doctor/schedules', { token: patient.accessToken })).status, 403);
  const p = await api('PATCH', `/api/doctor/schedules/${morningId}`, { token: otherDoc.accessToken, body: { maxPatient: 1 } });
  assert.equal(p.status, 404);
  const d = await api('DELETE', `/api/doctor/schedules/${morningId}`, { token: otherDoc.accessToken });
  assert.equal(d.status, 404);
  const mine = await api('GET', '/api/doctor/schedules', { token: doc.accessToken });
  assert.equal(mine.body.data.length, 2);
});

test('khung giờ trống: chia theo slotDuration, giờ UTC đúng múi +07:00', async () => {
  const r = await api('GET', `/api/doctors/${doc.id}/slots?date=${day.date}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.data.onLeave, false);
  assert.equal(r.body.data.shifts.length, 2);
  assert.equal(r.body.data.slots.length, 8 + 1);
  const first = r.body.data.slots[0];
  assert.equal(first.startAt, `${day.date}T01:00:00.000Z`);
  assert.equal(first.startTime, '08:00');
  assert.equal(r.body.data.slots.at(-1).endTime, '13:00');

  const otherDay = clinicDate(10);
  const none = await api('GET', `/api/doctors/${doc.id}/slots?date=${otherDay.date}`);
  assert.equal(none.status, 200);
  assert.equal(none.body.data.slots.length, 0);

  assert.equal((await api('GET', `/api/doctors/${doc.id}/slots?date=2026-02-30`)).status, 400);
  assert.equal((await api('GET', `/api/doctors/${doc.id}/slots`)).status, 400);
  assert.equal((await api('GET', `/api/doctors/999999/slots?date=${day.date}`)).status, 404);
});

test('ca INACTIVE không sinh khung giờ và không hiện ở lịch công khai', async () => {
  const u = await api('PATCH', `/api/doctor/schedules/${afternoonId}`, { token: doc.accessToken, body: { status: 'inactive' } });
  assert.equal(u.status, 200);
  assert.equal(u.body.data.status, 'INACTIVE');
  const r = await api('GET', `/api/doctors/${doc.id}/slots?date=${day.date}`);
  assert.equal(r.body.data.slots.length, 8);
  const pub = await api('GET', `/api/doctors/${doc.id}/schedules`);
  assert.equal(pub.status, 200);
  assert.deepEqual(pub.body.data.map((s) => s.id), [morningId]);
});

test('ngày nghỉ: tạo, trùng 409, ngày quá khứ 400 (bác sĩ), khung giờ trống rỗng', async () => {
  // Tạo ca cho ngày nghỉ để chắc chắn "rỗng" là do nghỉ chứ không phải do không có ca
  const s = await api('POST', '/api/doctor/schedules', {
    token: doc.accessToken, body: { dayOfWeek: leaveDay.dow, startTime: '08:00', endTime: '10:00', slotDuration: 30 },
  });
  assert.equal(s.status, 201);

  const r = await api('POST', '/api/doctor/leaves', { token: doc.accessToken, body: { leaveDate: leaveDay.date, reason: 'Hội thảo' } });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.affectedAppointments, 0);
  const dup = await api('POST', '/api/doctor/leaves', { token: doc.accessToken, body: { leaveDate: leaveDay.date } });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.error.code, 'LEAVE_EXISTS');
  const past = await api('POST', '/api/doctor/leaves', { token: doc.accessToken, body: { leaveDate: clinicDate(-3).date } });
  assert.equal(past.status, 400);

  const slots = await api('GET', `/api/doctors/${doc.id}/slots?date=${leaveDay.date}`);
  assert.equal(slots.body.data.onLeave, true);
  assert.equal(slots.body.data.slots.length, 0);

  const list = await api('GET', '/api/doctor/leaves', { token: doc.accessToken });
  assert.equal(list.status, 200);
  assert.equal(list.body.pagination.total, 1);

  // Bác sĩ khác không xóa được ngày nghỉ của người khác
  const id = r.body.data.id;
  assert.equal((await api('DELETE', `/api/doctor/leaves/${id}`, { token: otherDoc.accessToken })).status, 404);
  assert.equal((await api('DELETE', `/api/doctor/leaves/${id}`, { token: doc.accessToken })).status, 204);
  const after = await api('GET', `/api/doctors/${doc.id}/slots?date=${leaveDay.date}`);
  assert.equal(after.body.data.onLeave, false);
  assert.equal(after.body.data.slots.length, 4);
});

test('admin quản lý lịch và ngày nghỉ của bác sĩ (được ghi nhận ngày đã qua)', async () => {
  const t = admin.accessToken;
  const sch = await api('GET', `/api/admin/doctors/${doc.id}/schedules`, { token: t });
  assert.equal(sch.status, 200);
  assert.equal(sch.body.data.length, 3);

  const c = await api('POST', `/api/admin/doctors/${doc.id}/schedules`, {
    token: t, body: { dayOfWeek: clinicDate(11).dow, startTime: '07:30', endTime: '09:00', slotDuration: 15, maxPatient: 6 },
  });
  assert.equal(c.status, 201);
  assert.equal((await api('DELETE', `/api/admin/doctors/${doc.id}/schedules/${c.body.data.id}`, { token: t })).status, 204);
  assert.equal((await api('POST', '/api/admin/doctors/999999/schedules', {
    token: t, body: { dayOfWeek: 1, startTime: '08:00', endTime: '09:00', slotDuration: 30 },
  })).status, 404);

  const pastDate = clinicDate(-2).date;
  const l = await api('POST', `/api/admin/doctors/${doc.id}/leaves`, { token: t, body: { leaveDate: pastDate, reason: 'Ốm' } });
  assert.equal(l.status, 201);
  const all = await api('GET', `/api/admin/leaves?doctorId=${doc.id}`, { token: t });
  assert.equal(all.status, 200);
  assert.equal(all.body.pagination.total, 1);
  assert.equal(all.body.data[0].leaveDate, pastDate);
  assert.equal(all.body.data[0].doctorName, 'TEST Bác sĩ sched-doc');
  // Bác sĩ không tự xóa được ngày nghỉ đã qua (ảnh hưởng tính lương)
  assert.equal((await api('DELETE', `/api/doctor/leaves/${l.body.data.id}`, { token: doc.accessToken })).status, 404);
});

test('5 request tạo ca chồng lấn đồng thời → chỉ 1 thành công', async () => {
  const d = clinicDate(12).dow;
  const starts = ['14:00', '14:15', '14:30', '14:45', '15:00'];
  const res = await Promise.all(starts.map((s) => api('POST', '/api/doctor/schedules', {
    token: doc.accessToken, body: { dayOfWeek: d, startTime: s, endTime: '16:00', slotDuration: 15 },
  })));
  const codes = res.map((r) => r.status).sort();
  assert.deepEqual(codes, [201, 409, 409, 409, 409]);
});
