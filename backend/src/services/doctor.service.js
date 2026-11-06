import pool, { withTransaction } from '../config/db.js';
import AppError from '../utils/AppError.js';
import * as v from '../utils/validate.js';
import { USER_STATUS } from '../utils/constants.js';
import { parseAvatarUrl } from './auth.service.js';

const notFound = () => new AppError(404, 'DOCTOR_NOT_FOUND', 'Bác sĩ không tồn tại');

const BASE = `
  FROM doctor d
  JOIN users u      ON u.id = d.user_id
  JOIN specialty s  ON s.id = d.specialty_id`;

const PUBLIC_COLS = `d.id, u.full_name, u.avatar_url, d.specialty_id, s.name AS specialty_name, d.experience, d.degree`;
const ADMIN_COLS = `${PUBLIC_COLS}, u.id AS user_id, u.email, u.phone, u.status, u.created_at`;

function serialize(r, { admin = false } = {}) {
  const out = {
    id: r.id,
    fullName: r.full_name,
    avatarUrl: r.avatar_url,
    specialtyId: r.specialty_id,
    specialtyName: r.specialty_name,
    experience: r.experience,
    degree: r.degree,
  };
  if (admin) {
    Object.assign(out, {
      userId: r.user_id, email: r.email, phone: r.phone, status: r.status, createdAt: v.fromMysql(r.created_at),
    });
  }
  return out;
}

function filters(query, { admin }) {
  const where = [];
  const params = [];
  if (!admin) where.push("u.status = 'ACTIVE'");
  const specialtyId = v.optionalId(query.specialtyId, 'specialtyId');
  if (specialtyId) { where.push('d.specialty_id = ?'); params.push(specialtyId); }
  if (admin) {
    const status = v.oneOf(query.status, 'status', Object.values(USER_STATUS), { required: false });
    if (status) { where.push('u.status = ?'); params.push(status); }
  }
  const q = v.likePattern(query.q);
  if (q) {
    // Bệnh nhân chỉ tìm theo tên; admin tìm thêm theo email/SĐT
    if (admin) { where.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)'); params.push(q, q, q); }
    else { where.push('u.full_name LIKE ?'); params.push(q); }
  }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function listInternal(query, admin) {
  const { page, limit, offset } = v.pagination(query);
  const f = filters(query, { admin });
  const [rows] = await pool.query(
    `SELECT ${admin ? ADMIN_COLS : PUBLIC_COLS} ${BASE} ${f.sql} ORDER BY u.full_name LIMIT ? OFFSET ?`,
    [...f.params, limit, offset],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${BASE} ${f.sql}`, f.params);
  return { rows: rows.map((r) => serialize(r, { admin })), page, limit, total };
}

export const listPublic = (query) => listInternal(query, false);
export const listAdmin = (query) => listInternal(query, true);

export async function getPublic(id) {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLS} ${BASE} WHERE d.id = ? AND u.status = 'ACTIVE'`, [v.id(id, 'id')],
  );
  if (!rows.length) throw notFound();
  return serialize(rows[0]);
}

export async function getAdmin(id) {
  const [rows] = await pool.query(`SELECT ${ADMIN_COLS} ${BASE} WHERE d.id = ?`, [v.id(id, 'id')]);
  if (!rows.length) throw notFound();
  return serialize(rows[0], { admin: true });
}

/** Admin cập nhật hồ sơ bác sĩ (cả phần tài khoản users lẫn phần chuyên môn doctor). */
export async function updateByAdmin(id, b) {
  const did = v.id(id, 'id');
  const userSet = {};
  if (v.has(b, 'fullName')) userSet.full_name = v.str(b.fullName, 'fullName', { required: true, max: 255 });
  if (v.has(b, 'phone')) userSet.phone = v.phone(b.phone);
  if (v.has(b, 'avatarUrl')) userSet.avatar_url = parseAvatarUrl(b.avatarUrl);
  const docSet = {};
  if (v.has(b, 'specialtyId')) docSet.specialty_id = v.id(b.specialtyId, 'specialtyId');
  if (v.has(b, 'experience')) docSet.experience = v.int(b.experience, 'experience', { min: 0, max: 80 });
  if (v.has(b, 'degree')) docSet.degree = v.str(b.degree, 'degree', { max: 255 });
  if (!Object.keys(userSet).length && !Object.keys(docSet).length) {
    throw new AppError(400, 'INVALID_INPUT', 'Không có trường nào để cập nhật');
  }

  try {
    await withTransaction(async (conn) => {
      const [[doc]] = await conn.query('SELECT user_id FROM doctor WHERE id = ? FOR UPDATE', [did]);
      if (!doc) throw notFound();
      if (Object.keys(docSet).length) await conn.query('UPDATE doctor SET ? WHERE id = ?', [docSet, did]);
      if (Object.keys(userSet).length) await conn.query('UPDATE users SET ? WHERE id = ?', [userSet, doc.user_id]);
    });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') throw new AppError(400, 'SPECIALTY_NOT_FOUND', 'Chuyên khoa không tồn tại');
    throw err;
  }
  return getAdmin(did);
}
