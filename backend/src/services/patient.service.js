import pool from '../config/db.js';
import AppError from '../utils/AppError.js';
import * as v from '../utils/validate.js';
import { USER_STATUS } from '../utils/constants.js';

const notFound = () => new AppError(404, 'PATIENT_NOT_FOUND', 'Bệnh nhân không tồn tại');

const COLS = `
  p.id, u.id AS user_id, u.full_name, u.email, u.phone, u.avatar_url, u.status, u.created_at,
  p.date_of_birth, p.gender, p.address`;

function serialize(r) {
  return {
    id: r.id,
    userId: r.user_id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    avatarUrl: r.avatar_url,
    status: r.status,
    dateOfBirth: r.date_of_birth,
    gender: r.gender,
    address: r.address,
    createdAt: v.fromMysql(r.created_at),
  };
}

export async function listAdmin(query) {
  const { page, limit, offset } = v.pagination(query);
  const where = [];
  const params = [];
  const status = v.oneOf(query.status, 'status', Object.values(USER_STATUS), { required: false });
  if (status) { where.push('u.status = ?'); params.push(status); }
  const q = v.likePattern(query.q);
  if (q) { where.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)'); params.push(q, q, q); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT ${COLS} FROM patient p JOIN users u ON u.id = p.user_id ${w}
      ORDER BY u.created_at DESC, p.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM patient p JOIN users u ON u.id = p.user_id ${w}`, params,
  );
  return { rows: rows.map(serialize), page, limit, total };
}

// ── Bác sĩ: chỉ bệnh nhân từng có lịch (không tính lịch đã hủy) với chính bác sĩ đó ──
// Không trả email, trạng thái tài khoản, số dư ví — bác sĩ chỉ cần thông tin phục vụ khám.

const DOCTOR_COLS = 'p.id, u.full_name, u.phone, u.avatar_url, p.date_of_birth, p.gender, p.address';

function serializeForDoctor(r) {
  return {
    id: r.id,
    fullName: r.full_name,
    phone: r.phone,
    avatarUrl: r.avatar_url,
    dateOfBirth: r.date_of_birth,
    gender: r.gender,
    address: r.address,
    appointmentCount: r.appointment_count,
    lastVisitAt: v.fromMysql(r.last_visit_at),
  };
}

const DOCTOR_JOIN = `
  FROM appointment a
  JOIN patient p ON p.id = a.patient_id
  JOIN users u ON u.id = p.user_id
 WHERE a.doctor_id = ? AND a.status <> 'CANCELLED'`;

export async function listForDoctor(doctorId, query) {
  const { page, limit, offset } = v.pagination(query);
  const params = [doctorId];
  let extra = '';
  const q = v.likePattern(query.q);
  if (q) { extra = ' AND (u.full_name LIKE ? OR u.phone LIKE ?)'; params.push(q, q); }

  const [rows] = await pool.query(
    `SELECT ${DOCTOR_COLS}, COUNT(*) AS appointment_count, MAX(a.start_at) AS last_visit_at
       ${DOCTOR_JOIN}${extra}
      GROUP BY p.id, u.full_name, u.phone, u.avatar_url, p.date_of_birth, p.gender, p.address
      ORDER BY last_visit_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(DISTINCT p.id) AS total ${DOCTOR_JOIN}${extra}`, params);
  return { rows: rows.map(serializeForDoctor), page, limit, total };
}

export async function getForDoctor(doctorId, id) {
  const pid = v.id(id, 'id');
  const [rows] = await pool.query(
    `SELECT ${DOCTOR_COLS}, COUNT(*) AS appointment_count, MAX(a.start_at) AS last_visit_at
       ${DOCTOR_JOIN} AND p.id = ?
      GROUP BY p.id, u.full_name, u.phone, u.avatar_url, p.date_of_birth, p.gender, p.address`,
    [doctorId, pid],
  );
  if (!rows.length) throw notFound();
  return serializeForDoctor(rows[0]);
}

/** Hồ sơ bệnh nhân cho admin: thông tin cá nhân + số dư ví + tóm tắt lịch sử khám. */
export async function getAdmin(id) {
  const pid = v.id(id, 'id');
  const [rows] = await pool.query(
    `SELECT ${COLS}, w.balance AS wallet_balance
       FROM patient p JOIN users u ON u.id = p.user_id
       LEFT JOIN wallet w ON w.patient_id = p.id
      WHERE p.id = ?`,
    [pid],
  );
  if (!rows.length) throw notFound();
  const [[summary]] = await pool.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(status = 'DONE'), 0) AS done,
            COALESCE(SUM(status = 'CANCELLED'), 0) AS cancelled,
            COALESCE(SUM(status = 'NO_SHOW'), 0) AS noShow
       FROM appointment WHERE patient_id = ?`,
    [pid],
  );
  return {
    ...serialize(rows[0]),
    walletBalance: rows[0].wallet_balance,
    appointmentSummary: {
      total: summary.total, done: Number(summary.done), cancelled: Number(summary.cancelled), noShow: Number(summary.noShow),
    },
  };
}
