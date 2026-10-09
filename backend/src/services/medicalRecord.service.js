// Bệnh án. Bảng medical_record không có patient_id/doctor_id nên mọi kiểm tra quyền sở hữu đi qua JOIN appointment.
// Quyền: bác sĩ GHI bệnh án cho lịch của chính mình; bác sĩ ĐỌC được lịch sử của bệnh nhân từng có lịch với mình;
// bệnh nhân chỉ đọc bệnh án của chính mình. Không đúng phạm vi → 404.
// Không log nội dung bệnh án/chẩn đoán ở bất kỳ đâu.
import pool, { withTransaction } from '../config/db.js';
import AppError from '../utils/AppError.js';
import * as v from '../utils/validate.js';
import { APPT_STATUS, ROLES } from '../utils/constants.js';
import { parsePrescription, writePrescription, loadPrescriptions } from './prescription.service.js';

const notFound = () => new AppError(404, 'MEDICAL_RECORD_NOT_FOUND', 'Bệnh án không tồn tại');
const MAX_TEXT = 5000;

const SELECT_RECORD = `
  SELECT m.id, m.appointment_id, m.symptoms, m.diagnosis, m.note, m.follow_up_date, m.created_at,
         a.start_at, a.end_at, a.status AS appointment_status, a.patient_id, a.doctor_id,
         pu.full_name AS patient_name, du.full_name AS doctor_name, s.name AS specialty_name
    FROM medical_record m
    JOIN appointment a ON a.id = m.appointment_id
    JOIN patient p ON p.id = a.patient_id
    JOIN users pu ON pu.id = p.user_id
    JOIN doctor d ON d.id = a.doctor_id
    JOIN users du ON du.id = d.user_id
    LEFT JOIN specialty s ON s.id = d.specialty_id`;

function serialize(r, prescription) {
  return {
    id: r.id,
    appointmentId: r.appointment_id,
    appointment: { startAt: v.fromMysql(r.start_at), endAt: v.fromMysql(r.end_at), status: r.appointment_status },
    patient: { id: r.patient_id, fullName: r.patient_name },
    doctor: { id: r.doctor_id, fullName: r.doctor_name, specialtyName: r.specialty_name },
    symptoms: r.symptoms,
    diagnosis: r.diagnosis,
    note: r.note,
    followUpDate: r.follow_up_date,
    prescription: prescription || null,
    createdAt: v.fromMysql(r.created_at),
  };
}

async function withPrescriptions(conn, rows) {
  const map = await loadPrescriptions(conn, rows.map((r) => r.id));
  return rows.map((r) => serialize(r, map.get(r.id)));
}

/** Phạm vi ĐỌC theo vai trò. */
function readScope(user) {
  if (user.role === ROLES.PATIENT) return { sql: 'a.patient_id = ?', params: [user.patientId] };
  if (user.role === ROLES.DOCTOR) {
    return {
      sql: `EXISTS (SELECT 1 FROM appointment x
                     WHERE x.patient_id = a.patient_id AND x.doctor_id = ? AND x.status <> 'CANCELLED')`,
      params: [user.doctorId],
    };
  }
  return { sql: '1 = 0', params: [] }; // admin không xem nội dung bệnh án
}

function parseFields(b, { partial }) {
  const out = {};
  for (const key of ['symptoms', 'diagnosis', 'note']) {
    if (!partial || v.has(b, key)) out[key] = v.str(b[key], key, { max: MAX_TEXT });
  }
  if (!partial && !out.diagnosis) throw new AppError(400, 'INVALID_INPUT', 'diagnosis là bắt buộc');
  if (partial && v.has(b, 'diagnosis') && !out.diagnosis) throw new AppError(400, 'INVALID_INPUT', 'diagnosis không được để trống');
  if (!partial || v.has(b, 'followUpDate')) out.follow_up_date = v.dateOnly(b.followUpDate, 'followUpDate', { required: false });
  return out;
}

function assertFollowUp(followUp, startAt) {
  if (followUp && followUp <= v.utcToClinic(new Date(v.fromMysql(startAt))).date) {
    throw new AppError(400, 'INVALID_INPUT', 'Ngày tái khám phải sau ngày khám');
  }
}

async function fetchRecord(conn, id) {
  const [rows] = await conn.query(`${SELECT_RECORD} WHERE m.id = ?`, [id]);
  return (await withPrescriptions(conn, rows))[0];
}

/**
 * Bác sĩ nhập bệnh án cho lịch đang khám (CHECKED_IN): ghi bệnh án + đơn thuốc (tùy chọn)
 * và chuyển lịch sang DONE trong MỘT transaction — không thể có lịch DONE thiếu bệnh án hoặc ngược lại.
 */
export async function create(user, b) {
  const appointmentId = v.id(b.appointmentId, 'appointmentId');
  const fields = parseFields(b, { partial: false });
  const prescription = b.prescription == null ? null : parsePrescription(b.prescription);

  try {
    return await withTransaction(async (conn) => {
      const [appt] = await conn.query(
        'SELECT id, status, start_at FROM appointment WHERE id = ? AND doctor_id = ? FOR UPDATE',
        [appointmentId, user.doctorId],
      );
      if (!appt.length) throw new AppError(404, 'APPOINTMENT_NOT_FOUND', 'Lịch hẹn không tồn tại');
      if (appt[0].status !== APPT_STATUS.CHECKED_IN) {
        throw new AppError(409, 'INVALID_STATUS', 'Chỉ nhập bệnh án cho lịch hẹn đã check-in');
      }
      assertFollowUp(fields.follow_up_date, appt[0].start_at);

      const [r] = await conn.query('INSERT INTO medical_record SET ?', [{ ...fields, appointment_id: appointmentId }]);
      if (prescription) await writePrescription(conn, r.insertId, prescription);
      const [u] = await conn.query(
        "UPDATE appointment SET status = 'DONE' WHERE id = ? AND status = 'CHECKED_IN'", [appointmentId],
      );
      if (u.affectedRows !== 1) throw new AppError(409, 'INVALID_STATUS', 'Trạng thái lịch hẹn vừa thay đổi, vui lòng thử lại');
      return fetchRecord(conn, r.insertId);
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new AppError(409, 'MEDICAL_RECORD_EXISTS', 'Lịch hẹn này đã có bệnh án');
    throw err;
  }
}

/** Khóa bệnh án do CHÍNH bác sĩ này viết (sửa/ghi đơn). */
async function lockOwnRecord(conn, user, id) {
  const [rows] = await conn.query(
    `SELECT m.id, a.start_at FROM medical_record m JOIN appointment a ON a.id = m.appointment_id
      WHERE m.id = ? AND a.doctor_id = ? FOR UPDATE`,
    [id, user.doctorId],
  );
  if (!rows.length) throw notFound();
  return rows[0];
}

export async function update(user, id, b) {
  const rid = v.id(id, 'id');
  const fields = parseFields(b, { partial: true });
  const prescription = v.has(b, 'prescription') && b.prescription !== null ? parsePrescription(b.prescription) : null;
  if (!Object.keys(fields).length && !prescription) throw new AppError(400, 'INVALID_INPUT', 'Không có thông tin nào để cập nhật');

  return withTransaction(async (conn) => {
    const rec = await lockOwnRecord(conn, user, rid);
    assertFollowUp(fields.follow_up_date, rec.start_at);
    if (Object.keys(fields).length) await conn.query('UPDATE medical_record SET ? WHERE id = ?', [fields, rid]);
    if (prescription) await writePrescription(conn, rid, prescription);
    return fetchRecord(conn, rid);
  });
}

/** Tạo hoặc thay toàn bộ đơn thuốc của bệnh án. */
export async function setPrescription(user, id, b) {
  const rid = v.id(id, 'id');
  const prescription = parsePrescription(b);
  return withTransaction(async (conn) => {
    await lockOwnRecord(conn, user, rid);
    await writePrescription(conn, rid, prescription);
    return fetchRecord(conn, rid);
  });
}

// ── Đọc ──────────────────────────────────────────────────────────────────────

export async function list(user, query, { patientId = null } = {}) {
  const { page, limit, offset } = v.pagination(query);
  const scope = readScope(user);
  const where = [scope.sql];
  const params = [...scope.params];
  if (patientId) { where.push('a.patient_id = ?'); params.push(patientId); }
  const w = where.join(' AND ');
  const [rows] = await pool.query(
    `${SELECT_RECORD} WHERE ${w} ORDER BY a.start_at DESC, m.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset],
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM medical_record m JOIN appointment a ON a.id = m.appointment_id WHERE ${w}`, params,
  );
  return { rows: await withPrescriptions(pool, rows), page, limit, total };
}

export async function get(user, id) {
  const scope = readScope(user);
  const [rows] = await pool.query(`${SELECT_RECORD} WHERE m.id = ? AND ${scope.sql}`, [v.id(id, 'id'), ...scope.params]);
  if (!rows.length) throw notFound();
  return (await withPrescriptions(pool, rows))[0];
}
