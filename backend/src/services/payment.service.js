// Cổng nạp ví VNPay (sandbox). Chưa cấu hình VNPAY_TMN_CODE thì topup() mô phỏng như cũ.
// Idempotent: UPDATE payment_intent SET status='PAID' WHERE txn_ref=? AND status='PENDING' + affectedRows.
import crypto from 'node:crypto';
import pool, { withTransaction } from '../config/db.js';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import * as v from '../utils/validate.js';
import { topup as simulateTopup } from './invoice.service.js';

const VNP_PAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

export function vnpayEnabled() {
  return Boolean(env.VNPAY_TMN_CODE && env.VNPAY_HASH_SECRET);
}

// Thuật toán ký đúng mẫu Node.js của VNPay (encode rồi sort key)
function sortVnp(obj) {
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    if (obj[key] === undefined || obj[key] === null || obj[key] === '') continue;
    if (key === 'vnp_SecureHash' || key === 'vnp_SecureHashType') continue;
    sorted[key] = encodeURIComponent(String(obj[key])).replace(/%20/g, '+');
  }
  return sorted;
}

function signVnp(params) {
  const sorted = sortVnp(params);
  const signData = Object.entries(sorted).map(([k, val]) => `${k}=${val}`).join('&');
  return crypto.createHmac('sha512', env.VNPAY_HASH_SECRET).update(signData).digest('hex');
}

function verifyVnp(query) {
  const received = String(query.vnp_SecureHash || '').toLowerCase();
  const computed = signVnp(query).toLowerCase();
  return received && received === computed;
}

async function creditFromIntent(conn, intent) {
  const [w] = await conn.query('SELECT id FROM wallet WHERE patient_id = ? FOR UPDATE', [intent.patient_id]);
  if (!w.length) throw new AppError(404, 'WALLET_NOT_FOUND', 'Bệnh nhân chưa có ví');
  await conn.query('UPDATE wallet SET balance = balance + ? WHERE id = ?', [intent.amount, w[0].id]);
  const [[after]] = await conn.query('SELECT balance FROM wallet WHERE id = ?', [w[0].id]);
  await conn.query(
    "INSERT INTO wallet_transaction (wallet_id, type, amount, balance_after) VALUES (?, 'TOPUP', ?, ?)",
    [w[0].id, intent.amount, after.balance],
  );
  return after.balance;
}

/** Bệnh nhân nạp ví: có khóa VNPay thì trả URL thanh toán; không thì mô phỏng. */
export async function patientTopup(patientId, b, { ip = '127.0.0.1' } = {}) {
  if (!vnpayEnabled()) return simulateTopup(patientId, b);
  const pid = v.id(patientId, 'patientId');
  const cents = v.money(b.amount, 'amount');
  if (cents < 10_000 * 100 || cents > 50_000_000 * 100) {
    throw new AppError(400, 'INVALID_INPUT', 'Số tiền nạp VNPay phải từ 10.000đ đến 50.000.000đ');
  }
  const amount = v.centsToDecimal(cents);
  const txnRef = `${pid}${Date.now()}${crypto.randomBytes(3).toString('hex')}`;
  try {
    await pool.query(
      "INSERT INTO payment_intent (patient_id, amount, provider, txn_ref, status) VALUES (?, ?, 'VNPAY', ?, 'PENDING')",
      [pid, amount, txnRef],
    );
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      throw new AppError(503, 'PAYMENT_NOT_READY', 'Chưa chạy migration 003_payment_intent.sql');
    }
    throw err;
  }

  const created = v.toMysql(new Date()).replace(/[- :]/g, '').slice(0, 14);
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: env.VNPAY_TMN_CODE,
    vnp_Amount: String(cents), // VNPay tính bằng xu
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: `Nap vi MediCare Hub ${amount}`,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: env.VNPAY_RETURN_URL,
    vnp_IpAddr: ip.replace(/^::ffff:/, '') || '127.0.0.1',
    vnp_CreateDate: created,
  };
  params.vnp_SecureHash = signVnp(params);
  const qs = Object.entries(params)
    .map(([k, val]) => `${k}=${encodeURIComponent(String(val)).replace(/%20/g, '+')}`)
    .join('&');
  return { provider: 'VNPAY', paymentUrl: `${VNP_PAY_URL}?${qs}`, txnRef, amount };
}

async function settle(query) {
  if (!vnpayEnabled()) throw new AppError(503, 'PAYMENT_NOT_READY', 'VNPay chưa được cấu hình');
  if (!verifyVnp(query)) throw new AppError(400, 'INVALID_SIGNATURE', 'Chữ ký VNPay không hợp lệ');
  const txnRef = v.str(query.vnp_TxnRef, 'vnp_TxnRef', { required: true, max: 64 });
  const rsp = String(query.vnp_ResponseCode || '');
  return withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT id, patient_id, amount, status FROM payment_intent WHERE txn_ref = ? FOR UPDATE', [txnRef]);
    if (!rows.length) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Không tìm thấy lệnh nạp');
    const intent = rows[0];
    if (intent.status === 'PAID') return { alreadyPaid: true, txnRef, amount: intent.amount };
    if (rsp !== '00') {
      await conn.query("UPDATE payment_intent SET status = 'FAILED' WHERE id = ? AND status = 'PENDING'", [intent.id]);
      throw new AppError(402, 'PAYMENT_FAILED', 'Thanh toán không thành công hoặc đã bị hủy');
    }
    const [u] = await conn.query(
      "UPDATE payment_intent SET status = 'PAID', paid_at = UTC_TIMESTAMP() WHERE id = ? AND status = 'PENDING'",
      [intent.id],
    );
    if (u.affectedRows !== 1) return { alreadyPaid: true, txnRef, amount: intent.amount };
    const balance = await creditFromIntent(conn, intent);
    return { alreadyPaid: false, txnRef, amount: intent.amount, balance };
  });
}

export async function vnpayReturn(query) {
  return settle(query);
}

export async function vnpayIpn(query) {
  try {
    const r = await settle(query);
    return { RspCode: '00', Message: r.alreadyPaid ? 'Already confirmed' : 'Confirm Success' };
  } catch (err) {
    if (err.code === 'INVALID_SIGNATURE') return { RspCode: '97', Message: 'Invalid signature' };
    if (err.code === 'PAYMENT_NOT_FOUND') return { RspCode: '01', Message: 'Order not found' };
    if (err.code === 'PAYMENT_FAILED') return { RspCode: '00', Message: 'Recorded failure' };
    throw err;
  }
}
