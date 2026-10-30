// Kiểm thử ký/xác thực VNPay bằng khóa giả, không cần DB: node --test tests/vnpay.test.js
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.VNPAY_TMN_CODE = 'TESTCODE';
process.env.VNPAY_HASH_SECRET = 'TESTSECRETTESTSECRETTESTSECRET12';

const { __test } = await import('../src/services/payment.service.js');
const { default: pool } = await import('../src/config/db.js');
const { buildPaymentUrl, verifyVnp, vnpTime } = __test;

after(() => pool.end());

/** Mô phỏng VNPay: đọc tham số từ URL, giữ lại các trường cần thiết, ký lại bằng cùng secret. */
function urlToQuery(url) {
  return Object.fromEntries(new URL(url).searchParams.entries());
}

const sample = () => buildPaymentUrl({
  txnRef: '7' + Date.now(),
  cents: 150_000 * 100,
  orderInfo: 'Thanh toan hoa don 12 MediCare Hub',
  ip: '::ffff:127.0.0.1',
  bankCode: 'VNBANK',
  createdAt: new Date('2026-10-30T17:30:00Z'),
  expiresAt: new Date('2026-10-30T17:45:00Z'),
});

test('vnpTime trả về yyyyMMddHHmmss theo GMT+7', () => {
  assert.equal(vnpTime(new Date('2026-10-30T17:30:05Z')), '20261031003005');
});

test('URL thanh toán có đủ tham số bắt buộc và chữ ký hợp lệ', () => {
  const q = urlToQuery(sample());
  assert.equal(q.vnp_Version, '2.1.0');
  assert.equal(q.vnp_TmnCode, 'TESTCODE');
  assert.equal(q.vnp_Amount, '15000000');
  assert.equal(q.vnp_CreateDate, '20261031003000');
  assert.equal(q.vnp_ExpireDate, '20261031004500');
  assert.equal(q.vnp_IpAddr, '127.0.0.1');
  assert.equal(q.vnp_BankCode, 'VNBANK');
  assert.equal(q.vnp_OrderInfo, 'Thanh toan hoa don 12 MediCare Hub');
  assert.match(q.vnp_SecureHash, /^[0-9a-f]{128}$/);
  assert.equal(verifyVnp(q), true);
});

test('Sửa bất kỳ tham số nào thì chữ ký không còn hợp lệ', () => {
  const q = urlToQuery(sample());
  assert.equal(verifyVnp({ ...q, vnp_Amount: '100' }), false);
  assert.equal(verifyVnp({ ...q, vnp_SecureHash: 'a'.repeat(128) }), false);
  assert.equal(verifyVnp({ ...q, vnp_SecureHash: 'short' }), false);
});

test('Tham số không phải vnp_ (ví dụ do proxy thêm vào) không làm hỏng chữ ký', () => {
  const q = urlToQuery(sample());
  assert.equal(verifyVnp({ ...q, utm_source: 'x' }), true);
});
