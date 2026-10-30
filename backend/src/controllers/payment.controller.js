import * as payment from '../services/payment.service.js';
import env from '../config/env.js';
import { ok } from '../utils/response.js';

export async function config(req, res) {
  ok(res, payment.paymentConfig());
}

/** Kết quả trả về trang Hóa đơn của bệnh nhân qua query ?vnpay=success|failed|error&purpose=&code=&invoice= */
export async function vnpayReturn(req, res) {
  const target = new URL('/patient/invoices', env.FRONTEND_URL);
  try {
    const r = await payment.vnpayReturn(req.query);
    const paid = r.outcome === 'PAID' || (r.outcome === 'ALREADY' && r.status === 'PAID');
    target.searchParams.set('vnpay', paid ? 'success' : 'failed');
    target.searchParams.set('purpose', String(r.purpose).toLowerCase());
    if (r.invoiceId) target.searchParams.set('invoice', String(r.invoiceId));
    if (r.responseCode) target.searchParams.set('code', r.responseCode);
    if (r.creditedToWallet) target.searchParams.set('wallet', '1');
  } catch (err) {
    target.searchParams.set('vnpay', 'error');
    target.searchParams.set('reason', err.code || 'UNKNOWN');
  }
  res.redirect(target.toString());
}

export async function vnpayIpn(req, res) {
  // VNPay đòi { RspCode, Message } ở root, không bọc trong { data }
  res.status(200).json(await payment.vnpayIpn(req.query));
}
