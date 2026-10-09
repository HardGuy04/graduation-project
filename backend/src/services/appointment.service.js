// Lịch hẹn: đặt lịch (chống trùng), xem theo vai trò, chuyển trạng thái, đổi phòng.
//
// Chống race condition khi đặt lịch:
//   1) Transaction ngắn, khóa theo thứ tự cố định doctor → room → patient (tránh deadlock).
//   2) Kiểm tra chồng lấn (start_cũ < end_mới AND end_cũ > start_mới) sau khi đã khóa → các request
//      cùng bác sĩ bị tuần tự hóa nên không có "check-then-act" giữa hai transaction.
//   3) Lưới an toàn cuối: unique index trên cột sinh active_doctor_slot / active_room_slot → ER_DUP_ENTRY → 409.
// Chuyển trạng thái dùng UPDATE có điều kiện trạng thái hiện tại + kiểm tra affectedRows.
import pool, { withTransaction } from '../config/db.js';
import AppError from '../utils/AppError.js';
import * as v from '../utils/validate.js';
import { ROLES, APPT_STATUS, INACTIVE_APPT_STATUSES, NOTIFICATION_TYPE } from '../utils/constants.js';
import { lockDoctor, findCoveringSchedule, assertShiftNotFull } from './schedule.service.js';
import { notify, formatClinicTime } from './notification.service.js';

const { PENDING, CONFIRMED, CHECKED_IN, CANCELLED, NO_SHOW } = APPT_STATUS;
const MAX_DURATION_MIN = 240;
const MAX_DAYS_AHEAD = 90;

const notFound = () => new AppError(404, 'APPOINTMENT_NOT_FOUND', 'Lịch hẹn không tồn tại');

const SELECT_APPT = `
  SELECT a.id, a.patient_id, a.doctor_id, a.admin_id, a.room_id, a.start_at, a.end_at, a.status, a.reason,
         a.created_at, a.updated_at,
         pu.full_name AS patient_name, pu.phone AS patient_phone, p.date_of_birth, p.gender,
         du.full_name AS doctor_name, du.avatar_url AS doctor_avatar, s.id AS specialty_id, s.name AS specialty_name,
         r.name AS room_name, mr.id AS medical_record_id, i.id AS invoice_id, i.payment_status
    FROM appointment a
    JOIN patient p ON p.id = a.patient_id
    JOIN users pu ON pu.id = p.user_id
    JOIN doctor d ON d.id = a.doctor_id
    JOIN users du ON du.id = d.user_id
    LEFT JOIN specialty s ON s.id = d.specialty_id
    LEFT JOIN room r ON r.id = a.room_id
    LEFT JOIN medical_record mr ON mr.appointment_id = a.id
    LEFT JOIN invoice i ON i.appointment_id = a.id`;

export function serialize(r) {
  return {
    id: r.id,
    status: r.status,
    startAt: v.fromMysql(r.start_at),
    endAt: v.fromMysql(r.end_at),
    reason: r.reason,
    patient: {
      id: r.patient_id, fullName: r.patient_name, phone: r.patient_phone,
      dateOfBirth: r.date_of_birth, gender: r.gender,
    },
    doctor: {
      id: r.doctor_id, fullName: r.doctor_name, avatarUrl: r.doctor_avatar,
      specialtyId: r.specialty_id, specialtyName: r.specialty_name,
    },
    room: r.room_id ? { id: r.room_id, name: r.room_name } : null,
    adminId: r.admin_id,
    medicalRecordId: r.medical_record_id,
    invoice: r.invoice_id ? { id: r.invoice_id, paymentStatus: r.payment_status } : null,
    createdAt: v.fromMysql(r.created_at),
    updatedAt: v.fromMysql(r.updated_at),
  };
}

/** Điều kiện WHERE giới hạn theo người gọi: bệnh nhân/bác sĩ chỉ thấy lịch của chính mình. */
function scopeOf(user) {
  if (user.role === ROLES.PATIENT) return { sql: 'a.patient_id = ?', params: [user.patientId] };
  if (user.role === ROLES.DOCTOR) return { sql: 'a.doctor_id = ?', params: [user.doctorId] };
  return { sql: '1 = 1', params: [] };
}

async function fetchOne(conn, user, id) {
  const scope = scopeOf(user);
  const [rows] = await conn.query(`${SELECT_APPT} WHERE a.id = ? AND ${scope.sql}`, [id, ...scope.params]);
  return rows[0] || null;
}

// ── Xem ──────────────────────────────────────────────────────────────────────

export async function list(user, query) {
  const { page, limit, offset } = v.pagination(query);
  const scope = scopeOf(user);
  const where = [scope.sql];
  const params = [...scope.params];

  if (query.status) {
    const statuses = String(query.status).split(',').map((s) => v.oneOf(s, 'status', Object.values(APPT_STATUS)));
    where.push('a.status IN (?)');
    params.push(statuses);
  }
  // from/to/date là ngày theo giờ phòng khám
  const date = v.dateOnly(query.date, 'date', { required: false });
  const from = date || v.dateOnly(query.from, 'from', { required: false });
  const to = date || v.dateOnly(query.to, 'to', { required: false });
  if (from) { where.push('a.start_at >= ?'); params.push(v.toMysql(v.clinicDayRange(from).start)); }
  if (to) { where.push('a.start_at < ?'); params.push(v.toMysql(v.clinicDayRange(to).end)); }
  if (query.upcoming !== undefined && v.bool(query.upcoming, 'upcoming')) where.push('a.start_at > UTC_TIMESTAMP()');

  // Lọc theo bác sĩ / bệnh nhân chỉ có ý nghĩa với người xem được nhiều hơn phạm vi của mình
  if (user.role !== ROLES.DOCTOR) {
    const doctorId = v.optionalId(query.doctorId, 'doctorId');
    if (doctorId) { where.push('a.doctor_id = ?'); params.push(doctorId); }
  }
  if (user.role !== ROLES.PATIENT) {
    const patientId = v.optionalId(query.patientId, 'patientId');
    if (patientId) { where.push('a.patient_id = ?'); params.push(patientId); }
    const q = v.likePattern(query.q);
    if (q) { where.push('(pu.full_name LIKE ? OR pu.phone LIKE ?)'); params.push(q, q); }
  }
  const order = String(query.sort || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const w = where.join(' AND ');
  const [rows] = await pool.query(
    `${SELECT_APPT} WHERE ${w} ORDER BY a.start_at ${order}, a.id ${order} LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM appointment a
       JOIN patient p ON p.id = a.patient_id JOIN users pu ON pu.id = p.user_id
      WHERE ${w}`,
    params,
  );
  return { rows: rows.map(serialize), page, limit, total };
}

/** Không thuộc phạm vi người gọi → 404 (không tiết lộ lịch đó có tồn tại). */
export async function get(user, id) {
  const row = await fetchOne(pool, user, v.id(id, 'id'));
  if (!row) throw notFound();
  return serialize(row);
}

// ── Đặt lịch ─────────────────────────────────────────────────────────────────

function parseBooking(user, b) {
  const isAdmin = user.role === ROLES.ADMIN;
  const doctorId = v.id(b.doctorId, 'doctorId');
  // Bệnh nhân luôn đặt cho chính mình: bỏ qua patientId/roomId trong body
  const patientId = isAdmin ? v.id(b.patientId, 'patientId') : user.patientId;
  const roomId = isAdmin ? v.optionalId(b.roomId, 'roomId') : null;
  const start = v.isoDateTime(b.startAt, 'startAt');
  const end = b.endAt == null || b.endAt === '' ? null : v.isoDateTime(b.endAt, 'endAt');
  const reason = v.str(b.reason, 'reason', { max: 255 });

  // Giây/mili-giây khác 0 sẽ tạo "slot" lệch lưới và làm unique index kém tác dụng
  if (start.getUTCSeconds() || start.getUTCMilliseconds() || (end && (end.getUTCSeconds() || end.getUTCMilliseconds()))) {
    throw new AppError(400, 'INVALID_INPUT', 'Thời gian chỉ được tính đến phút');
  }
  if (start.getTime() <= Date.now()) throw new AppError(400, 'PAST_TIME', 'Không thể đặt lịch trong quá khứ');
  if (start.getTime() > Date.now() + MAX_DAYS_AHEAD * 86_400_000) {
    throw new AppError(400, 'INVALID_INPUT', `Chỉ được đặt lịch trước tối đa ${MAX_DAYS_AHEAD} ngày`);
  }
  if (end) {
    if (end <= start) throw new AppError(400, 'INVALID_INPUT', 'endAt phải sau startAt');
    if (end - start > MAX_DURATION_MIN * 60_000) {
      throw new AppError(400, 'INVALID_INPUT', `Một lượt khám tối đa ${MAX_DURATION_MIN} phút`);
    }
  }
  return { isAdmin, doctorId, patientId, roomId, start, end, reason };
}

async function lockRoom(conn, roomId) {
  const [rows] = await conn.query('SELECT id, status FROM room WHERE id = ? FOR UPDATE', [roomId]);
  if (!rows.length) throw new AppError(404, 'ROOM_NOT_FOUND', 'Phòng không tồn tại');
  if (rows[0].status !== 'AVAILABLE') throw new AppError(409, 'ROOM_UNAVAILABLE', 'Phòng đang bảo trì hoặc ngừng sử dụng');
}

async function assertNoOverlap(conn, column, value, start, end, excludeId = 0) {
  const [rows] = await conn.query(
    `SELECT id FROM appointment
      WHERE ${column} = ? AND id <> ? AND status NOT IN (?) AND start_at < ? AND end_at > ? LIMIT 1`,
    [value, excludeId, INACTIVE_APPT_STATUSES, v.toMysql(end), v.toMysql(start)],
  );
  return rows.length === 0;
}

function translateDbError(err) {
  if (err.code === 'ER_DUP_ENTRY') {
    return String(err.message).includes('uq_active_room_slot')
      ? new AppError(409, 'ROOM_SLOT_TAKEN', 'Phòng đã có lịch trong khung giờ này')
      : new AppError(409, 'SLOT_TAKEN', 'Bác sĩ đã có lịch trong khung giờ này');
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return String(err.message).includes('fk_appt_patient')
      ? new AppError(400, 'PATIENT_NOT_FOUND', 'Bệnh nhân không tồn tại')
      : new AppError(400, 'REFERENCE_NOT_FOUND', 'Dữ liệu tham chiếu không tồn tại');
  }
  return err;
}

export async function create(user, b) {
  const input = parseBooking(user, b);
  try {
    return await withTransaction(async (conn) => {
      const doctor = await lockDoctor(conn, input.doctorId);
      if (doctor.status !== 'ACTIVE') throw new AppError(404, 'DOCTOR_NOT_FOUND', 'Bác sĩ không tồn tại');
      if (input.roomId) await lockRoom(conn, input.roomId);

      const [pat] = await conn.query(
        `SELECT p.id, u.status FROM patient p JOIN users u ON u.id = p.user_id WHERE p.id = ? FOR UPDATE`,
        [input.patientId],
      );
      if (!pat.length) throw new AppError(400, 'PATIENT_NOT_FOUND', 'Bệnh nhân không tồn tại');
      if (pat[0].status !== 'ACTIVE') throw new AppError(409, 'PATIENT_LOCKED', 'Tài khoản bệnh nhân đang bị khóa');

      // Không gửi endAt → mặc định một lượt khám theo slot_duration của ca chứa giờ bắt đầu
      let { end } = input;
      if (!end) {
        const s = await findCoveringSchedule(conn, input.doctorId, input.start, null);
        end = new Date(input.start.getTime() + s.slot_duration * 60_000);
      }
      const schedule = await findCoveringSchedule(conn, input.doctorId, input.start, end);
      await assertShiftNotFull(conn, input.doctorId, schedule);

      if (!(await assertNoOverlap(conn, 'doctor_id', input.doctorId, input.start, end))) {
        throw new AppError(409, 'SLOT_TAKEN', 'Bác sĩ đã có lịch trong khung giờ này');
      }
      if (input.roomId && !(await assertNoOverlap(conn, 'room_id', input.roomId, input.start, end))) {
        throw new AppError(409, 'ROOM_SLOT_TAKEN', 'Phòng đã có lịch trong khung giờ này');
      }
      if (!(await assertNoOverlap(conn, 'patient_id', input.patientId, input.start, end))) {
        throw new AppError(409, 'PATIENT_BUSY', 'Bệnh nhân đã có lịch khác trùng khung giờ này');
      }

      // Admin (lễ tân) đặt hộ coi như đã xác nhận; bệnh nhân tự đặt phải chờ xác nhận
      const status = input.isAdmin ? CONFIRMED : PENDING;
      const [r] = await conn.query(
        `INSERT INTO appointment (patient_id, doctor_id, admin_id, room_id, start_at, end_at, status, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [input.patientId, input.doctorId, input.isAdmin ? user.adminId : null, input.roomId,
          v.toMysql(input.start), v.toMysql(end), status, input.reason],
      );
      const row = await fetchOne(conn, { role: ROLES.ADMIN }, r.insertId);
      const when = formatClinicTime(input.start);
      await notify(conn, {
        patientId: input.patientId,
        appointmentId: r.insertId,
        type: input.isAdmin ? NOTIFICATION_TYPE.APPOINTMENT_CONFIRMED : NOTIFICATION_TYPE.APPOINTMENT_CREATED,
        text: input.isAdmin
          ? `Lịch khám với BS ${row.doctor_name} lúc ${when} đã được đặt và xác nhận.`
          : `Đã gửi yêu cầu đặt lịch khám với BS ${row.doctor_name} lúc ${when}, vui lòng chờ xác nhận.`,
      });
      return serialize(row);
    });
  } catch (err) {
    throw translateDbError(err);
  }
}

// ── Chuyển trạng thái ────────────────────────────────────────────────────────

/**
 * UPDATE có điều kiện; nếu không dòng nào khớp thì đọc lại để trả lỗi đúng
 * (404 nếu ngoài phạm vi người gọi, 409 nếu trạng thái/thời điểm không cho phép).
 */
async function transition(conn, user, id, { from, to, extraWhere = '', extraParams = [], set = {}, tooLate }) {
  const scope = scopeOf(user);
  const [r] = await conn.query(
    `UPDATE appointment a SET a.status = ?${Object.keys(set).map((k) => `, a.${k} = ?`).join('')}
      WHERE a.id = ? AND ${scope.sql} AND a.status IN (?) ${extraWhere}`,
    [to, ...Object.values(set), id, ...scope.params, from, ...extraParams],
  );
  const row = await fetchOne(conn, user, id);
  if (!row) throw notFound();
  if (r.affectedRows === 1) return row;
  if (!from.includes(row.status)) {
    throw new AppError(409, 'INVALID_STATUS', `Không thể chuyển lịch hẹn từ trạng thái ${row.status} sang ${to}`);
  }
  throw tooLate();
}

async function notifyStatus(conn, row, type, text) {
  await notify(conn, { patientId: row.patient_id, appointmentId: row.id, type, text });
}

export async function cancel(user, id, b = {}) {
  const aid = v.id(id, 'id');
  const note = v.str(b.reason, 'reason', { max: 150 });
  const isPatient = user.role === ROLES.PATIENT;
  return withTransaction(async (conn) => {
    // Bệnh nhân chỉ hủy được lịch chưa tới giờ và chưa check-in; lễ tân hủy được cả lịch đã check-in
    const row = await transition(conn, user, aid, {
      from: isPatient ? [PENDING, CONFIRMED] : [PENDING, CONFIRMED, CHECKED_IN],
      to: CANCELLED,
      extraWhere: isPatient ? 'AND a.start_at > UTC_TIMESTAMP()' : '',
      tooLate: () => new AppError(409, 'TOO_LATE', 'Đã quá giờ hẹn, không thể tự hủy lịch'),
    });
    const by = isPatient ? 'bạn' : 'phòng khám';
    await notifyStatus(conn, row, NOTIFICATION_TYPE.APPOINTMENT_CANCELLED,
      `Lịch khám với BS ${row.doctor_name} lúc ${formatClinicTime(new Date(v.fromMysql(row.start_at)))} đã bị ${by} hủy${note ? `: ${note}` : '.'}`);
    return serialize(row);
  });
}

export async function confirm(user, id) {
  const aid = v.id(id, 'id');
  return withTransaction(async (conn) => {
    const row = await transition(conn, user, aid, {
      from: [PENDING], to: CONFIRMED, set: { admin_id: user.adminId },
      extraWhere: 'AND a.start_at > UTC_TIMESTAMP()',
      tooLate: () => new AppError(409, 'TOO_LATE', 'Lịch hẹn đã quá giờ, không thể xác nhận'),
    });
    await notifyStatus(conn, row, NOTIFICATION_TYPE.APPOINTMENT_CONFIRMED,
      `Lịch khám với BS ${row.doctor_name} lúc ${formatClinicTime(new Date(v.fromMysql(row.start_at)))} đã được xác nhận.`);
    return serialize(row);
  });
}

export async function checkIn(user, id) {
  const aid = v.id(id, 'id');
  return withTransaction(async (conn) => {
    const row = await transition(conn, user, aid, {
      from: [PENDING, CONFIRMED],
      to: CHECKED_IN,
      // Bác sĩ tự check-in lịch của mình thì không ghi admin_id
      ...(user.adminId ? { set: { admin_id: user.adminId } } : {}),
      tooLate: () => new AppError(409, 'INVALID_STATUS', 'Không thể check-in lịch hẹn này'),
    });
    return serialize(row);
  });
}

/** Đánh dấu không đến: chỉ sau giờ hẹn bắt đầu. Bác sĩ chỉ đánh dấu được lịch của mình (scopeOf). */
export async function noShow(user, id) {
  const aid = v.id(id, 'id');
  return withTransaction(async (conn) => {
    const row = await transition(conn, user, aid, {
      from: [PENDING, CONFIRMED], to: NO_SHOW,
      extraWhere: 'AND a.start_at <= UTC_TIMESTAMP()',
      tooLate: () => new AppError(409, 'TOO_EARLY', 'Chưa tới giờ hẹn, chưa thể đánh dấu không đến'),
    });
    await notifyStatus(conn, row, NOTIFICATION_TYPE.APPOINTMENT_NO_SHOW,
      `Bạn đã không đến lịch khám với BS ${row.doctor_name} lúc ${formatClinicTime(new Date(v.fromMysql(row.start_at)))}.`);
    return serialize(row);
  });
}

/** Đổi/gán/bỏ phòng. Khóa doctor → room giống lúc đặt lịch để không xung đột với request đặt lịch song song. */
export async function changeRoom(user, id, b) {
  const aid = v.id(id, 'id');
  if (!v.has(b, 'roomId')) throw new AppError(400, 'INVALID_INPUT', 'roomId là bắt buộc (null để bỏ phòng)');
  const roomId = v.optionalId(b.roomId, 'roomId');
  try {
    return await withTransaction(async (conn) => {
      const [[head]] = await conn.query('SELECT doctor_id FROM appointment WHERE id = ?', [aid]);
      if (!head) throw notFound();
      await lockDoctor(conn, head.doctor_id);
      if (roomId) await lockRoom(conn, roomId);

      const [[a]] = await conn.query(
        'SELECT id, status, room_id, start_at, end_at FROM appointment WHERE id = ? FOR UPDATE', [aid],
      );
      if (![PENDING, CONFIRMED, CHECKED_IN].includes(a.status)) {
        throw new AppError(409, 'INVALID_STATUS', `Không thể đổi phòng cho lịch hẹn ở trạng thái ${a.status}`);
      }
      if (roomId) {
        const start = new Date(v.fromMysql(a.start_at));
        const end = new Date(v.fromMysql(a.end_at));
        if (!(await assertNoOverlap(conn, 'room_id', roomId, start, end, aid))) {
          throw new AppError(409, 'ROOM_SLOT_TAKEN', 'Phòng đã có lịch trong khung giờ này');
        }
      }
      await conn.query('UPDATE appointment SET room_id = ? WHERE id = ?', [roomId, aid]);
      const row = await fetchOne(conn, user, aid);
      if ((a.room_id || null) !== roomId && roomId) {
        await notifyStatus(conn, row, NOTIFICATION_TYPE.APPOINTMENT_ROOM_CHANGED,
          `Lịch khám lúc ${formatClinicTime(new Date(v.fromMysql(row.start_at)))} được xếp vào ${row.room_name}.`);
      }
      return serialize(row);
    });
  } catch (err) {
    throw translateDbError(err);
  }
}