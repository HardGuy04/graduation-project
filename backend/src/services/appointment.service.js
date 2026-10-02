import pool from '../config/db.js';
import AppError from '../utils/AppError.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const isId = (v) => Number.isInteger(v) && v > 0;

/**
 * ISO 8601 → 'YYYY-MM-DD HH:MM:SS' (UTC) để lưu vào cột DATETIME.
 */
function toMysqlUtc(value, field) {
  const d = new Date(value);
  if (!value || isNaN(d.getTime())) {
    throw new AppError(400, 'INVALID_INPUT', `${field} không hợp lệ (cần định dạng ISO 8601)`);
  }
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Chuyển mã lỗi MySQL → AppError nghiệp vụ.
 * ER_DUP_ENTRY trên unique index active_*_slot → 409 SLOT_TAKEN.
 */
function translateMySQLError(err) {
  if (err instanceof AppError) return err;

  if (err.code === 'ER_DUP_ENTRY') {
    const what = err.message.includes('uq_active_room_slot') ? 'Phòng' : 'Bác sĩ';
    return new AppError(409, 'SLOT_TAKEN', `${what} đã có lịch trong khung giờ này`);
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return new AppError(400, 'REFERENCE_NOT_FOUND', 'Bệnh nhân, bác sĩ hoặc phòng không tồn tại');
  }
  return err;
}

// ── Service ──────────────────────────────────────────────────────────────────

/**
 * Đặt lịch khám — toàn bộ kiểm tra và ghi dữ liệu trong MỘT transaction.
 *
 * Chống race condition:
 *   1) SELECT … FOR UPDATE khóa dòng doctor (rồi room) → serialise các request cùng bác sĩ.
 *   2) Kiểm tra chồng lấn thời gian bằng interval overlap (existing.start < new.end AND existing.end > new.start).
 *   3) Nếu thoát khỏi kiểm tra nhưng INSERT trùng unique index → ER_DUP_ENTRY → 409.
 *
 * Thứ tự khóa cố định: doctor → room để tránh deadlock.
 */
export async function bookAppointment({
  patientId, doctorId, roomId = null, startAt, endAt, reason = null,
}) {
  // --- Validate đầu vào ---
  if (!isId(patientId) || !isId(doctorId) || (roomId !== null && !isId(roomId))) {
    throw new AppError(400, 'INVALID_INPUT', 'patientId, doctorId, roomId phải là số nguyên dương');
  }

  const start = toMysqlUtc(startAt, 'startAt');
  const end   = toMysqlUtc(endAt,   'endAt');

  if (end <= start) {
    throw new AppError(400, 'INVALID_INPUT', 'endAt phải sau startAt');
  }
  if (new Date(startAt) <= new Date()) {
    throw new AppError(400, 'INVALID_INPUT', 'Không thể đặt lịch trong quá khứ');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Khóa dòng bác sĩ trước, rồi phòng — tránh deadlock
    const [doctors] = await conn.query(
      'SELECT id FROM doctor WHERE id = ? FOR UPDATE', [doctorId],
    );
    if (!doctors.length) {
      throw new AppError(404, 'DOCTOR_NOT_FOUND', 'Bác sĩ không tồn tại');
    }

    if (roomId !== null) {
      const [rooms] = await conn.query(
        'SELECT id FROM room WHERE id = ? FOR UPDATE', [roomId],
      );
      if (!rooms.length) {
        throw new AppError(404, 'ROOM_NOT_FOUND', 'Phòng không tồn tại');
      }
    }

    // Kiểm tra chồng lấn: overlap khi existing.start_at < new.end AND existing.end_at > new.start
    const [doctorBusy] = await conn.query(
      `SELECT id FROM appointment
       WHERE doctor_id = ? AND status NOT IN ('CANCELLED','NO_SHOW')
         AND start_at < ? AND end_at > ?
       LIMIT 1`,
      [doctorId, end, start],
    );
    if (doctorBusy.length) {
      throw new AppError(409, 'SLOT_TAKEN', 'Bác sĩ đã có lịch trong khung giờ này');
    }

    if (roomId !== null) {
      const [roomBusy] = await conn.query(
        `SELECT id FROM appointment
         WHERE room_id = ? AND status NOT IN ('CANCELLED','NO_SHOW')
           AND start_at < ? AND end_at > ?
         LIMIT 1`,
        [roomId, end, start],
      );
      if (roomBusy.length) {
        throw new AppError(409, 'SLOT_TAKEN', 'Phòng đã có lịch trong khung giờ này');
      }
    }

    // INSERT — nếu trùng unique index (active_doctor_slot) → ER_DUP_ENTRY
    const [result] = await conn.query(
      `INSERT INTO appointment (patient_id, doctor_id, room_id, start_at, end_at, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [patientId, doctorId, roomId, start, end, reason],
    );

    await conn.commit();

    return {
      id:        result.insertId,
      patientId,
      doctorId,
      roomId,
      startAt:   start,
      endAt:     end,
      status:    'PENDING',
    };
  } catch (err) {
    await conn.rollback();
    throw translateMySQLError(err);
  } finally {
    conn.release();
  }
}
