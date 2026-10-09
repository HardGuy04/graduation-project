import * as payment from '../services/payment.service.js';
import env from '../config/env.js';

export async function vnpayReturn(req, res) {
  const fe = env.FRONTEND_URL.replace(/\/$/, '');
  try {
    await payment.vnpayReturn(req.query);
    res.redirect(`${fe}/patient/invoices?topup=ok`);
  } catch {
    res.redirect(`${fe}/patient/invoices?topup=fail`);
  }
}

export async function vnpayIpn(req, res) {
  // VNPay đòi { RspCode, Message } ở root, không bọc trong { data }
  res.json(await payment.vnpayIpn(req.query));
}
