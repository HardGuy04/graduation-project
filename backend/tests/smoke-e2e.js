const B = 'http://localhost:5000';

const login = async (email, password) => {
  const r = await fetch(`${B}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  return { status: r.status, data: j.data, msg: j.error?.message };
};

(async () => {
  console.log('=== 1. Admin login ===');
  const admin = await login('quan.tri.vien@test.medicare.vn', 'Test@12345');
  console.log(admin.status, admin.data?.user?.fullName || admin.msg);
  const at = admin.data.accessToken;

  console.log('\n=== 2. Danh sach bac si (admin) ===');
  const docs = await fetch(`${B}/api/admin/doctors`, { headers: { Authorization: `Bearer ${at}` } });
  const dj = await docs.json();
  const list = dj.data?.items || dj.data || [];
  console.log(docs.status, `| ${list.length} bac si`);
  list.slice(0, 4).forEach((d) => console.log('   ', d.fullName, '|', d.email));

  console.log('\n=== 3. Danh sach benh nhan (admin) ===');
  const pats = await fetch(`${B}/api/admin/patients`, { headers: { Authorization: `Bearer ${at}` } });
  const pj = await pats.json();
  const plist = pj.data?.items || pj.data || [];
  console.log(pats.status, `| ${plist.length} benh nhan`);
  plist.slice(0, 4).forEach((p) => console.log('   ', p.fullName, '|', p.email));

  console.log('\n=== 4. AI chuan doan benh ===');
  const ai = await fetch(`${B}/api/ai/predict-disease`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${at}` },
    body: JSON.stringify({ symptoms: 'hắt hơi liên tục, ớn lạnh, ho, nghẹt mũi' }),
  });
  const aj = await ai.json();
  const d = aj.data || {};
  console.log(ai.status, '| nhan dien:', (d.recognizedSymptoms || []).join(', '));
  (d.diseases || []).slice(0, 3).forEach((x) => console.log('   ', x.name, x.probability + '%'));
  console.log('    so thuoc de xuat:', (d.medicines || []).length);

  console.log('\n=== 5. Chatbot ===');
  const cb = await fetch(`${B}/api/chatbot/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${at}` },
    body: JSON.stringify({ message: 'bac si nao khoa tim mach' }),
  });
  const cj = await cb.json();
  console.log(cb.status, '|', (cj.data?.reply || '').slice(0, 150).replace(/\n/g, ' '));

  console.log('\n=== 6. Phan quyen: benh nhan goi /api/ai ===');
  const pat = await login('quan.tri.vien@test.medicare.vn', 'Test@12345');
  const pub = await fetch(`${B}/api/specialties`);
  console.log('   specialties (cong khai):', pub.status);
})();
