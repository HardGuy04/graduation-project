import { pool } from './db.js';

export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const isId = (v) => Number.isInteger(v) && v > 0;

// ISO 8601 -> 'YYYY-MM-DD HH:MM:SS' (UTC) để lưu vào DATETIME
function toMysqlUtc(value, field) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) {
    throw new AppError(400, 'INVALID_INPUT', `${field} không hợp lệ (cần định dạng ISO 8601)`);
  }
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// Chuyển lỗi của MySQL thành lỗi nghiệp vụ
function translateError(err) {
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

export async function bookAppointment({ patientId, doctorId, roomId = null, startAt, endAt, reason = null }) {
  if (!isId(patientId) || !isId(doctorId) || (roomId !== null && !isId(roomId))) {
    throw new AppError(400, 'INVALID_INPUT', 'patientId, doctorId, roomId phải là số nguyên dương');
  }
  const start = toMysqlUtc(startAt, 'startAt');
  const end = toMysqlUtc(endAt, 'endAt');
  if (end <= start) {
    throw new AppError(400, 'INVALID_INPUT', 'endAt phải sau startAt');
  }
  if (new Date(startAt) <= new Date()) {
    throw new AppError(400, 'INVALID_INPUT', 'Không thể đặt lịch trong quá khứ');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Khóa dòng bác sĩ (rồi đến phòng) để các request cùng bác sĩ/phòng xếp hàng.
    // Luôn khóa theo thứ tự cố định: doctor -> room, tránh deadlock.
    const [doctors] = await conn.query('SELECT id FROM doctor WHERE id = ? FOR UPDATE', [doctorId]);
    if (doctors.length === 0) throw new AppError(404, 'DOCTOR_NOT_FOUND', 'Bác sĩ không tồn tại');

    if (roomId !== null) {
      const [rooms] = await conn.query('SELECT id FROM room WHERE id = ? FOR UPDATE', [roomId]);
      if (rooms.length === 0) throw new AppError(404, 'ROOM_NOT_FOUND', 'Phòng không tồn tại');
    }

    // Kiểm tra chồng lấn khoảng thời gian (unique index chỉ bắt được trùng đúng giờ bắt đầu)
    const [doctorBusy] = await conn.query(
      `SELECT id FROM appointment
       WHERE doctor_id = ? AND status NOT IN ('CANCELLED','NO_SHOW')
         AND start_at < ? AND end_at > ?
       LIMIT 1`,
      [doctorId, end, start]
    );
    if (doctorBusy.length) throw new AppError(409, 'SLOT_TAKEN', 'Bác sĩ đã có lịch trong khung giờ này');

    if (roomId !== null) {
      const [roomBusy] = await conn.query(
        `SELECT id FROM appointment
         WHERE room_id = ? AND status NOT IN ('CANCELLED','NO_SHOW')
           AND start_at < ? AND end_at > ?
         LIMIT 1`,
        [roomId, end, start]
      );
      if (roomBusy.length) throw new AppError(409, 'SLOT_TAKEN', 'Phòng đã có lịch trong khung giờ này');
    }

    const [result] = await conn.query(
      `INSERT INTO appointment (patient_id, doctor_id, room_id, start_at, end_at, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [patientId, doctorId, roomId, start, end, reason]
    );

    await conn.commit();
    return { id: result.insertId, patientId, doctorId, roomId, startAt: start, endAt: end, status: 'PENDING' };
  } catch (err) {
    await conn.rollback();
    throw translateError(err);
  } finally {
    conn.release();
  }
}