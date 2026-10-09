// Thông báo cho bệnh nhân. notify() nhận `conn` của transaction đang chạy để thông báo
// chỉ được ghi khi thao tác nghiệp vụ commit thành công (rollback thì không có thông báo "ma").
import pool from '../config/db.js';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import * as v from '../utils/validate.js';
import { NOTIFICATION_TYPE } from '../utils/constants.js';

const MAX_TEXT = 255;
const REMIND_BEFORE_HOURS = 24;
const REMINDER_INTERVAL_MS = 10 * 60_000;

/** Date (UTC) → 'HH:MM dd/MM/yyyy' theo giờ phòng khám, dùng trong nội dung thông báo. */
export function formatClinicTime(d) {
  const { date, time } = v.utcToClinic(d);
  const [y, m, day] = date.split('-');
  return `${time.slice(0, 5)} ${day}/${m}/${y}`;
}

export async function notify(conn, { patientId, appointmentId = null, type, text }) {
  const t = text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text;
  await conn.query(
    'INSERT INTO notification (patient_id, appointment_id, type, text) VALUES (?, ?, ?, ?)',
    [patientId, appointmentId, type, t],
  );
}

// ── Bệnh nhân đọc thông báo của mình ─────────────────────────────────────────

const serialize = (r) => ({
  id: r.id,
  type: r.type,
  text: r.text,
  appointmentId: r.appointment_id,
  isRead: Boolean(r.is_read),
  createdAt: v.fromMysql(r.created_at),
});

export async function list(patientId, query) {
  const { page, limit, offset } = v.pagination(query);
  const unreadOnly = query.unread !== undefined && v.bool(query.unread, 'unread');
  const w = `patient_id = ?${unreadOnly ? ' AND is_read = 0' : ''}`;
  const [rows] = await pool.query(
    `SELECT id, type, text, appointment_id, is_read, created_at FROM notification
      WHERE ${w} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [patientId, limit, offset],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM notification WHERE ${w}`, [patientId]);
  return { rows: rows.map(serialize), page, limit, total };
}

export async function unreadCount(patientId) {
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM notification WHERE patient_id = ? AND is_read = 0', [patientId]);
  return { unread: n };
}

/** Điều kiện patient_id trong WHERE: không đánh dấu được thông báo của người khác (→ 404). */
export async function markRead(patientId, id) {
  const [r] = await pool.query('UPDATE notification SET is_read = 1 WHERE id = ? AND patient_id = ?', [v.id(id, 'id'), patientId]);
  if (!r.affectedRows) throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Thông báo không tồn tại');
}

export async function markAllRead(patientId) {
  const [r] = await pool.query('UPDATE notification SET is_read = 1 WHERE patient_id = ? AND is_read = 0', [patientId]);
  return { updated: r.affectedRows };
}

// ── Nhắc lịch ────────────────────────────────────────────────────────────────

/**
 * Tạo thông báo nhắc cho lịch PENDING/CONFIRMED sẽ diễn ra trong 24 giờ tới.
 * Một câu INSERT … SELECT … WHERE NOT EXISTS: chạy lại nhiều lần không tạo nhắc trùng (trong một tiến trình).
 * `appointmentId` giới hạn cho một lịch (gửi lại thủ công / kiểm thử).
 */
export async function runReminders({ appointmentId = null } = {}) {
  let r;
  try {
    [r] = await pool.query(
    `INSERT INTO notification (patient_id, appointment_id, type, text)
     SELECT a.patient_id, a.id, ?,
            LEFT(CONCAT('Nhắc lịch: bạn có lịch khám với BS ', du.full_name, ' lúc ',
                        DATE_FORMAT(a.start_at + INTERVAL ? MINUTE, '%H:%i %d/%m/%Y'), '.'), ?)
       FROM appointment a
       JOIN doctor d ON d.id = a.doctor_id
       JOIN users du ON du.id = d.user_id
      WHERE a.status IN ('PENDING', 'CONFIRMED')
        AND a.start_at > UTC_TIMESTAMP()
        AND a.start_at <= UTC_TIMESTAMP() + INTERVAL ? HOUR
        ${appointmentId ? 'AND a.id = ?' : ''}
        AND NOT EXISTS (SELECT 1 FROM notification n WHERE n.appointment_id = a.id AND n.type = ?)`,
    [
      NOTIFICATION_TYPE.APPOINTMENT_REMINDER, env.CLINIC_OFFSET_MINUTES, MAX_TEXT, REMIND_BEFORE_HOURS,
      ...(appointmentId ? [appointmentId] : []), NOTIFICATION_TYPE.APPOINTMENT_REMINDER,
    ],
    );
  } catch (err) {
    // Unique (appointment_id, type) — chạy song song hai tiến trình không tạo nhắc trùng
    if (err.code === 'ER_DUP_ENTRY') return 0;
    throw err;
  }
  return r.affectedRows;
}

/** Job chạy định kỳ trong tiến trình API. unref() để job không giữ tiến trình sống khi tắt server. */
export function startReminderJob() {
  if (!env.REMINDER_ENABLED) return null;
  const tick = () => runReminders().catch((err) => console.error('[reminder]', err.code || err.message));
  tick();
  const timer = setInterval(tick, REMINDER_INTERVAL_MS);
  timer.unref();
  return timer;
}
