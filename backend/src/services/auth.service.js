import bcrypt from 'bcryptjs';
import pool, { withTransaction } from '../config/db.js';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import * as v from '../utils/validate.js';
import { ROLES, USER_STATUS, GENDERS } from '../utils/constants.js';
import {
  signAccessToken, accessTokenTtlSeconds, generateRefreshToken, hashToken, newFamilyId,
} from '../utils/jwt.js';

const BCRYPT_ROUNDS = 10;
// So khớp với hash giả khi không tìm thấy tài khoản để thời gian phản hồi không lộ email có tồn tại hay không
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);
const INVALID_CREDENTIALS = 'Email/tên đăng nhập hoặc mật khẩu không đúng';

// ── Giới hạn đăng nhập sai ───────────────────────────────────────────────────
// Ưu tiên bảng login_attempts (migration 001). Nếu chưa chạy migration thì dùng bộ nhớ.
const WINDOW_MIN = 15;
const MAX_PER_ACCOUNT = 5;
const MAX_PER_IP = 30;
const attempts = new Map();
let loginAttemptsTable = true; // tắt sau lần gặp ER_NO_SUCH_TABLE

function memCount(key) {
  const a = attempts.get(key);
  if (!a || Date.now() - a.first > WINDOW_MIN * 60_000) return 0;
  return a.count;
}
function memFail(key) {
  const a = attempts.get(key);
  if (!a || Date.now() - a.first > WINDOW_MIN * 60_000) attempts.set(key, { count: 1, first: Date.now() });
  else a.count += 1;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, a] of attempts) if (now - a.first > WINDOW_MIN * 60_000) attempts.delete(k);
}, WINDOW_MIN * 60_000).unref();

async function tooManyAttempts(ip, login) {
  if (!loginAttemptsTable) {
    return memCount(`acc:${ip}|${login}`) >= MAX_PER_ACCOUNT || memCount(`ip:${ip}`) >= MAX_PER_IP;
  }
  try {
    const [[acc]] = await pool.query(
      `SELECT COUNT(*) AS n FROM login_attempts
        WHERE ip = ? AND login_key = ? AND failed_at > UTC_TIMESTAMP() - INTERVAL ? MINUTE`,
      [ip, login, WINDOW_MIN],
    );
    const [[byIp]] = await pool.query(
      `SELECT COUNT(*) AS n FROM login_attempts
        WHERE ip = ? AND failed_at > UTC_TIMESTAMP() - INTERVAL ? MINUTE`,
      [ip, WINDOW_MIN],
    );
    return acc.n >= MAX_PER_ACCOUNT || byIp.n >= MAX_PER_IP;
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') { loginAttemptsTable = false; return tooManyAttempts(ip, login); }
    throw err;
  }
}

async function recordLoginFailure(ip, login) {
  if (!loginAttemptsTable) {
    memFail(`acc:${ip}|${login}`);
    memFail(`ip:${ip}`);
    return;
  }
  try {
    await pool.query('INSERT INTO login_attempts (ip, login_key) VALUES (?, ?)', [ip, login]);
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') { loginAttemptsTable = false; return recordLoginFailure(ip, login); }
    throw err;
  }
}

// ── Hồ sơ người dùng trả cho client (không bao giờ có password_hash) ─────────

export async function getUserProfile(userId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT u.id, u.username, u.email, u.phone, u.full_name, u.avatar_url, u.role, u.status,
            u.created_at, u.updated_at,
            p.id AS patient_id, p.date_of_birth, p.gender, p.address,
            d.id AS doctor_id, d.specialty_id, s.name AS specialty_name, d.experience, d.degree,
            a.id AS admin_id, a.position
       FROM users u
       LEFT JOIN patient p       ON p.user_id = u.id
       LEFT JOIN doctor d        ON d.user_id = u.id
       LEFT JOIN specialty s     ON s.id = d.specialty_id
       LEFT JOIN admin_profile a ON a.user_id = u.id
      WHERE u.id = ?`,
    [userId],
  );
  return rows[0] ? serializeUser(rows[0]) : null;
}

export function serializeUser(r) {
  const user = {
    id: r.id,
    username: r.username,
    email: r.email,
    phone: r.phone,
    fullName: r.full_name,
    avatarUrl: r.avatar_url,
    role: r.role,
    status: r.status,
    createdAt: v.fromMysql(r.created_at),
    updatedAt: v.fromMysql(r.updated_at),
  };
  if (r.role === ROLES.PATIENT && r.patient_id) {
    user.patient = { id: r.patient_id, dateOfBirth: r.date_of_birth, gender: r.gender, address: r.address };
  }
  if (r.role === ROLES.DOCTOR && r.doctor_id) {
    user.doctor = {
      id: r.doctor_id, specialtyId: r.specialty_id, specialtyName: r.specialty_name,
      experience: r.experience, degree: r.degree,
    };
  }
  if (r.role === ROLES.ADMIN && r.admin_id) {
    user.admin = { id: r.admin_id, position: r.position };
  }
  return user;
}

// ── Token ────────────────────────────────────────────────────────────────────

async function issueTokens(conn, user, familyId = newFamilyId()) {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86_400_000);
  await conn.query(
    'INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
    [user.id, familyId, hashToken(refreshToken), v.toMysql(expiresAt)],
  );
  return {
    accessToken: signAccessToken({ userId: user.id, role: user.role }),
    tokenType: 'Bearer',
    expiresIn: accessTokenTtlSeconds(),
    refreshToken,
    refreshTokenExpiresAt: expiresAt.toISOString(),
  };
}

export function translateUserDup(err, acc) {
  if (err.code === 'ER_DUP_ENTRY') {
    const emailTaken = new AppError(409, 'EMAIL_TAKEN', 'Email đã được sử dụng');
    if (err.message.includes('uq_users_email')) return emailTaken;
    if (err.message.includes('uq_users_username')) {
      // username mặc định = email nên MySQL có thể báo trùng username trước khi xét tới email
      if (acc && acc.username === acc.email) return emailTaken;
      return new AppError(409, 'USERNAME_TAKEN', 'Tên đăng nhập đã được sử dụng');
    }
  }
  return err;
}

// ── Nghiệp vụ ────────────────────────────────────────────────────────────────

/** Đọc & kiểm tra thông tin tài khoản chung (dùng cho tự đăng ký và admin tạo tài khoản). */
export function parseAccountInput(b) {
  const email = v.email(b.email);
  // Frontend không có ô username: mặc định dùng email (email chứa '@' nên không thể trùng username người khác tự đặt)
  let username = v.username(b.username, 'username', { required: false });
  if (!username) {
    if (email.length > 100) throw new AppError(400, 'INVALID_INPUT', 'Email quá dài, vui lòng nhập username');
    username = email;
  }
  return {
    email,
    username,
    password: v.password(b.password),
    fullName: v.str(b.fullName, 'fullName', { required: true, max: 255 }),
    phone: v.phone(b.phone),
  };
}

export function parsePatientInput(b) {
  return {
    dateOfBirth: v.dateOnly(b.dateOfBirth, 'dateOfBirth', { required: false }),
    gender: v.oneOf(b.gender, 'gender', GENDERS, { required: false }),
    address: v.str(b.address, 'address', { max: 500 }),
  };
}

/** Chèn users + patient + wallet trên connection đang trong transaction. */
export async function insertPatientAccount(conn, acc, pat) {
  const passwordHash = await bcrypt.hash(acc.password, BCRYPT_ROUNDS);
  const [u] = await conn.query(
    `INSERT INTO users (username, email, phone, password_hash, full_name, role)
     VALUES (?, ?, ?, ?, ?, 'PATIENT')`,
    [acc.username, acc.email, acc.phone, passwordHash, acc.fullName],
  );
  const [p] = await conn.query(
    'INSERT INTO patient (user_id, date_of_birth, gender, address) VALUES (?, ?, ?, ?)',
    [u.insertId, pat.dateOfBirth, pat.gender, pat.address],
  );
  await conn.query('INSERT INTO wallet (patient_id) VALUES (?)', [p.insertId]);
  return { userId: u.insertId, patientId: p.insertId };
}

export async function hashPassword(pw) {
  return bcrypt.hash(pw, BCRYPT_ROUNDS);
}

/** Tự đăng ký: luôn là PATIENT. Trùng email/username do unique index bắt (không SELECT kiểm tra trước). */
export async function register(input) {
  const acc = parseAccountInput(input);
  const pat = parsePatientInput(input);
  try {
    return await withTransaction(async (conn) => {
      const { userId } = await insertPatientAccount(conn, acc, pat);
      const tokens = await issueTokens(conn, { id: userId, role: ROLES.PATIENT });
      const user = await getUserProfile(userId, conn);
      return { user, ...tokens };
    });
  } catch (err) {
    throw translateUserDup(err, acc);
  }
}

export async function login(input, ip) {
  const login = v.str(input.login ?? input.email ?? input.username, 'email', { required: true, max: 255 }).toLowerCase();
  if (typeof input.password !== 'string' || !input.password) {
    throw new AppError(400, 'INVALID_INPUT', 'password là bắt buộc');
  }

  if (await tooManyAttempts(ip, login)) {
    throw new AppError(429, 'TOO_MANY_ATTEMPTS', 'Đăng nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút');
  }

  const [rows] = await pool.query(
    'SELECT id, role, status, password_hash FROM users WHERE email = ? OR username = ? LIMIT 1',
    [login, login],
  );
  const user = rows[0];
  const okPassword = await bcrypt.compare(input.password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !okPassword) {
    await recordLoginFailure(ip, login);
    throw new AppError(401, 'INVALID_CREDENTIALS', INVALID_CREDENTIALS);
  }

  // Chỉ báo khóa SAU khi mật khẩu đúng để không lộ trạng thái tài khoản cho người đoán mò
  if (user.status !== USER_STATUS.ACTIVE) {
    throw new AppError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa, vui lòng liên hệ phòng khám');
  }

  return withTransaction(async (conn) => {
    const tokens = await issueTokens(conn, user);
    return { user: await getUserProfile(user.id, conn), ...tokens };
  });
}

/**
 * Xoay vòng refresh token. Đánh dấu "đã dùng" bằng MỘT UPDATE có điều kiện: hai request
 * đồng thời cùng token thì chỉ một request có affectedRows = 1.
 */
export async function refresh(input) {
  const raw = v.str(input.refreshToken, 'refreshToken', { required: true, max: 200 });
  const tokenHash = hashToken(raw);

  const outcome = await withTransaction(async (conn) => {
    const [upd] = await conn.query(
      `UPDATE refresh_tokens SET used_at = UTC_TIMESTAMP()
        WHERE token_hash = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP()`,
      [tokenHash],
    );
    const [[row]] = await conn.query(
      `SELECT rt.user_id, rt.family_id, rt.used_at, rt.revoked_at, u.role, u.status
         FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
        WHERE rt.token_hash = ?`,
      [tokenHash],
    );

    if (upd.affectedRows === 1) {
      if (row.status !== USER_STATUS.ACTIVE) return { error: 'LOCKED' };
      const tokens = await issueTokens(conn, { id: row.user_id, role: row.role }, row.family_id);
      return { tokens };
    }
    // Token đã dùng mà bị đem dùng lại: coi như bị đánh cắp, thu hồi cả family
    if (row && row.used_at) {
      await conn.query(
        'UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE family_id = ? AND revoked_at IS NULL',
        [row.family_id],
      );
      return { error: 'REUSED' };
    }
    return { error: 'INVALID' };
  });

  // Ném lỗi SAU khi commit để việc thu hồi family không bị rollback
  if (outcome.error === 'REUSED') {
    throw new AppError(401, 'REFRESH_TOKEN_REUSED', 'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại');
  }
  if (outcome.error === 'LOCKED') {
    throw new AppError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa, vui lòng liên hệ phòng khám');
  }
  if (outcome.error) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token không hợp lệ hoặc đã hết hạn');
  }
  return outcome.tokens;
}

/** Đăng xuất thiết bị hiện tại: thu hồi cả family của refresh token. */
export async function logout(input) {
  const raw = v.str(input.refreshToken, 'refreshToken', { required: true, max: 200 });
  const [[row]] = await pool.query('SELECT family_id FROM refresh_tokens WHERE token_hash = ?', [hashToken(raw)]);
  if (row) {
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE family_id = ? AND revoked_at IS NULL',
      [row.family_id],
    );
  }
}

/** Đổi mật khẩu: cập nhật hash và thu hồi MỌI refresh token trong cùng transaction, rồi cấp phiên mới. */
export async function changePassword(user, input) {
  if (typeof input.oldPassword !== 'string' || !input.oldPassword) {
    throw new AppError(400, 'INVALID_INPUT', 'oldPassword là bắt buộc');
  }
  const newPassword = v.password(input.newPassword, 'newPassword');
  if (newPassword === input.oldPassword) {
    throw new AppError(400, 'INVALID_INPUT', 'Mật khẩu mới phải khác mật khẩu hiện tại');
  }
  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  return withTransaction(async (conn) => {
    const [[row]] = await conn.query('SELECT password_hash FROM users WHERE id = ? FOR UPDATE', [user.id]);
    if (!row || !(await bcrypt.compare(input.oldPassword, row.password_hash))) {
      throw new AppError(400, 'WRONG_PASSWORD', 'Mật khẩu hiện tại không đúng');
    }
    await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);
    await conn.query(
      'UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE user_id = ? AND revoked_at IS NULL',
      [user.id],
    );
    return issueTokens(conn, user);
  });
}

/** Cập nhật hồ sơ của chính mình; mỗi vai trò chỉ sửa được các trường thuộc hồ sơ của mình. */
export async function updateMe(user, b) {
  const userSet = {};
  if (v.has(b, 'fullName')) userSet.full_name = v.str(b.fullName, 'fullName', { required: true, max: 255 });
  if (v.has(b, 'phone')) userSet.phone = v.phone(b.phone);
  if (v.has(b, 'avatarUrl')) userSet.avatar_url = parseAvatarUrl(b.avatarUrl);

  const profileSet = {};
  if (user.role === ROLES.PATIENT) {
    if (v.has(b, 'dateOfBirth')) profileSet.date_of_birth = v.dateOnly(b.dateOfBirth, 'dateOfBirth', { required: false });
    if (v.has(b, 'gender')) profileSet.gender = v.oneOf(b.gender, 'gender', GENDERS, { required: false });
    if (v.has(b, 'address')) profileSet.address = v.str(b.address, 'address', { max: 500 });
  }
  if (user.role === ROLES.ADMIN && v.has(b, 'position')) {
    profileSet.position = v.str(b.position, 'position', { max: 100 });
  }

  await withTransaction(async (conn) => {
    if (Object.keys(userSet).length) {
      await conn.query('UPDATE users SET ? WHERE id = ?', [userSet, user.id]);
    }
    if (Object.keys(profileSet).length) {
      if (user.role === ROLES.PATIENT) {
        await conn.query('UPDATE patient SET ? WHERE id = ?', [profileSet, user.patientId]);
      } else if (user.role === ROLES.ADMIN && user.adminId) {
        await conn.query('UPDATE admin_profile SET ? WHERE id = ?', [profileSet, user.adminId]);
      }
    }
  });
  return getUserProfile(user.id);
}

export function parseAvatarUrl(value) {
  const url = v.str(value, 'avatarUrl', { max: 500 });
  // Chỉ nhận URL http(s); ảnh base64 không vừa cột varchar(500)
  if (url !== null && !/^https?:\/\/\S+$/i.test(url)) {
    throw new AppError(400, 'INVALID_INPUT', 'avatarUrl phải là đường dẫn http(s), tối đa 500 ký tự');
  }
  return url;
}
