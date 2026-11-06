// Quản lý tài khoản (admin): tạo tài khoản mọi vai trò, khóa/mở khóa, sửa thông tin, đặt lại mật khẩu.
import pool, { withTransaction } from '../config/db.js';
import AppError from '../utils/AppError.js';
import * as v from '../utils/validate.js';
import { ROLES, USER_STATUS } from '../utils/constants.js';
import {
  getUserProfile, serializeUser, parseAccountInput, parsePatientInput, insertPatientAccount,
  hashPassword, translateUserDup, parseAvatarUrl,
} from './auth.service.js';

const notFound = () => new AppError(404, 'USER_NOT_FOUND', 'Tài khoản không tồn tại');

export async function listUsers(query) {
  const { page, limit, offset } = v.pagination(query);
  const where = [];
  const params = [];
  const role = v.oneOf(query.role, 'role', Object.values(ROLES), { required: false });
  if (role) { where.push('u.role = ?'); params.push(role); }
  const status = v.oneOf(query.status, 'status', Object.values(USER_STATUS), { required: false });
  if (status) { where.push('u.status = ?'); params.push(status); }
  const q = v.likePattern(query.q);
  if (q) {
    where.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.username LIKE ? OR u.phone LIKE ?)');
    params.push(q, q, q, q);
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.email, u.phone, u.full_name, u.avatar_url, u.role, u.status, u.created_at, u.updated_at
       FROM users u ${w} ORDER BY u.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users u ${w}`, params);
  return { rows: rows.map(serializeUser), page, limit, total };
}

export async function getUser(id) {
  const user = await getUserProfile(v.id(id, 'id'));
  if (!user) throw notFound();
  return user;
}

/** Admin tạo tài khoản DOCTOR / ADMIN / PATIENT; tài khoản và hồ sơ được tạo trong cùng transaction. */
export async function createUser(b) {
  const role = v.oneOf(b.role, 'role', Object.values(ROLES));
  const acc = parseAccountInput(b);

  let profile;
  if (role === ROLES.DOCTOR) {
    profile = {
      specialtyId: v.id(b.specialtyId, 'specialtyId'),
      experience: v.int(b.experience ?? 0, 'experience', { min: 0, max: 80 }),
      degree: v.str(b.degree, 'degree', { max: 255 }),
    };
  } else if (role === ROLES.ADMIN) {
    profile = { position: v.str(b.position, 'position', { max: 100 }) };
  } else {
    profile = parsePatientInput(b);
  }

  try {
    const userId = await withTransaction(async (conn) => {
      if (role === ROLES.PATIENT) return (await insertPatientAccount(conn, acc, profile)).userId;

      const [u] = await conn.query(
        'INSERT INTO users (username, email, phone, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)',
        [acc.username, acc.email, acc.phone, await hashPassword(acc.password), acc.fullName, role],
      );
      if (role === ROLES.DOCTOR) {
        await conn.query(
          'INSERT INTO doctor (user_id, specialty_id, experience, degree) VALUES (?, ?, ?, ?)',
          [u.insertId, profile.specialtyId, profile.experience, profile.degree],
        );
      } else {
        await conn.query('INSERT INTO admin_profile (user_id, position) VALUES (?, ?)', [u.insertId, profile.position]);
      }
      return u.insertId;
    });
    return getUserProfile(userId);
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') throw new AppError(400, 'SPECIALTY_NOT_FOUND', 'Chuyên khoa không tồn tại');
    throw translateUserDup(err, acc);
  }
}

/** Sửa thông tin tài khoản (không đổi vai trò; email/username vẫn được unique index bảo vệ). */
export async function updateUser(id, b) {
  const uid = v.id(id, 'id');
  const set = {};
  if (v.has(b, 'fullName')) set.full_name = v.str(b.fullName, 'fullName', { required: true, max: 255 });
  if (v.has(b, 'phone')) set.phone = v.phone(b.phone);
  if (v.has(b, 'email')) set.email = v.email(b.email);
  if (v.has(b, 'username')) set.username = v.username(b.username);
  if (v.has(b, 'avatarUrl')) set.avatar_url = parseAvatarUrl(b.avatarUrl);
  if (!Object.keys(set).length) throw new AppError(400, 'INVALID_INPUT', 'Không có trường nào để cập nhật');
  try {
    const [r] = await pool.query('UPDATE users SET ? WHERE id = ?', [set, uid]);
    if (!r.affectedRows) throw notFound();
  } catch (err) {
    throw translateUserDup(err, { username: set.username, email: set.email });
  }
  return getUserProfile(uid);
}

/** Khóa/mở khóa. Khóa thì thu hồi luôn mọi refresh token trong cùng transaction. */
export async function setStatus(actor, id, b) {
  const uid = v.id(id, 'id');
  const status = v.oneOf(b.status, 'status', Object.values(USER_STATUS));
  if (uid === actor.id) throw new AppError(400, 'CANNOT_CHANGE_SELF', 'Không thể tự thay đổi trạng thái tài khoản của mình');

  await withTransaction(async (conn) => {
    const [r] = await conn.query('UPDATE users SET status = ? WHERE id = ?', [status, uid]);
    if (!r.affectedRows) throw notFound();
    if (status !== USER_STATUS.ACTIVE) {
      await conn.query('UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE user_id = ? AND revoked_at IS NULL', [uid]);
    }
  });
  return getUserProfile(uid);
}

/** Đặt lại mật khẩu (người dùng quên mật khẩu, nhờ lễ tân); thu hồi mọi phiên cũ. */
export async function resetPassword(id, b) {
  const uid = v.id(id, 'id');
  const hash = await hashPassword(v.password(b.newPassword, 'newPassword'));
  await withTransaction(async (conn) => {
    const [r] = await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, uid]);
    if (!r.affectedRows) throw notFound();
    await conn.query('UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE user_id = ? AND revoked_at IS NULL', [uid]);
  });
}
