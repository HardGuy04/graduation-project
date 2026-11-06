// Hóa đơn, thanh toán và ví bệnh nhân.
// Tiền: client gửi số/chuỗi → quy ra số nguyên "xu" để cộng không sai số; DB lưu DECIMAL(12,2);
// trả về client dạng chuỗi '150000.00' (mysql2 trả DECIMAL là chuỗi — giữ nguyên để không mất chính xác).
// Mọi biến động số dư ví đều ghi wallet_transaction trong cùng transaction.
import pool, { withTransaction } from '../config/db.js';
import AppError from '../utils/AppError.js';
import * as v from '../utils/validate.js';
import { ROLES, APPT_STATUS, PAYMENT_STATUS, NOTIFICATION_TYPE } from '../utils/constants.js';
import { notify } from './notification.service.js';

const notFound = () => new AppError(404, 'INVOICE_NOT_FOUND', 'Hóa đơn không tồn tại');
const MAX_ITEMS = 50;
const TOPUP_MIN = 1_000 * 100; // 1.000đ (tính bằng xu)
const TOPUP_MAX = 50_000_000 * 100; // 50 triệu đồng / lần
const OFFLINE_METHODS = ['CASH', 'CARD', 'TRANSFER'];

const vnd = (decimalStr) => `${new Intl.NumberFormat('vi-VN').format(Math.trunc(Number(decimalStr)))}đ`;

const SELECT_INVOICE = `
  SELECT i.id, i.appointment_id, i.total_amount, i.payment_status, i.payment_method, i.paid_at, i.created_at,
         a.start_at, a.status AS appointment_status, a.patient_id, a.doctor_id,
         pu.full_name AS patient_name, pu.phone AS patient_phone, du.full_name AS doctor_name
    FROM invoice i
    JOIN appointment a ON a.id = i.appointment_id
    JOIN patient p ON p.id = a.patient_id
    JOIN users pu ON pu.id = p.user_id
    JOIN doctor d ON d.id = a.doctor_id
    JOIN users du ON du.id = d.user_id`;

function serialize(r, items) {
  return {
    id: r.id,
    appointmentId: r.appointment_id,
    appointment: { startAt: v.fromMysql(r.start_at), status: r.appointment_status },
    patient: { id: r.patient_id, fullName: r.patient_name, phone: r.patient_phone },
    doctor: { id: r.doctor_id, fullName: r.doctor_name },
    totalAmount: r.total_amount,
    paymentStatus: r.payment_status,
    paymentMethod: r.payment_method,
    paidAt: v.fromMysql(r.paid_at),
    createdAt: v.fromMysql(r.created_at),
    items: items || [],
  };
}

async function withItems(conn, rows) {
  if (!rows.length) return [];
  const [items] = await conn.query(
    'SELECT id, invoice_id, label, amount FROM invoice_detail WHERE invoice_id IN (?) ORDER BY id', [rows.map((r) => r.id)],
  );
  const map = new Map();
  for (const it of items) {
    if (!map.has(it.invoice_id)) map.set(it.invoice_id, []);
    map.get(it.invoice_id).push({ id: it.id, label: it.label, amount: it.amount });
  }
  return rows.map((r) => serialize(r, map.get(r.id)));
}

const scopeOf = (user) => (user.role === ROLES.PATIENT
  ? { sql: 'a.patient_id = ?', params: [user.patientId] }
  : { sql: '1 = 1', params: [] });

async function fetchOne(conn, user, id) {
  const scope = scopeOf(user);
  const [rows] = await conn.query(`${SELECT_INVOICE} WHERE i.id = ? AND ${scope.sql}`, [id, ...scope.params]);
  return (await withItems(conn, rows))[0] || null;
}

// ── Xem ──────────────────────────────────────────────────────────────────────

export async function list(user, query) {
  const { page, limit, offset } = v.pagination(query);
  const scope = scopeOf(user);
  const where = [scope.sql];
  const params = [...scope.params];
  const status = v.oneOf(query.paymentStatus ?? query.status, 'paymentStatus', Object.values(PAYMENT_STATUS), { required: false });
  if (status) { where.push('i.payment_status = ?'); params.push(status); }
  const from = v.dateOnly(query.from, 'from', { required: false });
  const to = v.dateOnly(query.to, 'to', { required: false });
  if (from) { where.push('i.created_at >= ?'); params.push(v.toMysql(v.clinicDayRange(from).start)); }
  if (to) { where.push('i.created_at < ?'); params.push(v.toMysql(v.clinicDayRange(to).end)); }
  const appointmentId = v.optionalId(query.appointmentId, 'appointmentId');
  if (appointmentId) { where.push('i.appointment_id = ?'); params.push(appointmentId); }
  if (user.role === ROLES.ADMIN) {
    const patientId = v.optionalId(query.patientId, 'patientId');
    if (patientId) { where.push('a.patient_id = ?'); params.push(patientId); }
    const q = v.likePattern(query.q);
    if (q) { where.push('(pu.full_name LIKE ? OR pu.phone LIKE ?)'); params.push(q, q); }
  }
  const w = where.join(' AND ');
  const [rows] = await pool.query(
    `${SELECT_INVOICE} WHERE ${w} ORDER BY i.created_at DESC, i.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset],
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM invoice i JOIN appointment a ON a.id = i.appointment_id
       JOIN patient p ON p.id = a.patient_id JOIN users pu ON pu.id = p.user_id WHERE ${w}`,
    params,
  );
  return { rows: await withItems(pool, rows), page, limit, total };
}

export async function get(user, id) {
  const inv = await fetchOne(pool, user, v.id(id, 'id'));
  if (!inv) throw notFound();
  return inv;
}

// ── Admin: lập hóa đơn & ghi nhận thanh toán ────────────────────────────────

function parseItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    throw new AppError(400, 'INVALID_INPUT', `Hóa đơn phải có từ 1 đến ${MAX_ITEMS} dòng chi tiết`);
  }
  return items.map((it, i) => {
    if (it === null || typeof it !== 'object') throw new AppError(400, 'INVALID_INPUT', `items[${i}] không hợp lệ`);
    return {
      label: v.str(it.label ?? it.name, `items[${i}].label`, { required: true, max: 255 }),
      cents: v.money(it.amount, `items[${i}].amount`),
    };
  });
}

/** Chỉ lập hóa đơn cho lịch đã khám xong (DONE); mỗi lịch tối đa 1 hóa đơn (unique appointment_id). */
export async function create(b) {
  const appointmentId = v.id(b.appointmentId, 'appointmentId');
  const items = parseItems(b.items);
  const totalCents = items.reduce((s, it) => s + it.cents, 0);
  if (totalCents > 999_999_999_999) throw new AppError(400, 'INVALID_INPUT', 'Tổng tiền vượt giới hạn cho phép');

  try {
    return await withTransaction(async (conn) => {
      const [appt] = await conn.query('SELECT id, status, patient_id FROM appointment WHERE id = ? FOR UPDATE', [appointmentId]);
      if (!appt.length) throw new AppError(404, 'APPOINTMENT_NOT_FOUND', 'Lịch hẹn không tồn tại');
      if (appt[0].status !== APPT_STATUS.DONE) {
        throw new AppError(409, 'INVALID_STATUS', 'Chỉ lập hóa đơn cho lịch hẹn đã khám xong');
      }
      const total = v.centsToDecimal(totalCents);
      const [r] = await conn.query('INSERT INTO invoice (appointment_id, total_amount) VALUES (?, ?)', [appointmentId, total]);
      await conn.query(
        'INSERT INTO invoice_detail (invoice_id, label, amount) VALUES ?',
        [items.map((it) => [r.insertId, it.label, v.centsToDecimal(it.cents)])],
      );
      await notify(conn, {
        patientId: appt[0].patient_id, appointmentId, type: NOTIFICATION_TYPE.INVOICE_CREATED,
        text: `Phòng khám đã lập hóa đơn #${r.insertId} với tổng tiền ${vnd(total)}.`,
      });
      return fetchOne(conn, { role: ROLES.ADMIN }, r.insertId);
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new AppError(409, 'INVOICE_EXISTS', 'Lịch hẹn này đã có hóa đơn');
    throw err;
  }
}

/** UPDATE có điều kiện UNPAID: hai lễ tân bấm "đã thu" cùng lúc thì chỉ một lần được ghi nhận. */
export async function payOffline(id, b) {
  const iid = v.id(id, 'id');
  const method = v.oneOf(b.method ?? b.paymentMethod, 'method', OFFLINE_METHODS);
  return withTransaction(async (conn) => {
    const [r] = await conn.query(
      `UPDATE invoice SET payment_status = 'PAID', payment_method = ?, paid_at = UTC_TIMESTAMP()
        WHERE id = ? AND payment_status = 'UNPAID'`,
      [method, iid],
    );
    const inv = await fetchOne(conn, { role: ROLES.ADMIN }, iid);
    if (!inv) throw notFound();
    if (r.affectedRows !== 1) throw new AppError(409, 'INVOICE_NOT_PAYABLE', `Hóa đơn đang ở trạng thái ${inv.paymentStatus}`);
    await notify(conn, {
      patientId: inv.patient.id, appointmentId: inv.appointmentId, type: NOTIFICATION_TYPE.INVOICE_PAID,
      text: `Hóa đơn #${iid} (${vnd(inv.totalAmount)}) đã được thanh toán.`,
    });
    return inv;
  });
}

// ── Ví ───────────────────────────────────────────────────────────────────────

async function lockWallet(conn, patientId) {
  const [rows] = await conn.query('SELECT id, balance FROM wallet WHERE patient_id = ? FOR UPDATE', [patientId]);
  if (!rows.length) throw new AppError(404, 'WALLET_NOT_FOUND', 'Bệnh nhân chưa có ví');
  return rows[0];
}

async function balanceOf(conn, walletId) {
  const [[w]] = await conn.query('SELECT balance FROM wallet WHERE id = ?', [walletId]);
  return w.balance;
}

/**
 * Bệnh nhân trả hóa đơn bằng ví. Khóa invoice → wallet (thứ tự cố định).
 * Trừ tiền bằng UPDATE ... WHERE balance >= ? để số dư không bao giờ âm kể cả khi có request song song.
 */
export async function payWithWallet(user, id) {
  const iid = v.id(id, 'id');
  return withTransaction(async (conn) => {
    const [rows] = await conn.query(
      `SELECT i.id, i.total_amount, i.payment_status, i.appointment_id
         FROM invoice i JOIN appointment a ON a.id = i.appointment_id
        WHERE i.id = ? AND a.patient_id = ? FOR UPDATE`,
      [iid, user.patientId],
    );
    if (!rows.length) throw notFound();
    const inv = rows[0];
    if (inv.payment_status !== PAYMENT_STATUS.UNPAID) {
      throw new AppError(409, 'INVOICE_NOT_PAYABLE', `Hóa đơn đang ở trạng thái ${inv.payment_status}`);
    }
    const wallet = await lockWallet(conn, user.patientId);
    const [debit] = await conn.query(
      'UPDATE wallet SET balance = balance - ? WHERE id = ? AND balance >= ?',
      [inv.total_amount, wallet.id, inv.total_amount],
    );
    if (debit.affectedRows !== 1) throw new AppError(409, 'INSUFFICIENT_BALANCE', 'Số dư ví không đủ để thanh toán');
    const [paid] = await conn.query(
      `UPDATE invoice SET payment_status = 'PAID', payment_method = 'WALLET', paid_at = UTC_TIMESTAMP()
        WHERE id = ? AND payment_status = 'UNPAID'`,
      [iid],
    );
    if (paid.affectedRows !== 1) throw new AppError(409, 'INVOICE_NOT_PAYABLE', 'Hóa đơn vừa được thanh toán');
    const after = await balanceOf(conn, wallet.id);
    await conn.query(
      "INSERT INTO wallet_transaction (wallet_id, invoice_id, type, amount, balance_after) VALUES (?, ?, 'PAYMENT', ?, ?)",
      [wallet.id, iid, inv.total_amount, after],
    );
    await notify(conn, {
      patientId: user.patientId, appointmentId: inv.appointment_id, type: NOTIFICATION_TYPE.INVOICE_PAID,
      text: `Đã thanh toán hóa đơn #${iid} (${vnd(inv.total_amount)}) bằng ví. Số dư còn ${vnd(after)}.`,
    });
    return { invoice: await fetchOne(conn, user, iid), walletBalance: after };
  });
}

/** Nạp tiền vào ví — bệnh nhân tự nạp (mô phỏng, chưa nối cổng thanh toán) hoặc lễ tân nạp hộ. */
export async function topup(patientId, b) {
  const pid = v.id(patientId, 'patientId');
  const cents = v.money(b.amount, 'amount');
  if (cents < TOPUP_MIN || cents > TOPUP_MAX) {
    throw new AppError(400, 'INVALID_INPUT', 'Số tiền nạp phải từ 1.000đ đến 50.000.000đ');
  }
  const amount = v.centsToDecimal(cents);
  try {
    return await withTransaction(async (conn) => {
      const wallet = await lockWallet(conn, pid);
      await conn.query('UPDATE wallet SET balance = balance + ? WHERE id = ?', [amount, wallet.id]);
      const after = await balanceOf(conn, wallet.id);
      const [r] = await conn.query(
        "INSERT INTO wallet_transaction (wallet_id, type, amount, balance_after) VALUES (?, 'TOPUP', ?, ?)",
        [wallet.id, amount, after],
      );
      return { transactionId: r.insertId, amount, balance: after };
    });
  } catch (err) {
    // Vượt DECIMAL(12,2)
    if (err.code === 'ER_WARN_DATA_OUT_OF_RANGE') throw new AppError(400, 'INVALID_INPUT', 'Số dư ví vượt giới hạn cho phép');
    throw err;
  }
}

async function walletRow(patientId) {
  const [w] = await pool.query('SELECT id, balance, updated_at FROM wallet WHERE patient_id = ?', [v.id(patientId, 'patientId')]);
  if (!w.length) throw new AppError(404, 'WALLET_NOT_FOUND', 'Bệnh nhân chưa có ví');
  return w[0];
}

export async function getWallet(patientId) {
  const w = await walletRow(patientId);
  return { balance: w.balance, updatedAt: v.fromMysql(w.updated_at) };
}

export async function listWalletTransactions(patientId, query) {
  const { page, limit, offset } = v.pagination(query);
  const w = await walletRow(patientId);
  const [tx] = await pool.query(
    `SELECT id, invoice_id, type, amount, balance_after, created_at FROM wallet_transaction
      WHERE wallet_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`,
    [w.id, limit, offset],
  );
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM wallet_transaction WHERE wallet_id = ?', [w.id]);
  return {
    rows: tx.map((t) => ({
      id: t.id, invoiceId: t.invoice_id, type: t.type, amount: t.amount,
      balanceAfter: t.balance_after, createdAt: v.fromMysql(t.created_at),
    })),
    page,
    limit,
    total,
  };
}
