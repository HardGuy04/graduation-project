// Kiểm thử báo cáo & thu nhập bác sĩ: node --test tests/stats.test.js (cần `npm run seed` trước)
// Báo cáo tổng gồm cả dữ liệu thật / lần chạy trước nên test so sánh CHÊNH LỆCH trước–sau,
// hoặc lọc theo bác sĩ / chuyên khoa tạo riêng cho lần chạy này.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { api, RUN, testEmail, registerPatient, seedLogin, login, clinicDate, dbQuery, dbClose } from './helpers.js';

let admin; let doc; let specialtyId;
const X = clinicDate(20);
const at = (hhmm) => `${X.date}T${hhmm}:00Z`;
const MONTH = X.date.slice(0, 7);
let before_; // số liệu trước khi tạo dữ liệu

const get = (path) => api('GET', path, { token: admin.accessToken });

before(async () => {
  admin = await seedLogin('admin');
  const t = admin.accessToken;
  specialtyId = (await api('POST', '/api/admin/specialties', { token: t, body: { name: `TEST-Stats-${RUN}` } })).body.data.id;
  const email = testEmail('stats-doc');
  const u = await api('POST', '/api/admin/users', {
    token: t, body: { role: 'DOCTOR', email, fullName: 'TEST Bác sĩ stats', password: 'Test@12345', specialtyId },
  });
  assert.equal(u.status, 201);
  doc = { id: u.body.data.doctor.id, ...(await login(email, 'Test@12345')) };
  assert.equal((await api('POST', `/api/admin/doctors/${doc.id}/schedules`, {
    token: t, body: { dayOfWeek: X.dow, startTime: '08:00', endTime: '12:00', slotDuration: 30, maxPatient: 20 },
  })).status, 201);

  const today = clinicDate(0).date;
  before_ = {
    cancel: (await get(`/api/admin/stats/cancellation?from=${X.date}&to=${X.date}`)).body.data,
    revenue: (await get(`/api/admin/stats/revenue?from=${today}&to=${today}`)).body.data,
    overview: (await get('/api/admin/stats/overview')).body.data,
  };

  const ps = await Promise.all([0, 1, 2, 3].map((i) => registerPatient(`stats-p${i}`)));
  const book = (p, hhmm) => api('POST', '/api/appointments', { token: p.accessToken, body: { doctorId: doc.id, startAt: at(hhmm) } })
    .then((r) => { assert.equal(r.status, 201, JSON.stringify(r.body)); return r.body.data.id; });

  // A: DONE + hóa đơn đã thu tiền mặt 100.000đ
  const a = await book(ps[0], '01:00');
  await api('PATCH', `/api/appointments/${a}/check-in`, { token: t });
  assert.equal((await api('POST', '/api/doctor/medical-records', { token: doc.accessToken, body: { appointmentId: a, diagnosis: 'Ổn' } })).status, 201);
  const inv = await api('POST', '/api/admin/invoices', { token: t, body: { appointmentId: a, items: [{ label: 'Phí khám', amount: 100000 }] } });
  assert.equal((await api('PATCH', `/api/admin/invoices/${inv.body.data.id}/pay`, { token: t, body: { method: 'CASH' } })).status, 200);
  // B: CANCELLED
  const b = await book(ps[1], '01:30');
  await api('PATCH', `/api/appointments/${b}/cancel`, { token: ps[1].accessToken });
  // C: NO_SHOW — tạm dời lịch TEST về quá khứ để được đánh dấu, rồi trả lại giờ cũ
  const c = await book(ps[2], '02:00');
  await dbQuery('UPDATE appointment SET start_at = start_at - INTERVAL 60 DAY, end_at = end_at - INTERVAL 60 DAY WHERE id = ?', [c]);
  assert.equal((await api('PATCH', `/api/appointments/${c}/no-show`, { token: t })).status, 200);
  await dbQuery('UPDATE appointment SET start_at = start_at + INTERVAL 60 DAY, end_at = end_at + INTERVAL 60 DAY WHERE id = ?', [c]);
  // D: PENDING
  await book(ps[3], '02:30');
});

after(dbClose);

test('lượt khám theo ngày (lọc theo bác sĩ) và theo tháng', async () => {
  const r = await get(`/api/admin/stats/visits?groupBy=day&from=${X.date}&to=${X.date}&doctorId=${doc.id}`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.rows, [{ period: X.date, total: 4, done: 1, cancelled: 1, noShow: 1 }]);
  const m = await get(`/api/admin/stats/visits?groupBy=month&from=${MONTH}-01&to=${X.date}&doctorId=${doc.id}`);
  assert.deepEqual(m.body.data.rows, [{ period: MONTH, total: 4, done: 1, cancelled: 1, noShow: 1 }]);
});

test('theo bác sĩ và theo chuyên khoa (kèm doanh thu)', async () => {
  const d = await get(`/api/admin/stats/by-doctor?from=${X.date}&to=${X.date}`);
  const mine = d.body.data.rows.find((x) => x.doctorId === doc.id);
  assert.deepEqual(
    { total: mine.total, done: mine.done, cancelled: mine.cancelled, noShow: mine.noShow, revenue: mine.revenue },
    { total: 4, done: 1, cancelled: 1, noShow: 1, revenue: '100000.00' },
  );
  const s = await get(`/api/admin/stats/by-specialty?from=${X.date}&to=${X.date}`);
  const sp = s.body.data.rows.find((x) => x.specialtyId === specialtyId);
  assert.equal(sp.name, `TEST-Stats-${RUN}`);
  assert.equal(sp.doctors, 1);
  assert.equal(sp.total, 4);
  assert.equal(sp.revenue, '100000.00');
});

test('tỷ lệ hủy / không đến và doanh thu: chênh lệch đúng bằng dữ liệu vừa tạo', async () => {
  const c = (await get(`/api/admin/stats/cancellation?from=${X.date}&to=${X.date}`)).body.data;
  assert.equal(c.total - before_.cancel.total, 4);
  assert.equal(c.cancelled - before_.cancel.cancelled, 1);
  assert.equal(c.noShow - before_.cancel.noShow, 1);
  assert.equal(c.cancelRate, Math.round((c.cancelled / c.total) * 10000) / 100);

  const today = clinicDate(0).date;
  const r = (await get(`/api/admin/stats/revenue?from=${today}&to=${today}`)).body.data;
  assert.equal(Number(r.total.amount) - Number(before_.revenue.total.amount), 100000);
  assert.equal(r.total.invoices - before_.revenue.total.invoices, 1);
  assert.ok(r.byMethod.some((m) => m.method === 'CASH'));
  assert.equal(r.rows.at(-1).period, today);

  const o = (await get('/api/admin/stats/overview')).body.data;
  assert.equal(Number(o.revenueToday) - Number(before_.overview.revenueToday), 100000);
  assert.equal(o.pendingUpcoming - before_.overview.pendingUpcoming, 1);
});

test('tham số báo cáo sai → 400; không phải admin → 403', async () => {
  assert.equal((await get('/api/admin/stats/visits?groupBy=week')).status, 400);
  assert.equal((await get('/api/admin/stats/visits?from=2026-05-10&to=2026-05-01')).status, 400);
  assert.equal((await get('/api/admin/stats/visits?groupBy=day&from=2020-01-01&to=2026-01-01')).status, 400);
  assert.equal((await api('GET', '/api/admin/stats/overview', { token: doc.accessToken })).status, 403);
});

test('thu nhập: received = salary × dayOn / (dayOn + dayOff), dayOff đếm từ ngày nghỉ', async () => {
  const t = admin.accessToken;
  const lv = await api('POST', `/api/admin/doctors/${doc.id}/leaves`, { token: t, body: { leaveDate: X.date, reason: 'Ốm' } });
  assert.equal(lv.status, 201);
  assert.equal(lv.body.data.affectedAppointments, 2); // A (DONE) và D (PENDING) còn hiệu lực

  // Số ngày trong tháng trùng thứ với ca làm việc
  const [y, m] = MONTH.split('-').map(Number);
  let workDays = 0;
  for (let d = 1; d <= new Date(Date.UTC(y, m, 0)).getUTCDate(); d++) {
    const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if ((js === 0 ? 7 : js) === X.dow) workDays++;
  }

  const preview = await get(`/api/admin/incomes?month=${MONTH}&limit=100`);
  assert.equal(preview.status, 200);
  const p = preview.body.data.find((x) => x.doctorId === doc.id);
  assert.deepEqual({ saved: p.saved, dayOn: p.dayOn, dayOff: p.dayOff }, { saved: false, dayOn: workDays - 1, dayOff: 1 });

  const r = await api('PUT', `/api/admin/incomes/${doc.id}/${MONTH}`, { token: t, body: { salary: 10000000 } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const expected = Math.round((1_000_000_000 * (workDays - 1)) / workDays);
  assert.equal(r.body.data.received, `${Math.trunc(expected / 100)}.${String(expected % 100).padStart(2, '0')}`);
  assert.equal(r.body.data.salary, '10000000.00');

  // Ghi đè số ngày; upsert cùng (doctor, month) không tạo dòng mới
  const o = await api('PUT', `/api/admin/incomes/${doc.id}/${MONTH}`, { token: t, body: { salary: 10000000, dayOn: 20, dayOff: 2 } });
  assert.equal(o.body.data.received, '9090909.09');
  assert.equal(o.body.data.id, r.body.data.id);

  const mine = await api('GET', '/api/doctor/incomes', { token: doc.accessToken });
  assert.equal(mine.status, 200);
  assert.deepEqual(mine.body.data.map((x) => [x.month, x.received]), [[MONTH, '9090909.09']]);

  for (const [path, body] of [
    [`/api/admin/incomes/${doc.id}/2026-13`, { salary: 1 }],
    [`/api/admin/incomes/${doc.id}/${MONTH}`, { salary: -1 }],
    [`/api/admin/incomes/${doc.id}/${MONTH}`, { salary: 1, dayOn: 40 }],
    [`/api/admin/incomes/${doc.id}/${MONTH}`, { salary: 1, dayOn: 25, dayOff: 10 }],
  ]) {
    assert.equal((await api('PUT', path, { token: t, body })).status, 400, path + JSON.stringify(body));
  }
  assert.equal((await api('PUT', `/api/admin/incomes/999999/${MONTH}`, { token: t, body: { salary: 1 } })).status, 404);
});
