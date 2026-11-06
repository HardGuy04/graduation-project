// Kiểm thử thông báo & nhắc lịch: node --test tests/notification.test.js (cần `npm run seed` trước)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { api, registerPatient, seedLogin, createTestDoctor, clinicDate, dbQuery, dbClose } from './helpers.js';

let admin; let doc; let p; let other; let soonAppt;

before(async () => {
  admin = await seedLogin('admin');
  doc = await createTestDoctor(admin.accessToken, 'notif-doc');
  p = await registerPatient('notif-patient');
  other = await registerPatient('notif-other');
  // Ca phủ gần cả ngày hôm nay và ngày mai để đặt được lịch trong 24 giờ tới
  for (const d of [clinicDate(0), clinicDate(1)]) {
    const s = await api('POST', `/api/admin/doctors/${doc.id}/schedules`, {
      token: admin.accessToken, body: { dayOfWeek: d.dow, startTime: '00:00', endTime: '23:30', slotDuration: 30, maxPatient: 100 },
    });
    assert.equal(s.status, 201, JSON.stringify(s.body));
  }
  // Mốc 30 phút đầu tiên sau 1 giờ nữa còn nằm trong ca
  const base = Math.ceil((Date.now() + 3_600_000) / 1_800_000) * 1_800_000;
  for (let i = 0; i < 6 && !soonAppt; i++) {
    const startAt = new Date(base + i * 1_800_000).toISOString().replace('.000Z', 'Z');
    const r = await api('POST', '/api/appointments', { token: p.accessToken, body: { doctorId: doc.id, startAt } });
    if (r.status === 201) soonAppt = r.body.data;
  }
  assert.ok(soonAppt, 'không đặt được lịch trong 24 giờ tới');
});

after(dbClose);

test('đặt lịch / xác nhận sinh thông báo; danh sách và số chưa đọc', async () => {
  assert.equal((await api('PATCH', `/api/appointments/${soonAppt.id}/confirm`, { token: admin.accessToken })).status, 200);
  const list = await api('GET', '/api/patient/notifications', { token: p.accessToken });
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.data.map((n) => n.type), ['APPOINTMENT_CONFIRMED', 'APPOINTMENT_CREATED']);
  assert.ok(list.body.data.every((n) => n.isRead === false && n.appointmentId === soonAppt.id));
  assert.match(list.body.data[0].text, /TEST Bác sĩ notif-doc/);
  const c = await api('GET', '/api/patient/notifications/unread-count', { token: p.accessToken });
  assert.equal(c.body.data.unread, 2);
  assert.equal((await api('GET', '/api/patient/notifications', { token: admin.accessToken })).status, 403);
});

test('đánh dấu đã đọc: của người khác → 404; đọc tất cả', async () => {
  const list = await api('GET', '/api/patient/notifications', { token: p.accessToken });
  const id = list.body.data[0].id;
  assert.equal((await api('PATCH', `/api/patient/notifications/${id}/read`, { token: other.accessToken })).status, 404);
  assert.equal((await api('PATCH', `/api/patient/notifications/${id}/read`, { token: p.accessToken })).status, 204);
  const unread = await api('GET', '/api/patient/notifications?unread=true', { token: p.accessToken });
  assert.equal(unread.body.pagination.total, 1);
  const all = await api('PATCH', '/api/patient/notifications/read-all', { token: p.accessToken });
  assert.equal(all.body.data.updated, 1);
  assert.equal((await api('GET', '/api/patient/notifications/unread-count', { token: p.accessToken })).body.data.unread, 0);
});

test('nhắc lịch: tạo đúng 1 thông báo cho lịch trong 24 giờ tới, chạy lại không trùng', async () => {
  const { runReminders } = await import('../src/services/notification.service.js');
  assert.equal(await runReminders({ appointmentId: soonAppt.id }), 1);
  assert.equal(await runReminders({ appointmentId: soonAppt.id }), 0);
  const rows = await dbQuery(
    "SELECT text FROM notification WHERE appointment_id = ? AND type = 'APPOINTMENT_REMINDER'", [soonAppt.id],
  );
  assert.equal(rows.length, 1);
  assert.match(rows[0].text, /^Nhắc lịch: bạn có lịch khám với BS TEST Bác sĩ notif-doc lúc \d{2}:\d{2} \d{2}\/\d{2}\/\d{4}\.$/);

  // Lịch đã hủy không được nhắc
  const far = await api('POST', '/api/appointments', {
    token: other.accessToken, body: { doctorId: doc.id, startAt: new Date(Date.parse(soonAppt.startAt) + 3_600_000).toISOString().replace('.000Z', 'Z') },
  });
  if (far.status === 201) {
    await api('PATCH', `/api/appointments/${far.body.data.id}/cancel`, { token: other.accessToken });
    assert.equal(await runReminders({ appointmentId: far.body.data.id }), 0);
  }
});
