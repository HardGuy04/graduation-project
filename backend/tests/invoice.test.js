// Kiểm thử hóa đơn, thanh toán, ví: node --test tests/invoice.test.js (cần `npm run seed` trước)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { api, registerPatient, seedLogin, createTestDoctor, clinicDate, dbQuery, dbClose } from './helpers.js';

let admin; let doc; let p; let other;
let doneAppt; let doneAppt2; let pendingAppt; let invoiceId;
const DAY = clinicDate(3);
const at = (hhmm) => `${DAY.date}T${hhmm}:00Z`;

/** Đặt lịch → check-in → bác sĩ nhập bệnh án ⇒ lịch DONE. */
async function finishedAppointment(patient, hhmm) {
  const a = await api('POST', '/api/appointments', { token: patient.accessToken, body: { doctorId: doc.id, startAt: at(hhmm) } });
  assert.equal(a.status, 201, JSON.stringify(a.body));
  assert.equal((await api('PATCH', `/api/appointments/${a.body.data.id}/check-in`, { token: admin.accessToken })).status, 200);
  const m = await api('POST', '/api/doctor/medical-records', { token: doc.accessToken, body: { appointmentId: a.body.data.id, diagnosis: 'Khám định kỳ' } });
  assert.equal(m.status, 201);
  return a.body.data.id;
}

before(async () => {
  admin = await seedLogin('admin');
  doc = await createTestDoctor(admin.accessToken, 'inv-doc');
  p = await registerPatient('inv-patient');
  other = await registerPatient('inv-other');
  const s = await api('POST', `/api/admin/doctors/${doc.id}/schedules`, {
    token: admin.accessToken, body: { dayOfWeek: DAY.dow, startTime: '08:00', endTime: '12:00', slotDuration: 30, maxPatient: 20 },
  });
  assert.equal(s.status, 201);
  doneAppt = await finishedAppointment(p, '01:00');
  doneAppt2 = await finishedAppointment(p, '01:30');
  pendingAppt = (await api('POST', '/api/appointments', { token: p.accessToken, body: { doctorId: doc.id, startAt: at('02:00') } })).body.data.id;
});

after(dbClose);

const items = [{ label: 'Phí khám', amount: 150000 }, { label: 'Xét nghiệm máu', amount: '50000.50' }];

test('lập hóa đơn: chỉ cho lịch DONE, tổng tính chính xác, trùng → 409, tiền sai → 400', async () => {
  const t = admin.accessToken;
  const notDone = await api('POST', '/api/admin/invoices', { token: t, body: { appointmentId: pendingAppt, items } });
  assert.equal(notDone.status, 409);
  assert.equal(notDone.body.error.code, 'INVALID_STATUS');

  for (const bad of [[], [{ label: 'x', amount: -1 }], [{ label: 'x', amount: 'abc' }], [{ label: 'x', amount: 1.234 }], [{ amount: 10 }]]) {
    assert.equal((await api('POST', '/api/admin/invoices', { token: t, body: { appointmentId: doneAppt, items: bad } })).status, 400, JSON.stringify(bad));
  }

  const r = await api('POST', '/api/admin/invoices', { token: t, body: { appointmentId: doneAppt, items } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.totalAmount, '200000.50');
  assert.equal(r.body.data.paymentStatus, 'UNPAID');
  assert.deepEqual(r.body.data.items.map((i) => i.amount), ['150000.00', '50000.50']);
  invoiceId = r.body.data.id;

  const dup = await api('POST', '/api/admin/invoices', { token: t, body: { appointmentId: doneAppt, items } });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.error.code, 'INVOICE_EXISTS');

  const appt = await api('GET', `/api/appointments/${doneAppt}`, { token: p.accessToken });
  assert.deepEqual(appt.body.data.invoice, { id: invoiceId, paymentStatus: 'UNPAID' });
});

test('bệnh nhân xem hóa đơn của mình; người khác → 404; ví không đủ tiền → 409', async () => {
  const list = await api('GET', '/api/patient/invoices', { token: p.accessToken });
  assert.equal(list.status, 200);
  assert.equal(list.body.pagination.total, 1);
  assert.equal((await api('GET', `/api/patient/invoices/${invoiceId}`, { token: other.accessToken })).status, 404);
  assert.equal((await api('POST', `/api/patient/invoices/${invoiceId}/pay-wallet`, { token: other.accessToken })).status, 404);

  const poor = await api('POST', `/api/patient/invoices/${invoiceId}/pay-wallet`, { token: p.accessToken });
  assert.equal(poor.status, 409);
  assert.equal(poor.body.error.code, 'INSUFFICIENT_BALANCE');
  const w = await api('GET', '/api/patient/wallet', { token: p.accessToken });
  assert.equal(w.body.data.balance, '0.00');
  assert.equal((await api('GET', `/api/patient/invoices/${invoiceId}`, { token: p.accessToken })).body.data.paymentStatus, 'UNPAID');
});

test('nạp ví: bệnh nhân tự nạp (mô phỏng) và admin nạp hộ', async () => {
  assert.equal((await api('POST', '/api/patient/wallet/topup', { token: p.accessToken, body: { amount: 100 } })).status, 400);
  assert.equal((await api('POST', '/api/patient/wallet/topup', { token: p.accessToken, body: { amount: -5000 } })).status, 400);
  const self = await api('POST', '/api/patient/wallet/topup', { token: p.accessToken, body: { amount: 300000 } });
  assert.equal(self.status, 201);
  assert.equal(self.body.data.balance, '300000.00');
  const byAdmin = await api('POST', `/api/admin/patients/${p.user.patient.id}/wallet/topup`, { token: admin.accessToken, body: { amount: '50000' } });
  assert.equal(byAdmin.status, 201);
  assert.equal(byAdmin.body.data.balance, '350000.00');
  assert.equal((await api('POST', '/api/admin/patients/999999/wallet/topup', { token: admin.accessToken, body: { amount: 5000 } })).status, 404);
});

test('5 request trả bằng ví đồng thời → đúng 1 thành công, chỉ trừ tiền 1 lần', async () => {
  const res = await Promise.all(Array.from({ length: 5 }, () => api('POST', `/api/patient/invoices/${invoiceId}/pay-wallet`, { token: p.accessToken })));
  const codes = res.map((r) => r.status).sort();
  assert.deepEqual(codes, [200, 409, 409, 409, 409]);
  const okRes = res.find((r) => r.status === 200);
  assert.equal(okRes.body.data.walletBalance, '149999.50');
  assert.equal(okRes.body.data.invoice.paymentStatus, 'PAID');
  assert.equal(okRes.body.data.invoice.paymentMethod, 'WALLET');

  const [{ n }] = await dbQuery("SELECT COUNT(*) AS n FROM wallet_transaction WHERE invoice_id = ? AND type = 'PAYMENT'", [invoiceId]);
  assert.equal(n, 1);
  const tx = await api('GET', '/api/patient/wallet/transactions', { token: p.accessToken });
  assert.deepEqual(tx.body.data.map((t) => [t.type, t.balanceAfter]), [
    ['PAYMENT', '149999.50'], ['TOPUP', '350000.00'], ['TOPUP', '300000.00'],
  ]);
  // Đã trả rồi thì admin không ghi nhận thu tiền mặt được nữa
  assert.equal((await api('PATCH', `/api/admin/invoices/${invoiceId}/pay`, { token: admin.accessToken, body: { method: 'CASH' } })).status, 409);
});

test('admin ghi nhận thanh toán tại quầy; thông báo hóa đơn được ghi', async () => {
  const t = admin.accessToken;
  const r = await api('POST', '/api/admin/invoices', { token: t, body: { appointmentId: doneAppt2, items: [{ label: 'Phí khám', amount: 120000 }] } });
  assert.equal(r.status, 201);
  const id = r.body.data.id;
  assert.equal((await api('PATCH', `/api/admin/invoices/${id}/pay`, { token: t, body: { method: 'WALLET' } })).status, 400);
  const pay = await api('PATCH', `/api/admin/invoices/${id}/pay`, { token: t, body: { method: 'cash' } });
  assert.equal(pay.status, 200);
  assert.equal(pay.body.data.paymentStatus, 'PAID');
  assert.equal(pay.body.data.paymentMethod, 'CASH');
  assert.ok(pay.body.data.paidAt.endsWith('Z'));
  assert.equal((await api('PATCH', `/api/admin/invoices/${id}/pay`, { token: t, body: { method: 'CASH' } })).status, 409);
  assert.equal((await api('PATCH', '/api/admin/invoices/999999/pay', { token: t, body: { method: 'CASH' } })).status, 404);

  const list = await api('GET', `/api/admin/invoices?patientId=${p.user.patient.id}&paymentStatus=paid`, { token: t });
  assert.equal(list.body.pagination.total, 2);
  assert.equal((await api('GET', '/api/admin/invoices', { token: p.accessToken })).status, 403);

  const notes = await dbQuery(
    "SELECT type, COUNT(*) AS n FROM notification WHERE patient_id = ? AND type LIKE 'INVOICE_%' GROUP BY type ORDER BY type",
    [p.user.patient.id],
  );
  assert.deepEqual(notes.map((x) => [x.type, x.n]), [['INVOICE_CREATED', 2], ['INVOICE_PAID', 2]]);
});
