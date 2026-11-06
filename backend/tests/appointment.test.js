// Kiểm thử đặt lịch & trạng thái lịch hẹn: node --test tests/appointment.test.js (cần `npm run seed` trước)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  api, RUN, registerPatient, seedLogin, createTestDoctor, clinicDate, dbQuery, dbClose,
} from './helpers.js';

let admin; let doc; let doc2; let pA; let pB; let roomId;
const D = clinicDate(5).date; // ca 08:00–12:00 giờ VN = 01:00–05:00 UTC
const D2 = clinicDate(6).date; // ca nhỏ 08:00–09:00, tối đa 2 bệnh nhân
const LEAVE = clinicDate(7).date;
const at = (date, hhmm) => `${date}T${hhmm}:00Z`;
const book = (token, body) => api('POST', '/api/appointments', { token, body });

before(async () => {
  admin = await seedLogin('admin');
  doc = await createTestDoctor(admin.accessToken, 'appt-doc');
  doc2 = await createTestDoctor(admin.accessToken, 'appt-doc2');
  pA = await registerPatient('appt-a');
  pB = await registerPatient('appt-b');

  const t = admin.accessToken;
  for (const [d, dd, s, e, max] of [[doc, D, '08:00', '12:00', 50], [doc, D2, '08:00', '09:00', 2], [doc2, D, '08:00', '12:00', 50]]) {
    const r = await api('POST', `/api/admin/doctors/${d.id}/schedules`, {
      token: t, body: { dayOfWeek: clinicDate(dd === D ? 5 : 6).dow, startTime: s, endTime: e, slotDuration: 30, maxPatient: max },
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
  }
  assert.equal((await api('POST', `/api/admin/doctors/${doc.id}/leaves`, { token: t, body: { leaveDate: LEAVE } })).status, 201);
  const room = await api('POST', '/api/admin/rooms', { token: t, body: { name: `TEST-Phòng-${RUN}` } });
  roomId = room.body.data.id;
});

after(dbClose);

let first; // lịch 03:00–03:30Z của bệnh nhân A

test('slot trống → 201 PENDING; patientId trong body bị bỏ qua', async () => {
  const r = await book(pA.accessToken, {
    doctorId: doc.id, startAt: at(D, '03:00'), endAt: at(D, '03:30'), reason: 'Đau đầu', patientId: pB.user.patient.id,
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.status, 'PENDING');
  assert.equal(r.body.data.patient.id, pA.user.patient.id);
  assert.equal(r.body.data.startAt, at(D, '03:00'));
  assert.equal(r.body.data.doctor.fullName, 'TEST Bác sĩ appt-doc');
  first = r.body.data;
});

test('trùng đúng giờ → 409 SLOT_TAKEN', async () => {
  const r = await book(pB.accessToken, { doctorId: doc.id, startAt: at(D, '03:00'), endAt: at(D, '03:30') });
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'SLOT_TAKEN');
});

test('chồng lấn lệch giờ 03:15–03:45 → 409', async () => {
  const r = await book(pB.accessToken, { doctorId: doc.id, startAt: at(D, '03:15'), endAt: at(D, '03:45') });
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'SLOT_TAKEN');
});

test('liền kề 03:30–04:00 → 201', async () => {
  const r = await book(pB.accessToken, { doctorId: doc.id, startAt: at(D, '03:30'), endAt: at(D, '04:00') });
  assert.equal(r.status, 201, JSON.stringify(r.body));
});

test('bác sĩ không tồn tại → 404; quá khứ → 400; đầu vào sai → 400', async () => {
  const nf = await book(pA.accessToken, { doctorId: 999999, startAt: at(D, '01:00'), endAt: at(D, '01:30') });
  assert.equal(nf.status, 404);
  assert.equal(nf.body.error.code, 'DOCTOR_NOT_FOUND');

  const past = await book(pA.accessToken, { doctorId: doc.id, startAt: '2020-01-01T03:00:00Z', endAt: '2020-01-01T03:30:00Z' });
  assert.equal(past.status, 400);
  assert.equal(past.body.error.code, 'PAST_TIME');

  for (const body of [
    { doctorId: doc.id, startAt: `${D} 10:00`, endAt: at(D, '03:30') }, // thiếu múi giờ
    { doctorId: doc.id, startAt: at(D, '03:30'), endAt: at(D, '03:00') }, // end < start
    { doctorId: 'abc', startAt: at(D, '01:00') },
    { doctorId: doc.id, startAt: `${D}T01:00:30Z` }, // lẻ giây
  ]) {
    assert.equal((await book(pA.accessToken, body)).status, 400, JSON.stringify(body));
  }
});

test('đối chiếu lịch làm việc: ngoài ca / ngày nghỉ → 409; không gửi endAt thì lấy theo slotDuration', async () => {
  const out = await book(pA.accessToken, { doctorId: doc.id, startAt: at(D, '06:00'), endAt: at(D, '06:30') }); // 13:00 VN
  assert.equal(out.status, 409);
  assert.equal(out.body.error.code, 'OUTSIDE_SCHEDULE');
  const spill = await book(pA.accessToken, { doctorId: doc.id, startAt: at(D, '04:45'), endAt: at(D, '05:15') }); // vượt 12:00
  assert.equal(spill.body.error.code, 'OUTSIDE_SCHEDULE');
  const leave = await book(pA.accessToken, { doctorId: doc.id, startAt: at(LEAVE, '02:00') });
  assert.equal(leave.status, 409);
  assert.equal(leave.body.error.code, 'DOCTOR_ON_LEAVE');

  const auto = await book(pA.accessToken, { doctorId: doc.id, startAt: at(D, '01:00') });
  assert.equal(auto.status, 201);
  assert.equal(auto.body.data.endAt, at(D, '01:30'));

  // Bệnh nhân không thể có 2 lịch trùng giờ (kể cả với bác sĩ khác)
  const busy = await book(pA.accessToken, { doctorId: doc2.id, startAt: at(D, '01:00') });
  assert.equal(busy.status, 409);
  assert.equal(busy.body.error.code, 'PATIENT_BUSY');
});

test('10 request đồng thời cùng slot → đúng 1 mã 201, 9 mã 409; DB chỉ có 1 dòng', async () => {
  const patients = await Promise.all(Array.from({ length: 10 }, (_, i) => registerPatient(`appt-race${i}`)));
  const startAt = at(D, '04:30');
  const res = await Promise.all(patients.map((p) => book(p.accessToken, { doctorId: doc.id, startAt, endAt: at(D, '05:00') })));
  const codes = res.map((r) => r.status);
  assert.equal(codes.filter((c) => c === 201).length, 1, JSON.stringify(codes));
  assert.equal(codes.filter((c) => c === 409).length, 9, JSON.stringify(codes));
  const [{ n }] = await dbQuery(
    "SELECT COUNT(*) AS n FROM appointment WHERE doctor_id = ? AND start_at = ? AND status NOT IN ('CANCELLED','NO_SHOW')",
    [doc.id, `${D} 04:30:00`],
  );
  assert.equal(n, 1);
});

test('max_patient của ca: đặt tối đa 2 lịch, lịch thứ 3 → 409 SHIFT_FULL', async () => {
  const ps = await Promise.all([registerPatient('appt-full0'), registerPatient('appt-full1'), registerPatient('appt-full2')]);
  assert.equal((await book(ps[0].accessToken, { doctorId: doc.id, startAt: at(D2, '01:00') })).status, 201);
  assert.equal((await book(ps[1].accessToken, { doctorId: doc.id, startAt: at(D2, '01:30') })).status, 201);
  const third = await book(ps[2].accessToken, { doctorId: doc.id, startAt: at(D2, '01:15'), endAt: at(D2, '01:30') });
  assert.equal(third.status, 409);
  assert.equal(third.body.error.code, 'SHIFT_FULL');
  const slots = await api('GET', `/api/doctors/${doc.id}/slots?date=${D2}`);
  assert.equal(slots.body.data.shifts[0].full, true);
  assert.equal(slots.body.data.slots.length, 0);
});

test('phạm vi xem: lịch người khác → 404; danh sách chỉ gồm lịch của mình', async () => {
  assert.equal((await api('GET', `/api/appointments/${first.id}`, { token: pB.accessToken })).status, 404);
  assert.equal((await api('GET', `/api/appointments/${first.id}`, { token: doc2.accessToken })).status, 404);
  assert.equal((await api('GET', `/api/appointments/${first.id}`, { token: pA.accessToken })).status, 200);
  assert.equal((await api('GET', `/api/appointments/${first.id}`, { token: doc.accessToken })).status, 200);

  const mine = await api('GET', '/api/appointments', { token: pA.accessToken });
  assert.equal(mine.status, 200);
  assert.ok(mine.body.data.every((a) => a.patient.id === pA.user.patient.id));
  assert.equal(mine.body.pagination.total, 2);

  const docList = await api('GET', `/api/appointments?date=${D}&sort=asc`, { token: doc.accessToken });
  assert.ok(docList.body.data.every((a) => a.doctor.id === doc.id));
  assert.equal(docList.body.data[0].startAt, at(D, '01:00'));

  const adm = await api('GET', `/api/appointments?doctorId=${doc.id}&status=pending`, { token: admin.accessToken });
  assert.equal(adm.status, 200);
  assert.ok(adm.body.pagination.total >= 4);
  assert.equal((await api('GET', '/api/appointments?status=xyz', { token: admin.accessToken })).status, 400);
});

test('phân quyền hành động: bác sĩ không đặt lịch, bệnh nhân không xác nhận', async () => {
  assert.equal((await book(doc.accessToken, { doctorId: doc.id, startAt: at(D, '02:00') })).status, 403);
  assert.equal((await api('PATCH', `/api/appointments/${first.id}/confirm`, { token: pA.accessToken })).status, 403);
  assert.equal((await api('PATCH', `/api/appointments/${first.id}/check-in`, { token: doc.accessToken })).status, 403);
});

test('bệnh nhân hủy → slot được giải phóng; hủy lần 2 → 409; người khác hủy → 404', async () => {
  assert.equal((await api('PATCH', `/api/appointments/${first.id}/cancel`, { token: pB.accessToken })).status, 404);
  const c = await api('PATCH', `/api/appointments/${first.id}/cancel`, { token: pA.accessToken, body: { reason: 'Bận việc' } });
  assert.equal(c.status, 200);
  assert.equal(c.body.data.status, 'CANCELLED');
  const again = await api('PATCH', `/api/appointments/${first.id}/cancel`, { token: pA.accessToken });
  assert.equal(again.status, 409);
  assert.equal(again.body.error.code, 'INVALID_STATUS');

  const rebook = await book(pB.accessToken, { doctorId: doc.id, startAt: at(D, '03:00'), endAt: at(D, '03:30') });
  assert.equal(rebook.status, 201);
});

test('admin đặt hộ (CONFIRMED, có phòng); trùng phòng → 409; đổi phòng', async () => {
  const t = admin.accessToken;
  const pC = await registerPatient('appt-c');
  const r = await book(t, { doctorId: doc2.id, patientId: pC.user.patient.id, roomId, startAt: at(D, '02:00'), endAt: at(D, '02:30') });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.status, 'CONFIRMED');
  assert.equal(r.body.data.room.id, roomId);
  assert.ok(r.body.data.adminId);

  // Bác sĩ khác, cùng phòng, giờ chồng lấn
  const clash = await book(t, { doctorId: doc.id, patientId: pA.user.patient.id, roomId, startAt: at(D, '02:15'), endAt: at(D, '02:45') });
  assert.equal(clash.status, 409);
  assert.equal(clash.body.error.code, 'ROOM_SLOT_TAKEN');

  const noRoom = await book(t, { doctorId: doc.id, patientId: pA.user.patient.id, startAt: at(D, '02:15'), endAt: at(D, '02:45') });
  assert.equal(noRoom.status, 201);
  const move = await api('PATCH', `/api/appointments/${noRoom.body.data.id}/room`, { token: t, body: { roomId } });
  assert.equal(move.status, 409);
  assert.equal(move.body.error.code, 'ROOM_SLOT_TAKEN');
  const unset = await api('PATCH', `/api/appointments/${r.body.data.id}/room`, { token: t, body: { roomId: null } });
  assert.equal(unset.status, 200);
  assert.equal(unset.body.data.room, null);
  const move2 = await api('PATCH', `/api/appointments/${noRoom.body.data.id}/room`, { token: t, body: { roomId } });
  assert.equal(move2.status, 200);
  assert.equal(move2.body.data.room.id, roomId);

  assert.equal((await book(t, { doctorId: doc.id, startAt: at(D, '04:00') })).status, 400); // thiếu patientId
  assert.equal((await book(t, { doctorId: doc.id, patientId: 999999, startAt: at(D, '04:00') })).status, 400);
});

test('xác nhận → check-in; không đến chỉ sau giờ hẹn; thông báo được ghi', async () => {
  const t = admin.accessToken;
  const p = await registerPatient('appt-flow');
  const r = await book(p.accessToken, { doctorId: doc2.id, startAt: at(D, '03:00') });
  assert.equal(r.status, 201);
  const id = r.body.data.id;

  const cf = await api('PATCH', `/api/appointments/${id}/confirm`, { token: t });
  assert.equal(cf.status, 200);
  assert.equal(cf.body.data.status, 'CONFIRMED');
  assert.equal((await api('PATCH', `/api/appointments/${id}/confirm`, { token: t })).status, 409);

  const early = await api('PATCH', `/api/appointments/${id}/no-show`, { token: doc2.accessToken });
  assert.equal(early.status, 409);
  assert.equal(early.body.error.code, 'TOO_EARLY');
  assert.equal((await api('PATCH', `/api/appointments/${id}/no-show`, { token: doc.accessToken })).status, 404);

  // Dời lịch TEST này về quá khứ để mô phỏng "đã qua giờ hẹn"
  await dbQuery(
    'UPDATE appointment SET start_at = start_at - INTERVAL 30 DAY, end_at = end_at - INTERVAL 30 DAY WHERE id = ?', [id],
  );
  const late = await api('PATCH', `/api/appointments/${id}/cancel`, { token: p.accessToken });
  assert.equal(late.status, 409);
  assert.equal(late.body.error.code, 'TOO_LATE');
  const ns = await api('PATCH', `/api/appointments/${id}/no-show`, { token: doc2.accessToken });
  assert.equal(ns.status, 200);
  assert.equal(ns.body.data.status, 'NO_SHOW');

  const r2 = await book(p.accessToken, { doctorId: doc2.id, startAt: at(D, '04:00') });
  const ci = await api('PATCH', `/api/appointments/${r2.body.data.id}/check-in`, { token: t });
  assert.equal(ci.status, 200);
  assert.equal(ci.body.data.status, 'CHECKED_IN');
  assert.equal((await api('PATCH', `/api/appointments/${r2.body.data.id}/cancel`, { token: p.accessToken })).status, 409);

  const notes = await dbQuery('SELECT type FROM notification WHERE patient_id = ? ORDER BY id', [p.user.patient.id]);
  assert.deepEqual(notes.map((n) => n.type), [
    'APPOINTMENT_CREATED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_NO_SHOW', 'APPOINTMENT_CREATED',
  ]);
});
