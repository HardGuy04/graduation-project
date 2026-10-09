// Thu nhập bác sĩ theo tháng (bảng income, unique (doctor_id, period_month)).
// Công thức đã chốt: received = salary × day_on / (day_on + day_off)
//   - salary: lương tháng do admin nhập
//   - day_off: số ngày nghỉ (doctor_leave) rơi vào ngày có ca làm việc ACTIVE trong tháng
//   - day_on : số ngày có ca làm việc ACTIVE trong tháng − day_off
// Hạn chế: doctor_schedule không lưu lịch sử, nên tháng cũ được tính theo lịch làm việc HIỆN TẠI;
// admin có thể gửi dayOn/dayOff để ghi đè khi lịch đã thay đổi.
import pool from '../config/db.js';
import AppError from '../utils/AppError.js';
import * as v from '../utils/validate.js';

const MAX_DAYS = 31;

function monthDays(month) {
  const [y, m] = month.split('-').map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}

/** Đếm day_on/day_off của một bác sĩ trong tháng từ lịch làm việc + ngày nghỉ. */
async function computeDays(conn, doctorId, month) {
  const [sch] = await conn.query(
    "SELECT DISTINCT day_of_week FROM doctor_schedule WHERE doctor_id = ? AND status = 'ACTIVE'", [doctorId],
  );
  const workDows = new Set(sch.map((s) => s.day_of_week));
  const days = monthDays(month);
  const [leaves] = await conn.query(
    'SELECT leave_date FROM doctor_leave WHERE doctor_id = ? AND leave_date BETWEEN ? AND ?',
    [doctorId, days[0], days.at(-1)],
  );
  const leaveSet = new Set(leaves.map((l) => l.leave_date));
  let dayOn = 0;
  let dayOff = 0;
  for (const d of days) {
    if (!workDows.has(v.dowOf(d))) continue;
    if (leaveSet.has(d)) dayOff += 1; else dayOn += 1;
  }
  return { dayOn, dayOff };
}

const receivedCents = (salaryCents, dayOn, dayOff) => (
  dayOn + dayOff === 0 ? 0 : Math.round((salaryCents * dayOn) / (dayOn + dayOff))
);

function serialize(r, month) {
  return {
    doctorId: r.doctor_id,
    fullName: r.full_name,
    specialtyName: r.specialty_name,
    month,
    saved: Boolean(r.income_id),
    id: r.income_id || null,
    salary: r.salary ?? null,
    dayOn: r.day_on ?? null,
    dayOff: r.day_off ?? null,
    received: r.received ?? null,
  };
}

/**
 * Bảng thu nhập của mọi bác sĩ trong tháng. Bác sĩ chưa được chốt lương (saved = false)
 * vẫn xuất hiện kèm dayOn/dayOff tính tạm để admin nhập lương.
 */
export async function listByMonth(query) {
  const month = v.monthOnly(query.month || v.todayClinic().slice(0, 7), 'month');
  const { page, limit, offset } = v.pagination(query);
  const [rows] = await pool.query(
    `SELECT d.id AS doctor_id, u.full_name, s.name AS specialty_name,
            i.id AS income_id, i.salary, i.day_on, i.day_off, i.received
       FROM doctor d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN specialty s ON s.id = d.specialty_id
       LEFT JOIN income i ON i.doctor_id = d.id AND i.period_month = ?
      WHERE u.status = 'ACTIVE' OR i.id IS NOT NULL
      ORDER BY u.full_name, d.id LIMIT ? OFFSET ?`,
    [`${month}-01`, limit, offset],
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM doctor d JOIN users u ON u.id = d.user_id
       LEFT JOIN income i ON i.doctor_id = d.id AND i.period_month = ?
      WHERE u.status = 'ACTIVE' OR i.id IS NOT NULL`,
    [`${month}-01`],
  );
  const out = [];
  for (const r of rows) {
    const item = serialize(r, month);
    if (!item.saved) Object.assign(item, await computeDays(pool, r.doctor_id, month));
    out.push(item);
  }
  return { rows: out, page, limit, total };
}

/** Chốt (tạo hoặc cập nhật) thu nhập tháng — một câu upsert dựa trên unique (doctor_id, period_month). */
export async function upsert(doctorId, month, b) {
  const did = v.id(doctorId, 'doctorId');
  const m = v.monthOnly(month, 'month');
  const salaryCents = v.money(b.salary, 'salary');
  const [doc] = await pool.query(
    `SELECT d.id, u.full_name, s.name AS specialty_name FROM doctor d JOIN users u ON u.id = d.user_id
       LEFT JOIN specialty s ON s.id = d.specialty_id WHERE d.id = ?`,
    [did],
  );
  if (!doc.length) throw new AppError(404, 'DOCTOR_NOT_FOUND', 'Bác sĩ không tồn tại');

  const computed = await computeDays(pool, did, m);
  const dayOn = v.has(b, 'dayOn') ? v.int(b.dayOn, 'dayOn', { min: 0, max: MAX_DAYS }) : computed.dayOn;
  const dayOff = v.has(b, 'dayOff') ? v.int(b.dayOff, 'dayOff', { min: 0, max: MAX_DAYS }) : computed.dayOff;
  if (dayOn + dayOff > monthDays(m).length) {
    throw new AppError(400, 'INVALID_INPUT', 'Tổng số ngày làm và ngày nghỉ vượt quá số ngày trong tháng');
  }
  const salary = v.centsToDecimal(salaryCents);
  const received = v.centsToDecimal(receivedCents(salaryCents, dayOn, dayOff));

  await pool.query(
    `INSERT INTO income (doctor_id, period_month, salary, day_on, day_off, received) VALUES (?, ?, ?, ?, ?, ?) AS nw
     ON DUPLICATE KEY UPDATE salary = nw.salary, day_on = nw.day_on, day_off = nw.day_off, received = nw.received`,
    [did, `${m}-01`, salary, dayOn, dayOff, received],
  );
  const [[row]] = await pool.query(
    'SELECT id, salary, day_on, day_off, received FROM income WHERE doctor_id = ? AND period_month = ?', [did, `${m}-01`],
  );
  return serialize({
    doctor_id: did, full_name: doc[0].full_name, specialty_name: doc[0].specialty_name,
    income_id: row.id, salary: row.salary, day_on: row.day_on, day_off: row.day_off, received: row.received,
  }, m);
}

/** Bác sĩ xem các tháng thu nhập đã được chốt của chính mình. */
export async function listMine(doctorId, query) {
  const { page, limit, offset } = v.pagination(query);
  const [rows] = await pool.query(
    `SELECT id, DATE_FORMAT(period_month, '%Y-%m') AS month, salary, day_on, day_off, received
       FROM income WHERE doctor_id = ? ORDER BY period_month DESC LIMIT ? OFFSET ?`,
    [doctorId, limit, offset],
  );
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM income WHERE doctor_id = ?', [doctorId]);
  return {
    rows: rows.map((r) => ({
      id: r.id, month: r.month, salary: r.salary, dayOn: r.day_on, dayOff: r.day_off, received: r.received,
    })),
    page,
    limit,
    total,
  };
}
