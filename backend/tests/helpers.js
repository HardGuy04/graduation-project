// Tiện ích cho test tích hợp: gọi API thật đang chạy (mặc định http://localhost:5000).
// Mọi dữ liệu test dùng email test-<run>-...@example.com để dễ nhận biết và dọn bằng tests/cleanup.js.
export const BASE = process.env.API_URL || 'http://localhost:5000';
export const RUN = Date.now().toString(36);

export const testEmail = (tag) => `test-${RUN}-${tag}@example.com`;

export async function api(method, path, { token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, body: json };
}

export async function registerPatient(tag, extra = {}) {
  const email = testEmail(tag);
  const res = await api('POST', '/api/auth/register', {
    body: { fullName: `Test ${tag}`, email, phone: '0900000000', password: 'Test@12345', ...extra },
  });
  if (res.status !== 201) throw new Error(`Đăng ký ${email} thất bại: ${res.status} ${JSON.stringify(res.body)}`);
  return { email, password: 'Test@12345', ...res.body.data };
}

// Tài khoản do `npm run seed` tạo
export const SEED = {
  admin: 'test-seed-admin@example.com',
  doctor1: 'test-seed-doctor1@example.com',
  doctor2: 'test-seed-doctor2@example.com',
  password: process.env.SEED_PASSWORD || 'Test@12345',
};

export const seedLogin = (who) => login(SEED[who], SEED.password);

// Truy vấn DB trực tiếp chỉ để kiểm chứng (đếm dòng) hoặc dời giờ lịch hẹn TEST về quá khứ — nạp lười
// để các file test không cần DB không mở pool.
let poolPromise;
export async function dbQuery(sql, params = []) {
  poolPromise ||= import('../src/config/db.js').then((m) => m.default);
  const [rows] = await (await poolPromise).query(sql, params);
  return rows;
}
export async function dbClose() {
  if (poolPromise) await (await poolPromise).end();
}

/** Admin tạo một bác sĩ riêng cho lần chạy test (lịch/ngày nghỉ không đụng bác sĩ seed). */
export async function createTestDoctor(adminToken, tag) {
  const sp = await api('GET', `/api/specialties?q=${encodeURIComponent('TEST-')}`);
  const specialtyId = sp.body.data[0]?.id;
  if (!specialtyId) throw new Error('Chưa có chuyên khoa TEST-, hãy chạy npm run seed');
  const email = testEmail(tag);
  const r = await api('POST', '/api/admin/users', {
    token: adminToken,
    body: { role: 'DOCTOR', email, fullName: `TEST Bác sĩ ${tag}`, password: 'Test@12345', specialtyId },
  });
  if (r.status !== 201) throw new Error(`Tạo bác sĩ thất bại: ${r.status} ${JSON.stringify(r.body)}`);
  const session = await login(email, 'Test@12345');
  return { email, id: r.body.data.doctor.id, userId: r.body.data.id, ...session };
}

const pad = (n) => String(n).padStart(2, '0');
const CLINIC_OFFSET_MS = 7 * 3_600_000;

/** Ngày (giờ phòng khám +07:00) cách hôm nay `days` ngày, kèm thứ theo quy ước DB (1 = Thứ 2 ... 7 = CN). */
export function clinicDate(days) {
  const d = new Date(Date.now() + CLINIC_OFFSET_MS + days * 86_400_000);
  const js = d.getUTCDay();
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    dow: js === 0 ? 7 : js,
  };
}

export async function login(email, password) {
  const res = await api('POST', '/api/auth/login', { body: { email, password } });
  if (res.status !== 200) throw new Error(`Đăng nhập ${email} thất bại: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data;
}
