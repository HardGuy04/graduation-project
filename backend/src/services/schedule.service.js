// Lịch làm việc hàng tuần (doctor_schedule), ngày nghỉ (doctor_leave) và tính khung giờ trống.
// Giờ trong doctor_schedule là giờ địa phương phòng khám; appointment.start_at/end_at là UTC.
import pool, { withTransaction } from '../config/db.js';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import * as v from '../utils/validate.js';
import { SCHEDULE_STATUS, INACTIVE_APPT_STATUSES } from '../utils/constants.js';

const scheduleNotFound = () => new AppError(404, 'SCHEDULE_NOT_FOUND', 'Lịch làm việc không tồn tại');
const leaveNotFound = () => new AppError(404, 'LEAVE_NOT_FOUND', 'Ngày nghỉ không tồn tại');
const doctorNotFound = () => new AppError(404, 'DOCTOR_NOT_FOUND', 'Bác sĩ không tồn tại');

const hhmm = (t) => t.slice(0, 5);
const toMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

function serializeSchedule(r) {
  return {
    id: r.id,
    doctorId: r.doctor_id,
    dayOfWeek: r.day_of_week,
    startTime: hhmm(r.start_time),
    endTime: hhmm(r.end_time),
    slotDuration: r.slot_duration,
    maxPatient: r.max_patient,
    status: r.status,
  };
}

const serializeLeave = (r) => ({
  id: r.id,
  doctorId: r.doctor_id,
  doctorName: r.full_name,
  leaveDate: r.leave_date,
  reason: r.reason,
  createdAt: v.fromMysql(r.created_at),
});

/** Khóa dòng bác sĩ: tuần tự hóa mọi thao tác ghi lịch làm việc / ngày nghỉ / đặt lịch của cùng bác sĩ. */
export async function lockDoctor(conn, doctorId) {
  const [rows] = await conn.query(
    `SELECT d.id, u.status FROM doctor d JOIN users u ON u.id = d.user_id WHERE d.id = ? FOR UPDATE`,
    [doctorId],
  );
  if (!rows.length) throw doctorNotFound();
  return rows[0];
}

async function assertDoctorExists(doctorId) {
  const [rows] = await pool.query('SELECT id FROM doctor WHERE id = ?', [doctorId]);
  if (!rows.length) throw doctorNotFound();
}

// ── Lịch làm việc ────────────────────────────────────────────────────────────

export async function listSchedules(doctorId, { activeOnly = false } = {}) {
  const did = v.id(doctorId, 'doctorId');
  await assertDoctorExists(did);
  const [rows] = await pool.query(
    `SELECT id, doctor_id, day_of_week, start_time, end_time, slot_duration, max_patient, status
       FROM doctor_schedule WHERE doctor_id = ? ${activeOnly ? "AND status = 'ACTIVE'" : ''}
      ORDER BY day_of_week, start_time`,
    [did],
  );
  return rows.map(serializeSchedule);
}

function parseSchedule(b, current = null) {
  const s = {
    day_of_week: v.has(b, 'dayOfWeek') || !current ? v.int(b.dayOfWeek, 'dayOfWeek', { min: 1, max: 7 }) : current.day_of_week,
    start_time: v.has(b, 'startTime') || !current ? v.timeOfDay(b.startTime, 'startTime') : current.start_time,
    end_time: v.has(b, 'endTime') || !current ? v.timeOfDay(b.endTime, 'endTime') : current.end_time,
    slot_duration: v.has(b, 'slotDuration') || !current
      ? v.int(b.slotDuration, 'slotDuration', { min: 5, max: 240 }) : current.slot_duration,
    max_patient: v.has(b, 'maxPatient') || !current
      ? v.int(b.maxPatient ?? 1, 'maxPatient', { min: 1, max: 500 }) : current.max_patient,
    status: v.has(b, 'status') ? v.oneOf(b.status, 'status', SCHEDULE_STATUS) : (current ? current.status : 'ACTIVE'),
  };
  const span = toMinutes(s.end_time) - toMinutes(s.start_time);
  if (span <= 0) throw new AppError(400, 'INVALID_INPUT', 'Giờ kết thúc phải sau giờ bắt đầu');
  if (span < s.slot_duration) throw new AppError(400, 'INVALID_INPUT', 'Ca làm việc ngắn hơn thời lượng một lượt khám');
  return s;
}

// unique (doctor_id, day_of_week, start_time) chỉ chặn trùng giờ bắt đầu; ca chồng lấn lệch giờ phải tự kiểm tra
async function assertNoScheduleOverlap(conn, doctorId, s, excludeId = 0) {
  const [rows] = await conn.query(
    `SELECT id FROM doctor_schedule
      WHERE doctor_id = ? AND day_of_week = ? AND id <> ? AND start_time < ? AND end_time > ? LIMIT 1`,
    [doctorId, s.day_of_week, excludeId, s.end_time, s.start_time],
  );
  if (rows.length) throw new AppError(409, 'SCHEDULE_OVERLAP', 'Ca làm việc bị trùng với một ca khác trong cùng ngày');
}

const translateScheduleDup = (err) => (err.code === 'ER_DUP_ENTRY'
  ? new AppError(409, 'SCHEDULE_OVERLAP', 'Đã có ca làm việc bắt đầu cùng giờ trong ngày này')
  : err);

async function getScheduleRow(conn, doctorId, id) {
  const [rows] = await conn.query(
    `SELECT id, doctor_id, day_of_week, start_time, end_time, slot_duration, max_patient, status
       FROM doctor_schedule WHERE id = ? AND doctor_id = ?`,
    [id, doctorId],
  );
  if (!rows.length) throw scheduleNotFound();
  return rows[0];
}

export async function createSchedule(doctorId, b) {
  const did = v.id(doctorId, 'doctorId');
  const s = parseSchedule(b);
  try {
    return await withTransaction(async (conn) => {
      await lockDoctor(conn, did);
      await assertNoScheduleOverlap(conn, did, s);
      const [r] = await conn.query('INSERT INTO doctor_schedule SET ?', [{ ...s, doctor_id: did }]);
      return serializeSchedule(await getScheduleRow(conn, did, r.insertId));
    });
  } catch (err) { throw translateScheduleDup(err); }
}

/** Sửa ca: điều kiện doctor_id trong WHERE đảm bảo bác sĩ chỉ sửa được ca của chính mình. */
export async function updateSchedule(doctorId, id, b) {
  const did = v.id(doctorId, 'doctorId');
  const sid = v.id(id, 'id');
  try {
    return await withTransaction(async (conn) => {
      await lockDoctor(conn, did);
      const current = await getScheduleRow(conn, did, sid);
      const s = parseSchedule(b, current);
      await assertNoScheduleOverlap(conn, did, s, sid);
      await conn.query('UPDATE doctor_schedule SET ? WHERE id = ? AND doctor_id = ?', [s, sid, did]);
      return serializeSchedule(await getScheduleRow(conn, did, sid));
    });
  } catch (err) { throw translateScheduleDup(err); }
}

export async function deleteSchedule(doctorId, id) {
  const [r] = await pool.query(
    'DELETE FROM doctor_schedule WHERE id = ? AND doctor_id = ?', [v.id(id, 'id'), v.id(doctorId, 'doctorId')],
  );
  if (!r.affectedRows) throw scheduleNotFound();
}

// ── Ngày nghỉ ────────────────────────────────────────────────────────────────

async function countActiveAppointmentsOn(conn, doctorId, dateStr) {
  const { start, end } = v.clinicDayRange(dateStr);
  const [[{ n }]] = await conn.query(
    `SELECT COUNT(*) AS n FROM appointment
      WHERE doctor_id = ? AND status NOT IN (?) AND start_at >= ? AND start_at < ?`,
    [doctorId, INACTIVE_APPT_STATUSES, v.toMysql(start), v.toMysql(end)],
  );
  return n;
}

/** Danh sách ngày nghỉ; doctorId = null nghĩa là mọi bác sĩ (admin). */
export async function listLeaves(doctorId, query) {
  const { page, limit, offset } = v.pagination(query);
  const where = [];
  const params = [];
  const did = doctorId !== null ? v.id(doctorId, 'doctorId') : v.optionalId(query.doctorId, 'doctorId');
  if (did) { where.push('l.doctor_id = ?'); params.push(did); }
  const from = v.dateOnly(query.from, 'from', { required: false });
  const to = v.dateOnly(query.to, 'to', { required: false });
  if (from) { where.push('l.leave_date >= ?'); params.push(from); }
  if (to) { where.push('l.leave_date <= ?'); params.push(to); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT l.id, l.doctor_id, u.full_name, l.leave_date, l.reason, l.created_at
       FROM doctor_leave l JOIN doctor d ON d.id = l.doctor_id JOIN users u ON u.id = d.user_id
       ${w} ORDER BY l.leave_date DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM doctor_leave l ${w}`, params);
  return { rows: rows.map(serializeLeave), page, limit, total };
}

/**
 * Đăng ký ngày nghỉ. Bác sĩ chỉ được đăng ký từ hôm nay trở đi; admin được ghi nhận cả ngày đã qua
 * (phục vụ tính lương). Lịch hẹn đã có trong ngày KHÔNG tự hủy — trả về số lượng để lễ tân xử lý.
 */
export async function createLeave(doctorId, b, { allowPast = false } = {}) {
  const did = v.id(doctorId, 'doctorId');
  const leaveDate = v.dateOnly(b.leaveDate ?? b.date, 'leaveDate');
  const reason = v.str(b.reason, 'reason', { max: 255 });
  if (!allowPast && leaveDate < v.todayClinic()) {
    throw new AppError(400, 'INVALID_INPUT', 'Không thể đăng ký nghỉ cho ngày đã qua');
  }
  try {
    return await withTransaction(async (conn) => {
      await lockDoctor(conn, did);
      const [r] = await conn.query(
        'INSERT INTO doctor_leave (doctor_id, leave_date, reason) VALUES (?, ?, ?)', [did, leaveDate, reason],
      );
      const affectedAppointments = await countActiveAppointmentsOn(conn, did, leaveDate);
      return { id: r.insertId, doctorId: did, leaveDate, reason, affectedAppointments };
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new AppError(409, 'LEAVE_EXISTS', 'Bác sĩ đã có ngày nghỉ vào ngày này');
    throw err;
  }
}

export async function deleteLeave(doctorId, id, { allowPast = false } = {}) {
  const params = [v.id(id, 'id'), v.id(doctorId, 'doctorId')];
  let sql = 'DELETE FROM doctor_leave WHERE id = ? AND doctor_id = ?';
  if (!allowPast) { sql += ' AND leave_date >= ?'; params.push(v.todayClinic()); }
  const [r] = await pool.query(sql, params);
  if (!r.affectedRows) throw leaveNotFound();
}

// ── Kiểm tra khi đặt lịch (gọi trong transaction, SAU khi đã khóa dòng bác sĩ) ──

/**
 * Trả về ca làm việc chứa khoảng [start, end) theo giờ địa phương.
 * end = null: chỉ tìm ca chứa giờ bắt đầu (để suy ra thời lượng mặc định).
 */
export async function findCoveringSchedule(conn, doctorId, start, end) {
  const s = v.utcToClinic(start);
  const [leave] = await conn.query(
    'SELECT reason FROM doctor_leave WHERE doctor_id = ? AND leave_date = ?', [doctorId, s.date],
  );
  if (leave.length) throw new AppError(409, 'DOCTOR_ON_LEAVE', 'Bác sĩ nghỉ vào ngày này, vui lòng chọn ngày khác');

  let endLocal = null;
  if (end) {
    const e = v.utcToClinic(end);
    // Lịch kéo qua nửa đêm không nằm trong ca nào (ca làm việc trong ngày)
    endLocal = e.date === s.date ? e.time : (e.time === '00:00:00' && end - start <= 86_400_000 ? '24:00:00' : null);
    if (!endLocal) throw new AppError(409, 'OUTSIDE_SCHEDULE', 'Thời gian khám phải nằm trong một ca làm việc');
  }

  const [rows] = await conn.query(
    `SELECT id, start_time, end_time, slot_duration, max_patient FROM doctor_schedule
      WHERE doctor_id = ? AND day_of_week = ? AND status = 'ACTIVE'
        AND start_time <= ? AND end_time ${endLocal ? '>= ?' : '> ?'}
      LIMIT 1`,
    [doctorId, s.dow, s.time, endLocal || s.time],
  );
  if (!rows.length) {
    throw new AppError(409, 'OUTSIDE_SCHEDULE', 'Thời gian khám nằm ngoài lịch làm việc của bác sĩ');
  }
  return { ...rows[0], localDate: s.date };
}

/** max_patient = tổng số lịch tối đa trong MỘT ca của một ngày. */
export async function assertShiftNotFull(conn, doctorId, schedule) {
  const shiftStart = v.clinicToUtc(schedule.localDate, schedule.start_time);
  const shiftEnd = v.clinicToUtc(schedule.localDate, schedule.end_time);
  const [[{ n }]] = await conn.query(
    `SELECT COUNT(*) AS n FROM appointment
      WHERE doctor_id = ? AND status NOT IN (?) AND start_at >= ? AND start_at < ?`,
    [doctorId, INACTIVE_APPT_STATUSES, v.toMysql(shiftStart), v.toMysql(shiftEnd)],
  );
  if (n >= schedule.max_patient) {
    throw new AppError(409, 'SHIFT_FULL', 'Ca khám này đã đủ số bệnh nhân tối đa');
  }
}

// ── Khung giờ trống ──────────────────────────────────────────────────────────

export async function getSlots(doctorId, query) {
  const did = v.id(doctorId, 'doctorId');
  const date = v.dateOnly(query.date, 'date');

  const [doc] = await pool.query(
    "SELECT d.id FROM doctor d JOIN users u ON u.id = d.user_id WHERE d.id = ? AND u.status = 'ACTIVE'", [did],
  );
  if (!doc.length) throw doctorNotFound();

  const [leave] = await pool.query('SELECT reason FROM doctor_leave WHERE doctor_id = ? AND leave_date = ?', [did, date]);
  if (leave.length) return { doctorId: did, date, onLeave: true, leaveReason: leave[0].reason, shifts: [], slots: [] };

  const [schedules] = await pool.query(
    `SELECT id, start_time, end_time, slot_duration, max_patient FROM doctor_schedule
      WHERE doctor_id = ? AND day_of_week = ? AND status = 'ACTIVE' ORDER BY start_time`,
    [did, v.dowOf(date)],
  );
  const { start: dayStart, end: dayEnd } = v.clinicDayRange(date);
  const [appts] = await pool.query(
    `SELECT start_at, end_at FROM appointment
      WHERE doctor_id = ? AND status NOT IN (?) AND start_at < ? AND end_at > ?`,
    [did, INACTIVE_APPT_STATUSES, v.toMysql(dayEnd), v.toMysql(dayStart)],
  );
  const busy = appts.map((a) => [new Date(v.fromMysql(a.start_at)), new Date(v.fromMysql(a.end_at))]);
  const now = Date.now();

  const shifts = [];
  const slots = [];
  for (const s of schedules) {
    const shiftStart = v.clinicToUtc(date, s.start_time);
    const shiftEnd = v.clinicToUtc(date, s.end_time);
    const booked = busy.filter(([bs]) => bs >= shiftStart && bs < shiftEnd).length;
    const full = booked >= s.max_patient;
    shifts.push({
      scheduleId: s.id, startTime: hhmm(s.start_time), endTime: hhmm(s.end_time),
      slotDuration: s.slot_duration, maxPatient: s.max_patient, booked, full,
    });
    if (full) continue;

    for (let t = shiftStart.getTime(); t + s.slot_duration * 60_000 <= shiftEnd.getTime(); t += s.slot_duration * 60_000) {
      const st = new Date(t);
      const en = new Date(t + s.slot_duration * 60_000);
      if (st.getTime() <= now) continue;
      if (busy.some(([bs, be]) => bs < en && be > st)) continue;
      slots.push({
        scheduleId: s.id,
        startAt: st.toISOString(),
        endAt: en.toISOString(),
        startTime: hhmm(v.utcToClinic(st).time),
        endTime: hhmm(v.utcToClinic(en).time),
      });
    }
  }
  return { doctorId: did, date, onLeave: false, utcOffset: env.CLINIC_UTC_OFFSET, shifts, slots };
}
