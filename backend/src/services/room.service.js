import pool from '../config/db.js';
import AppError from '../utils/AppError.js';
import * as v from '../utils/validate.js';
import { ROOM_STATUS, INACTIVE_APPT_STATUSES } from '../utils/constants.js';

const notFound = () => new AppError(404, 'ROOM_NOT_FOUND', 'Phòng không tồn tại');

function translate(err) {
  if (err.code === 'ER_DUP_ENTRY') return new AppError(409, 'ROOM_EXISTS', 'Tên phòng đã tồn tại');
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return new AppError(409, 'ROOM_IN_USE', 'Phòng đã có lịch hẹn, hãy chuyển trạng thái INACTIVE thay vì xóa');
  }
  return err;
}

export async function list(query) {
  const { page, limit, offset } = v.pagination(query);
  const status = v.oneOf(query.status, 'status', ROOM_STATUS, { required: false });
  const where = status ? 'WHERE status = ?' : '';
  const params = status ? [status] : [];
  const [rows] = await pool.query(
    `SELECT id, name, status FROM room ${where} ORDER BY name LIMIT ? OFFSET ?`, [...params, limit, offset],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM room ${where}`, params);
  return { rows, page, limit, total };
}

export async function get(id) {
  const [rows] = await pool.query('SELECT id, name, status FROM room WHERE id = ?', [v.id(id, 'id')]);
  if (!rows.length) throw notFound();
  return rows[0];
}

export async function create(b) {
  const row = {
    name: v.str(b.name, 'name', { required: true, max: 100 }),
    status: v.oneOf(b.status, 'status', ROOM_STATUS, { required: false }) || 'AVAILABLE',
  };
  try {
    const [r] = await pool.query('INSERT INTO room SET ?', [row]);
    return get(r.insertId);
  } catch (err) { throw translate(err); }
}

export async function update(id, b) {
  const rid = v.id(id, 'id');
  const set = {};
  if (v.has(b, 'name')) set.name = v.str(b.name, 'name', { required: true, max: 100 });
  if (v.has(b, 'status')) set.status = v.oneOf(b.status, 'status', ROOM_STATUS);
  if (!Object.keys(set).length) throw new AppError(400, 'INVALID_INPUT', 'Không có trường nào để cập nhật');
  try {
    const [r] = await pool.query('UPDATE room SET ? WHERE id = ?', [set, rid]);
    if (!r.affectedRows) throw notFound();
  } catch (err) { throw translate(err); }
  return get(rid);
}

export async function remove(id) {
  try {
    const [r] = await pool.query('DELETE FROM room WHERE id = ?', [v.id(id, 'id')]);
    if (!r.affectedRows) throw notFound();
  } catch (err) { throw translate(err); }
}

/** Phòng AVAILABLE không có lịch hẹn còn hiệu lực chồng lên [startAt, endAt). */
export async function available(query) {
  const start = v.isoDateTime(query.startAt, 'startAt');
  const end = v.isoDateTime(query.endAt, 'endAt');
  if (end <= start) throw new AppError(400, 'INVALID_INPUT', 'endAt phải sau startAt');
  const [rows] = await pool.query(
    `SELECT r.id, r.name, r.status FROM room r
      WHERE r.status = 'AVAILABLE'
        AND NOT EXISTS (
          SELECT 1 FROM appointment a
           WHERE a.room_id = r.id AND a.status NOT IN (?)
             AND a.start_at < ? AND a.end_at > ?)
      ORDER BY r.name`,
    [INACTIVE_APPT_STATUSES, v.toMysql(end), v.toMysql(start)],
  );
  return rows;
}
