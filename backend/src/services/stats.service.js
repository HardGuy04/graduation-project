// Báo cáo cho admin. Mọi mốc ngày/tháng tính theo giờ phòng khám (CLINIC_UTC_OFFSET), DB lưu UTC:
//   - lọc: from/to (YYYY-MM-DD giờ địa phương) → khoảng UTC [from 00:00, to+1 00:00) để dùng được index start_at
//   - nhóm: DATE(cột + INTERVAL offset MINUTE)
// "Lượt khám" = lịch DONE. Doanh thu = hóa đơn PAID, tính theo ngày thanh toán (paid_at).
import pool from '../config/db.js';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import * as v from '../utils/validate.js';

const OFF = env.CLINIC_OFFSET_MINUTES;
const num = (x) => Number(x || 0);
const rate = (part, total) => (total ? Math.round((part / total) * 10_000) / 100 : 0); // phần trăm, 2 chữ số

function parseRange(query, { maxDays = 366 } = {}) {
  const today = v.todayClinic();
  const to = v.dateOnly(query.to, 'to', { required: false }) || today;
  const from = v.dateOnly(query.from, 'from', { required: false }) || `${to.slice(0, 7)}-01`;
  if (from > to) throw new AppError(400, 'INVALID_INPUT', 'from phải trước hoặc bằng to');
  const start = v.clinicDayRange(from).start;
  const end = v.clinicDayRange(to).end;
  if ((end - start) / 86_400_000 > maxDays) {
    throw new AppError(400, 'INVALID_INPUT', `Khoảng thời gian tối đa ${maxDays} ngày`);
  }
  return { from, to, start: v.toMysql(start), end: v.toMysql(end) };
}

function parseGroupBy(query) {
  const g = v.oneOf(query.groupBy ?? 'day', 'groupBy', ['DAY', 'MONTH']);
  return { groupBy: g.toLowerCase(), fmt: g === 'DAY' ? '%Y-%m-%d' : '%Y-%m', maxDays: g === 'DAY' ? 366 : 366 * 5 };
}

const STATUS_COUNTS = `
  COUNT(*) AS total,
  SUM(a.status = 'DONE') AS done,
  SUM(a.status = 'CANCELLED') AS cancelled,
  SUM(a.status = 'NO_SHOW') AS no_show`;

const counts = (r) => ({
  total: num(r.total), done: num(r.done), cancelled: num(r.cancelled), noShow: num(r.no_show),
});

export async function overview() {
  const today = v.todayClinic();
  const { start: dayStart, end: dayEnd } = v.clinicDayRange(today);
  const monthStart = v.clinicDayRange(`${today.slice(0, 7)}-01`).start;

  const [[users]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM patient) AS patients,
            (SELECT COUNT(*) FROM doctor d JOIN users u ON u.id = d.user_id WHERE u.status = 'ACTIVE') AS active_doctors,
            (SELECT COUNT(*) FROM appointment WHERE status = 'PENDING' AND start_at > UTC_TIMESTAMP()) AS pending_upcoming`,
  );
  const [[todayRow]] = await pool.query(
    `SELECT ${STATUS_COUNTS}, SUM(a.status = 'CHECKED_IN') AS checked_in
       FROM appointment a WHERE a.start_at >= ? AND a.start_at < ?`,
    [v.toMysql(dayStart), v.toMysql(dayEnd)],
  );
  const [[money]] = await pool.query(
    `SELECT COALESCE(SUM(CASE WHEN paid_at >= ? THEN total_amount END), 0) AS revenue_month,
            COALESCE(SUM(CASE WHEN paid_at >= ? AND paid_at < ? THEN total_amount END), 0) AS revenue_today,
            (SELECT COUNT(*) FROM invoice WHERE payment_status = 'UNPAID') AS unpaid_invoices
       FROM invoice WHERE payment_status = 'PAID' AND paid_at >= ?`,
    [v.toMysql(monthStart), v.toMysql(dayStart), v.toMysql(dayEnd), v.toMysql(monthStart)],
  );
  return {
    date: today,
    patients: num(users.patients),
    activeDoctors: num(users.active_doctors),
    pendingUpcoming: num(users.pending_upcoming),
    today: { ...counts(todayRow), checkedIn: num(todayRow.checked_in) },
    revenueToday: String(money.revenue_today),
    revenueThisMonth: String(money.revenue_month),
    unpaidInvoices: num(money.unpaid_invoices),
  };
}

/** Số lịch theo ngày/tháng (theo giờ hẹn), tách theo trạng thái. */
export async function visits(query) {
  const { groupBy, fmt, maxDays } = parseGroupBy(query);
  const range = parseRange(query, { maxDays });
  const doctorId = v.optionalId(query.doctorId, 'doctorId');
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(a.start_at + INTERVAL ? MINUTE, ?) AS period, ${STATUS_COUNTS}
       FROM appointment a
      WHERE a.start_at >= ? AND a.start_at < ? ${doctorId ? 'AND a.doctor_id = ?' : ''}
      GROUP BY period ORDER BY period`,
    [OFF, fmt, range.start, range.end, ...(doctorId ? [doctorId] : [])],
  );
  return { from: range.from, to: range.to, groupBy, rows: rows.map((r) => ({ period: r.period, ...counts(r) })) };
}

export async function byDoctor(query) {
  const range = parseRange(query, { maxDays: 366 * 5 });
  const [rows] = await pool.query(
    `SELECT d.id AS doctor_id, u.full_name, s.name AS specialty_name, ${STATUS_COUNTS},
            COALESCE(SUM(CASE WHEN i.payment_status = 'PAID' THEN i.total_amount END), 0) AS revenue
       FROM appointment a
       JOIN doctor d ON d.id = a.doctor_id
       JOIN users u ON u.id = d.user_id
       LEFT JOIN specialty s ON s.id = d.specialty_id
       LEFT JOIN invoice i ON i.appointment_id = a.id
      WHERE a.start_at >= ? AND a.start_at < ?
      GROUP BY d.id, u.full_name, s.name
      ORDER BY done DESC, total DESC`,
    [range.start, range.end],
  );
  return {
    from: range.from,
    to: range.to,
    rows: rows.map((r) => ({
      doctorId: r.doctor_id, fullName: r.full_name, specialtyName: r.specialty_name, ...counts(r), revenue: String(r.revenue),
    })),
  };
}

export async function bySpecialty(query) {
  const range = parseRange(query, { maxDays: 366 * 5 });
  const [rows] = await pool.query(
    `SELECT s.id AS specialty_id, s.name, COUNT(DISTINCT a.doctor_id) AS doctors, ${STATUS_COUNTS},
            COALESCE(SUM(CASE WHEN i.payment_status = 'PAID' THEN i.total_amount END), 0) AS revenue
       FROM appointment a
       JOIN doctor d ON d.id = a.doctor_id
       JOIN specialty s ON s.id = d.specialty_id
       LEFT JOIN invoice i ON i.appointment_id = a.id
      WHERE a.start_at >= ? AND a.start_at < ?
      GROUP BY s.id, s.name
      ORDER BY done DESC, total DESC`,
    [range.start, range.end],
  );
  return {
    from: range.from,
    to: range.to,
    rows: rows.map((r) => ({
      specialtyId: r.specialty_id, name: r.name, doctors: num(r.doctors), ...counts(r), revenue: String(r.revenue),
    })),
  };
}

/** Doanh thu theo ngày/tháng thanh toán, kèm tổng theo phương thức. */
export async function revenue(query) {
  const { groupBy, fmt, maxDays } = parseGroupBy(query);
  const range = parseRange(query, { maxDays });
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(paid_at + INTERVAL ? MINUTE, ?) AS period, COUNT(*) AS invoices, SUM(total_amount) AS amount
       FROM invoice WHERE payment_status = 'PAID' AND paid_at >= ? AND paid_at < ?
      GROUP BY period ORDER BY period`,
    [OFF, fmt, range.start, range.end],
  );
  const [methods] = await pool.query(
    `SELECT payment_method, COUNT(*) AS invoices, SUM(total_amount) AS amount
       FROM invoice WHERE payment_status = 'PAID' AND paid_at >= ? AND paid_at < ?
      GROUP BY payment_method ORDER BY payment_method`,
    [range.start, range.end],
  );
  const [[sum]] = await pool.query(
    `SELECT COUNT(*) AS invoices, COALESCE(SUM(total_amount), 0) AS amount
       FROM invoice WHERE payment_status = 'PAID' AND paid_at >= ? AND paid_at < ?`,
    [range.start, range.end],
  );
  return {
    from: range.from,
    to: range.to,
    groupBy,
    total: { invoices: num(sum.invoices), amount: String(sum.amount) },
    byMethod: methods.map((m) => ({ method: m.payment_method, invoices: num(m.invoices), amount: String(m.amount) })),
    rows: rows.map((r) => ({ period: r.period, invoices: num(r.invoices), amount: String(r.amount) })),
  };
}

/** Tỷ lệ hủy / không đến trên tổng số lịch có giờ hẹn trong khoảng. */
export async function cancellation(query) {
  const range = parseRange(query, { maxDays: 366 * 5 });
  const [[r]] = await pool.query(
    `SELECT ${STATUS_COUNTS} FROM appointment a WHERE a.start_at >= ? AND a.start_at < ?`, [range.start, range.end],
  );
  const c = counts(r);
  return {
    from: range.from,
    to: range.to,
    ...c,
    cancelRate: rate(c.cancelled, c.total),
    noShowRate: rate(c.noShow, c.total),
  };
}
