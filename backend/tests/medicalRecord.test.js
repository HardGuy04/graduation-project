// Kiểm thử bệnh án & đơn thuốc: node --test tests/medicalRecord.test.js (cần `npm run seed` trước)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { api, registerPatient, seedLogin, createTestDoctor, clinicDate, dbClose } from './helpers.js';

let admin; let doc; let doc2; let p; let other;
let apptId; let recordId;
const DAY = clinicDate(4);
const at = (hhmm) => `${DAY.date}T${hhmm}:00Z`;

before(async () => {
  admin = await seedLogin('admin');
  doc = await createTestDoctor(admin.accessToken, 'mr-doc');
  doc2 = await createTestDoctor(admin.accessToken, 'mr-doc2');
  p = await registerPatient('mr-patient');
  other = await registerPatient('mr-other');
  for (const d of [doc, doc2]) {
    const s = await api('POST', `/api/admin/doctors/${d.id}/schedules`, {
      token: admin.accessToken, body: { dayOfWeek: DAY.dow, startTime: '08:00', endTime: '12:00', slotDuration: 30, maxPatient: 20 },
    });
    assert.equal(s.status, 201);
  }
  apptId = (await api('POST', '/api/appointments', { token: p.accessToken, body: { doctorId: doc.id, startAt: at('01:00') } })).body.data.id;
  // Bệnh nhân thứ hai có lịch với bác sĩ 1 (để danh sách "bệnh nhân của tôi" có 2 người)
  const o = await api('POST', '/api/appointments', { token: other.accessToken, body: { doctorId: doc.id, startAt: at('02:00') } });
  assert.equal(o.status, 201);
});

after(dbClose);

const prescription = {
  note: 'Uống sau ăn',
  items: [
    { medicineName: 'Paracetamol 500mg', dosage: '1 viên', quantity: 10, instruction: 'Ngày 2 lần' },
    { medicineName: 'Vitamin C', quantity: 20, usageInstruction: 'Sáng 1 viên' },
  ],
};

test('chưa check-in → 409; bác sĩ khác → 404; thiếu chẩn đoán / đơn sai → 400', async () => {
  const pending = await api('POST', '/api/doctor/medical-records', { token: doc.accessToken, body: { appointmentId: apptId, diagnosis: 'Cảm' } });
  assert.equal(pending.status, 409);
  assert.equal(pending.body.error.code, 'INVALID_STATUS');

  assert.equal((await api('PATCH', `/api/appointments/${apptId}/check-in`, { token: admin.accessToken })).status, 200);

  const wrongDoc = await api('POST', '/api/doctor/medical-records', { token: doc2.accessToken, body: { appointmentId: apptId, diagnosis: 'Cảm' } });
  assert.equal(wrongDoc.status, 404);
  const noDiag = await api('POST', '/api/doctor/medical-records', { token: doc.accessToken, body: { appointmentId: apptId, symptoms: 'Sốt' } });
  assert.equal(noDiag.status, 400);
  const badItems = await api('POST', '/api/doctor/medical-records', {
    token: doc.accessToken, body: { appointmentId: apptId, diagnosis: 'Cảm', prescription: { items: [{ medicineName: 'X', quantity: 0 }] } },
  });
  assert.equal(badItems.status, 400);
  const emptyItems = await api('POST', '/api/doctor/medical-records', {
    token: doc.accessToken, body: { appointmentId: apptId, diagnosis: 'Cảm', prescription: { items: [] } },
  });
  assert.equal(emptyItems.status, 400);
  const badFollow = await api('POST', '/api/doctor/medical-records', {
    token: doc.accessToken, body: { appointmentId: apptId, diagnosis: 'Cảm', followUpDate: DAY.date },
  });
  assert.equal(badFollow.status, 400);

  // Các request lỗi ở trên không được để lại thay đổi nào: lịch vẫn CHECKED_IN
  const a = await api('GET', `/api/appointments/${apptId}`, { token: doc.accessToken });
  assert.equal(a.body.data.status, 'CHECKED_IN');
  assert.equal(a.body.data.medicalRecordId, null);
});

test('nhập bệnh án + đơn thuốc → 201, lịch chuyển DONE; 2 request đồng thời chỉ 1 thành công', async () => {
  const body = {
    appointmentId: apptId, symptoms: 'Sốt, ho', diagnosis: 'Viêm họng cấp', note: 'Theo dõi',
    followUpDate: clinicDate(11).date, prescription,
  };
  const res = await Promise.all([
    api('POST', '/api/doctor/medical-records', { token: doc.accessToken, body }),
    api('POST', '/api/doctor/medical-records', { token: doc.accessToken, body }),
  ]);
  const codes = res.map((r) => r.status).sort();
  assert.deepEqual(codes, [201, 409]);
  const r = res.find((x) => x.status === 201);
  recordId = r.body.data.id;
  assert.equal(r.body.data.diagnosis, 'Viêm họng cấp');
  assert.equal(r.body.data.followUpDate, clinicDate(11).date);
  assert.equal(r.body.data.prescription.items.length, 2);
  assert.equal(r.body.data.prescription.items[0].usageInstruction, 'Ngày 2 lần');
  assert.equal(r.body.data.appointment.status, 'DONE');

  const a = await api('GET', `/api/appointments/${apptId}`, { token: p.accessToken });
  assert.equal(a.body.data.status, 'DONE');
  assert.equal(a.body.data.medicalRecordId, recordId);
});

test('sửa bệnh án / thay đơn thuốc: chỉ bác sĩ đã viết', async () => {
  const u = await api('PATCH', `/api/doctor/medical-records/${recordId}`, { token: doc.accessToken, body: { diagnosis: 'Viêm họng do virus' } });
  assert.equal(u.status, 200);
  assert.equal(u.body.data.diagnosis, 'Viêm họng do virus');
  assert.equal(u.body.data.symptoms, 'Sốt, ho');
  assert.equal((await api('PATCH', `/api/doctor/medical-records/${recordId}`, { token: doc.accessToken, body: { diagnosis: '' } })).status, 400);
  assert.equal((await api('PATCH', `/api/doctor/medical-records/${recordId}`, { token: doc.accessToken, body: {} })).status, 400);
  assert.equal((await api('PATCH', `/api/doctor/medical-records/${recordId}`, { token: doc2.accessToken, body: { note: 'x' } })).status, 404);

  const pr = await api('PUT', `/api/doctor/medical-records/${recordId}/prescription`, {
    token: doc.accessToken, body: { items: [{ medicineName: 'Amoxicillin 500mg', quantity: 14, dosage: '1 viên' }] },
  });
  assert.equal(pr.status, 200);
  assert.equal(pr.body.data.prescription.items.length, 1);
  assert.equal(pr.body.data.prescription.items[0].medicineName, 'Amoxicillin 500mg');
  assert.equal(pr.body.data.prescription.note, null);
  assert.equal((await api('PUT', `/api/doctor/medical-records/${recordId}/prescription`, {
    token: doc2.accessToken, body: { items: [{ medicineName: 'X', quantity: 1 }] },
  })).status, 404);
});

test('bệnh nhân chỉ xem được bệnh án của mình', async () => {
  const list = await api('GET', '/api/patient/medical-records', { token: p.accessToken });
  assert.equal(list.status, 200);
  assert.equal(list.body.pagination.total, 1);
  assert.equal(list.body.data[0].prescription.items.length, 1);
  assert.equal((await api('GET', `/api/patient/medical-records/${recordId}`, { token: p.accessToken })).status, 200);
  assert.equal((await api('GET', `/api/patient/medical-records/${recordId}`, { token: other.accessToken })).status, 404);
  assert.equal((await api('GET', '/api/patient/medical-records', { token: other.accessToken })).body.pagination.total, 0);
  assert.equal((await api('GET', '/api/doctor/medical-records', { token: admin.accessToken })).status, 403);
});

test('bác sĩ: danh sách bệnh nhân của tôi; xem lịch sử chỉ khi bệnh nhân có lịch với mình', async () => {
  const mine = await api('GET', '/api/doctor/patients', { token: doc.accessToken });
  assert.equal(mine.status, 200);
  assert.equal(mine.body.pagination.total, 2);
  assert.ok(mine.body.data.every((x) => x.email === undefined));
  const pid = p.user.patient.id;

  assert.equal((await api('GET', `/api/doctor/patients/${pid}`, { token: doc2.accessToken })).status, 404);
  assert.equal((await api('GET', `/api/doctor/patients/${pid}/history`, { token: doc2.accessToken })).status, 404);
  assert.equal((await api('GET', `/api/doctor/medical-records/${recordId}`, { token: doc2.accessToken })).status, 404);

  const h = await api('GET', `/api/doctor/patients/${pid}/history`, { token: doc.accessToken });
  assert.equal(h.status, 200);
  assert.equal(h.body.data.length, 1);

  // Bệnh nhân đặt lịch với bác sĩ 2 → bác sĩ 2 đọc được lịch sử (kể cả bệnh án do bác sĩ 1 viết)
  const b = await api('POST', '/api/appointments', { token: p.accessToken, body: { doctorId: doc2.id, startAt: at('03:00') } });
  assert.equal(b.status, 201);
  const h2 = await api('GET', `/api/doctor/patients/${pid}/history`, { token: doc2.accessToken });
  assert.equal(h2.status, 200);
  assert.equal(h2.body.data[0].doctor.id, doc.id);
  // ...nhưng không được sửa
  assert.equal((await api('PATCH', `/api/doctor/medical-records/${recordId}`, { token: doc2.accessToken, body: { note: 'x' } })).status, 404);

  // Hủy lịch → mất quyền xem
  await api('PATCH', `/api/appointments/${b.body.data.id}/cancel`, { token: p.accessToken });
  assert.equal((await api('GET', `/api/doctor/patients/${pid}/history`, { token: doc2.accessToken })).status, 404);
});
