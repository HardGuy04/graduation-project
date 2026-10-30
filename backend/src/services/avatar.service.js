// Ảnh đại diện lưu trên đĩa: <backend>/<UPLOAD_DIR>/avatars/<userId>-<thời gian>-<ngẫu nhiên>.<ext>
// Định dạng xác định theo magic bytes, không tin tên file hay Content-Type do client gửi.
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pool from '../config/db.js';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';

const BACKEND_ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const AVATAR_DIR = path.resolve(BACKEND_ROOT, env.UPLOAD_DIR, 'avatars');
const PUBLIC_PREFIX = `${env.API_PUBLIC_URL}/uploads/avatars/`;
const SAFE_NAME = /^[\w-]+\.(jpg|png|webp|gif)$/;

function detectImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  const gif = buf.toString('ascii', 0, 6);
  if (gif === 'GIF87a' || gif === 'GIF89a') return 'gif';
  return null;
}

/** Xóa file ảnh cũ nếu do chính server này lưu; URL ngoài (http của nơi khác) thì bỏ qua. */
export async function removeLocalAvatar(url) {
  if (typeof url !== 'string' || !url.startsWith(PUBLIC_PREFIX)) return;
  const name = url.slice(PUBLIC_PREFIX.length);
  if (!SAFE_NAME.test(name)) return;
  await unlink(path.join(AVATAR_DIR, name)).catch(() => {});
}

export async function saveAvatar(userId, file) {
  if (!file?.buffer?.length) throw new AppError(400, 'INVALID_INPUT', 'Vui lòng chọn một ảnh');
  const ext = detectImage(file.buffer);
  if (!ext) throw new AppError(400, 'INVALID_INPUT', 'Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF');

  await mkdir(AVATAR_DIR, { recursive: true });
  const name = `${userId}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const filePath = path.join(AVATAR_DIR, name);
  await writeFile(filePath, file.buffer, { flag: 'wx' });

  const [[old]] = await pool.query('SELECT avatar_url FROM users WHERE id = ?', [userId]);
  try {
    await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [`${PUBLIC_PREFIX}${name}`, userId]);
  } catch (err) {
    await unlink(filePath).catch(() => {});
    throw err;
  }
  await removeLocalAvatar(old?.avatar_url);
}
