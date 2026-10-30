// Cổng thanh toán VNPay (API v2.1.0, sandbox): nạp ví và thanh toán hóa đơn trực tiếp.
// Chưa cấu hình VNPAY_TMN_CODE / VNPAY_HASH_SECRET thì nạp ví mô phỏng như cũ, thanh toán hóa đơn qua VNPay bị tắt.
// Idempotent: UPDATE payment_intent ... WHERE status='PENDING' + affectedRows, nên return URL và IPN gọi trùng không cộng tiền hai lần.
import crypto from 'node:crypto';
import pool, { withTransaction } from '../config/db.js';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import * as v from '../utils/validate.js';
import { NOTIFICATION_TYPE, PAYMENT_STATUS } from '../utils/constants.js';
import { notify } from './notification.service.js';
import { topup as simulateTopup } from './invoice.service.js';

const VNP_PAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNP_TZ_MINUTES = 7 * 60; // VNPay yêu cầu vnp_CreateDate / vnp_ExpireDate theo GMT+7
const EXPIRE_MINUTES = 15;
const MIN_CENTS = 10_000 * 100; // VNPay không nhận giao dịch dưới 10.000đ
const MAX_CENTS = 50_000_000 * 100;
const BANK_CODES = ['VNPAYQR', 'VNBANK', 'INTCARD'];

export const PURPOSE = Object.freeze({ TOPUP: 'TOPUP', INVOICE: 'INVOICE' });

export function vnpayEnabled() {
  return Boolean(env.VNPAY_TMN_CODE && env.VNPAY_HASH_SECRET);
}

export function paymentConfig() {
  return { vnpayEnabled: vnpayEnabled(), minAmount: MIN_CENTS / 100, maxAmount: MAX_CENTS / 100, bankCodes: BANK_CODES };
}

// ── Ký / xác thực (đúng mẫu Node.js của VNPay: encode giá trị, sort key, nối không encode lại) ──

function sortVnp(obj) {
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    if (!key.startsWith('vnp_')) continue;
    if (key === 'vnp_SecureHash' || key === 'vnp_SecureHashType') continue;
    if (obj[key] === undefined || obj[key] === null || obj[key] === '') continue;
    sorted[key] = encodeURIComponent(String(obj[key])).replace(/%20/g, '+');
  }
  return sorted;
}

function signVnp(params) {
  const signData = Object.entries(sortVnp(params)).map(([k, val]) => `${k}=${val}`).join('&');
  return crypto.createHmac('sha512', env.VNPAY_HASH_SECRET).update(Buffer.from(signData, 'utf-8')).digest('hex');
}

function verifyVnp(query) {
  const received = String(query.vnp_SecureHash || '').toLowerCase();
  if (!/^[0-9a-f]{128}$/.test(received)) return false;
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(signVnp(query)));
}

/** Date → yyyyMMddHHmmss theo GMT+7. */
function vnpTime(d) {
  const t = new Date(d.getTime() + VNP_TZ_MINUTES * 60_000).toISOString();
  return t.slice(0, 19).replace(/[-T:]/g, '');
}

function buildPaymentUrl({ txnRef, cents, orderInfo, ip, bankCode, createdAt, expiresAt }) {
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: env.VNPAY_TMN_CODE,
    vnp_Amount: String(cents), // VNPay tính bằng đơn vị x100
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: env.VNPAY_RETURN_URL,
    vnp_IpAddr: String(ip || '').replace(/^::ffff:/, '') || '127.0.0.1',
    vnp_CreateDate: vnpTime(createdAt),
    vnp_ExpireDate: vnpTime(expiresAt),
    vnp_BankCode: bankCode || undefined,
  };
  const sorted = sortVnp(params);
  const qs = Object.entries(sorted).map(([k, val]) => `${k}=${val}`).join('&');
  return `${VNP_PAY_URL}?${qs}&vnp_SecureHash=${signVnp(params)}`;
}

function parseBankCode(b) {
  return v.oneOf(b?.bankCode || undefined, 'bankCode', BANK_CODES, { required: false }) || null;
}

const newTxnRef = (patientId) => `${patientId}${Date.now()}${crypto.randomBytes(3).toString('hex')}`;

function notReady(err) {
  if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_FIELD_ERROR') {
    return new AppError(503, 'PAYMENT_NOT_READY', 'Chưa chạy migration 003_payment_intent.sql và 004_vnpay_invoice.sql');
  }
  return err;
}

async function createIntent(conn, { patientId, invoiceId = null, purpose, amount, txnRef, createdAt, expiresAt }) {
  await conn.query(
    `INSERT INTO payment_intent (patient_id, invoice_id, amount, provider, purpose, txn_ref, status, created_at, expires_at)
     VALUES (?, ?, ?, 'VNPAY', ?, ?, 'PENDING', ?, ?)`,
    [patientId, invoiceId, amount, purpose, txnRef, v.toMysql(createdAt), v.toMysql(expiresAt)],
  );
}

// ── Tạo giao dịch ───────────────────────────────────────────────────────────

/** Bệnh nhân nạp ví: có khóa VNPay thì trả URL thanh toán; không thì mô phỏng. */
export async function patientTopup(patientId, b, { ip } = {}) {
  if (!vnpayEnabled()) return simulateTopup(patientId, b);
  const pid = v.id(patientId, 'patientId');
  const cents = v.money(b.amount, 'amount');
  if (cents < MIN_CENTS || cents > MAX_CENTS) {
    throw new AppError(400, 'INVALID_INPUT', 'Số tiền nạp qua VNPay phải từ 10.000đ đến 50.000.000đ');
  }
  const bankCode = parseBankCode(b);
  const amount = v.centsToDecimal(cents);
  const txnRef = newTxnRef(pid);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + EXPIRE_MINUTES * 60_000);
  try {
    await createIntent(pool, { patientId: pid, purpose: PURPOSE.TOPUP, amount, txnRef, createdAt, expiresAt });
  } catch (err) {
    throw notReady(err);
  }
  const paymentUrl = buildPaymentUrl({
    txnRef, cents, ip, bankCode, createdAt, expiresAt,
    orderInfo: `Nap vi MediCare Hub ${cents / 100} VND`,
  });
  return { provider: 'VNPAY', purpose: PURPOSE.TOPUP, paymentUrl, txnRef, amount, expiresAt: expiresAt.toISOString() };
}

/** Bệnh nhân trả hóa đơn trực tiếp qua VNPay (không qua ví). */
export async function patientPayInvoice(user, invoiceId, b, { ip } = {}) {
  if (!vnpayEnabled()) throw new AppError(503, 'PAYMENT_NOT_READY', 'Cổng VNPay chưa được cấu hình');
  const iid = v.id(invoiceId, 'id');
  const bankCode = parseBankCode(b);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + EXPIRE_MINUTES * 60_000);
  try {
    const { cents, txnRef } = await withTransaction(async (conn) => {
      const [rows] = await conn.query(
        `SELECT i.id, i.total_amount, i.payment_status
           FROM invoice i JOIN appointment a ON a.id = i.appointment_id
          WHERE i.id = ? AND a.patient_id = ? FOR UPDATE`,
        [iid, user.patientId],
      );
      if (!rows.length) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Hóa đơn không tồn tại');
      const inv = rows[0];
      if (inv.payment_status !== PAYMENT_STATUS.UNPAID) {
        throw new AppError(409, 'INVOICE_NOT_PAYABLE', `Hóa đơn đang ở trạng thái ${inv.payment_status}`);
      }
      const c = v.decimalToCents(inv.total_amount);
      if (c < MIN_CENTS || c > MAX_CENTS) {
        throw new AppError(400, 'INVALID_INPUT', 'VNPay chỉ nhận hóa đơn từ 10.000đ đến 50.000.000đ');
      }
      const ref = newTxnRef(user.patientId);
      await createIntent(conn, {
        patientId: user.patientId, invoiceId: iid, purpose: PURPOSE.INVOICE,
        amount: inv.total_amount, txnRef: ref, createdAt, expiresAt,
      });
      return { cents: c, txnRef: ref };
    });
    const paymentUrl = buildPaymentUrl({
      txnRef, cents, ip, bankCode, createdAt, expiresAt,
      orderInfo: `Thanh toan hoa don ${iid} MediCare Hub`,
    });
    return { provider: 'VNPAY', purpose: PURPOSE.INVOICE, paymentUrl, txnRef, invoiceId: iid, expiresAt: expiresAt.toISOString() };
  } catch (err) {
    throw notReady(err);
  }
}

// ── Ghi nhận kết quả ────────────────────────────────────────────────────────

async function creditWallet(conn, patientId, amount, invoiceId = null) {
  const [w] = await conn.query('SELECT id FROM wallet WHERE patient_id = ? FOR UPDATE', [patientId]);
  if (!w.length) throw new AppError(404, 'WALLET_NOT_FOUND', 'Bệnh nhân chưa có ví');
  await conn.query('UPDATE wallet SET balance = balance + ? WHERE id = ?', [amount, w[0].id]);
  const [[after]] = await conn.query('SELECT balance FROM wallet WHERE id = ?', [w[0].id]);
  await conn.query(
    "INSERT INTO wallet_transaction (wallet_id, invoice_id, type, amount, balance_after) VALUES (?, ?, 'TOPUP', ?, ?)",
    [w[0].id, invoiceId, amount, after.balance],
  );
  return after.balance;
}

/** Hóa đơn → PAID/VNPAY. Nếu hóa đơn đã được trả bằng cách khác trong lúc chờ VNPay thì cộng tiền vào ví, không mất tiền. */
async function settleInvoice(conn, intent) {
  const [[inv]] = await conn.query(
    'SELECT id, appointment_id FROM invoice WHERE id = ? FOR UPDATE', [intent.invoice_id],
  );
  const [u] = await conn.query(
    `UPDATE invoice SET payment_status = 'PAID', payment_method = 'VNPAY', paid_at = UTC_TIMESTAMP()
      WHERE id = ? AND payment_status = 'UNPAID'`,
    [intent.invoice_id],
  );
  const amountText = `${new Intl.NumberFormat('vi-VN').format(Math.trunc(Number(intent.amount)))}đ`;
  if (u.affectedRows === 1) {
    await notify(conn, {
      patientId: intent.patient_id, appointmentId: inv?.appointment_id ?? null, type: NOTIFICATION_TYPE.INVOICE_PAID,
      text: `Đã thanh toán hóa đơn #${intent.invoice_id} (${amountText}) qua VNPay.`,
    });
    return { creditedToWallet: false };
  }
  await creditWallet(conn, intent.patient_id, intent.amount, null);
  await notify(conn, {
    patientId: intent.patient_id, type: NOTIFICATION_TYPE.INVOICE_PAID,
    text: `Hóa đơn #${intent.invoice_id} đã được thanh toán trước đó; ${amountText} từ VNPay đã được cộng vào ví.`,
  });
  return { creditedToWallet: true };
}

/**
 * Xác thực tham số VNPay gửi về rồi cập nhật đơn trong một transaction.
 * Trả { outcome: 'PAID' | 'FAILED' | 'ALREADY', ... }; chỉ ném lỗi khi chữ ký sai, không tìm thấy đơn hoặc lệch số tiền.
 */
async function settle(query) {
  if (!vnpayEnabled()) throw new AppError(503, 'PAYMENT_NOT_READY', 'VNPay chưa được cấu hình');
  if (!verifyVnp(query) || query.vnp_TmnCode !== env.VNPAY_TMN_CODE) {
    throw new AppError(400, 'INVALID_SIGNATURE', 'Chữ ký VNPay không hợp lệ');
  }
  const txnRef = v.str(query.vnp_TxnRef, 'vnp_TxnRef', { required: true, max: 64 });
  const responseCode = String(query.vnp_ResponseCode || '').slice(0, 4);
  const txStatus = String(query.vnp_TransactionStatus ?? responseCode);
  const success = responseCode === '00' && txStatus === '00';
  const transactionNo = String(query.vnp_TransactionNo || '').slice(0, 32) || null;
  const bankCode = String(query.vnp_BankCode || '').slice(0, 20) || null;

  return withTransaction(async (conn) => {
    const [rows] = await conn.query(
      'SELECT id, patient_id, invoice_id, purpose, amount, status FROM payment_intent WHERE txn_ref = ? FOR UPDATE', [txnRef],
    );
    if (!rows.length) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Không tìm thấy giao dịch');
    const intent = rows[0];
    const base = { txnRef, purpose: intent.purpose, invoiceId: intent.invoice_id, amount: intent.amount, responseCode };

    if (Number(query.vnp_Amount) !== v.decimalToCents(intent.amount)) {
      throw new AppError(400, 'AMOUNT_MISMATCH', 'Số tiền VNPay trả về không khớp giao dịch');
    }
    if (intent.status !== 'PENDING') return { ...base, outcome: 'ALREADY', status: intent.status };

    const [u] = await conn.query(
      `UPDATE payment_intent SET status = ?, response_code = ?, transaction_no = ?, bank_code = ?,
              paid_at = IF(? = 'PAID', UTC_TIMESTAMP(), NULL)
        WHERE id = ? AND status = 'PENDING'`,
      [success ? 'PAID' : 'FAILED', responseCode, transactionNo, bankCode, success ? 'PAID' : 'FAILED', intent.id],
    );
    if (u.affectedRows !== 1) return { ...base, outcome: 'ALREADY' };
    if (!success) return { ...base, outcome: 'FAILED' };

    if (intent.purpose === PURPOSE.INVOICE) {
      const r = await settleInvoice(conn, intent);
      return { ...base, outcome: 'PAID', ...r };
    }
    const balance = await creditWallet(conn, intent.patient_id, intent.amount);
    return { ...base, outcome: 'PAID', balance };
  });
}

/** Trình duyệt quay về từ VNPay. Ghi nhận luôn (idempotent) vì khi chạy localhost VNPay không gọi được IPN. */
export async function vnpayReturn(query) {
  return settle(query);
}

export const __test = { buildPaymentUrl, verifyVnp, vnpTime };

/** VNPay gọi server-to-server; mã RspCode theo tài liệu VNPay. */
export async function vnpayIpn(query) {
  try {
    const r = await settle(query);
    if (r.outcome === 'ALREADY') return { RspCode: '02', Message: 'Order already confirmed' };
    return { RspCode: '00', Message: 'Confirm Success' };
  } catch (err) {
    if (err.code === 'INVALID_SIGNATURE') return { RspCode: '97', Message: 'Invalid signature' };
    if (err.code === 'PAYMENT_NOT_FOUND') return { RspCode: '01', Message: 'Order not found' };
    if (err.code === 'AMOUNT_MISMATCH') return { RspCode: '04', Message: 'Invalid amount' };
    if (err.code === 'INVALID_INPUT') return { RspCode: '99', Message: 'Invalid input' };
    console.error('[vnpay ipn]', err);
    return { RspCode: '99', Message: 'Unknown error' };
  }
}
