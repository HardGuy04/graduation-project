import test from 'node:test';
import assert from 'node:assert/strict';
import { api, seedLogin, registerPatient, dbClose } from './helpers.js';

test('AI Integration: Phân quyền & Endpoint Gợi ý bệnh & Chatbot', async (t) => {
  t.after(dbClose);

  let docToken;
  let patToken;

  await t.test('Đăng nhập Bác sĩ & Bệnh nhân', async () => {
    const doc = await seedLogin('doctor1');
    docToken = doc.accessToken;
    assert.ok(docToken, 'Doctor token must exist');

    const pat = await registerPatient('ai-user');
    patToken = pat.tokens.accessToken;
    assert.ok(patToken, 'Patient token must exist');
  });

  await t.test('POST /api/ai/predict-disease: Chặn khi chưa đăng nhập (401)', async () => {
    const res = await api('POST', '/api/ai/predict-disease', {
      body: { symptoms: 'Sốt cao, ho có đờm' },
    });
    assert.equal(res.status, 401);
  });

  await t.test('POST /api/ai/predict-disease: Chặn khi là Bệnh nhân (403)', async () => {
    const res = await api('POST', '/api/ai/predict-disease', {
      token: patToken,
      body: { symptoms: 'Sốt cao, ho có đờm' },
    });
    assert.equal(res.status, 403);
  });

  await t.test('POST /api/ai/predict-disease: Cho phép Bác sĩ gọi (200 hoặc 502 nếu AI chưa bật)', async () => {
    const res = await api('POST', '/api/ai/predict-disease', {
      token: docToken,
      body: { symptoms: 'Sốt cao, ho có đờm' },
    });
    // Khi AI service chạy: 200; khi chưa chạy: 502 (AI_UNAVAILABLE)
    assert.ok(res.status === 200 || res.status === 502, `Unexpected status: ${res.status}`);
    if (res.status === 200) {
      assert.ok(res.body.data);
      assert.ok(Array.isArray(res.body.data.diseases));
      assert.ok(Array.isArray(res.body.data.medicines));
    }
  });

  await t.test('POST /api/chatbot/message: Bệnh nhân gửi tin nhắn hợp lệ', async () => {
    const res = await api('POST', '/api/chatbot/message', {
      token: patToken,
      body: { message: 'Phòng khám có những chuyên khoa nào?' },
    });
    assert.ok(res.status === 200 || res.status === 502, `Unexpected status: ${res.status}`);
    if (res.status === 200) {
      assert.ok(res.body.data?.reply);
    }
  });
});
