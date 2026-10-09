import pool from '../config/db.js';
import AppError from '../utils/AppError.js';
import * as v from '../utils/validate.js';

const notFound = () => new AppError(404, 'SPECIALTY_NOT_FOUND', 'Chuyên khoa không tồn tại');

// doctorCount chỉ đếm bác sĩ có tài khoản ACTIVE — đúng với danh sách bệnh nhân nhìn thấy khi đặt lịch
const SELECT = `
  SELECT s.id, s.name, s.description,
         (SELECT COUNT(*) FROM doctor d JOIN users u ON u.id = d.user_id
           WHERE d.specialty_id = s.id AND u.status = 'ACTIVE') AS doctorCount
    FROM specialty s`;

export async function list(query) {
  const { page, limit, offset } = v.pagination(query);
  const q = v.likePattern(query.q);
  const where = q ? 'WHERE s.name LIKE ?' : '';
  const params = q ? [q] : [];
  const [rows] = await pool.query(`${SELECT} ${where} ORDER BY s.name LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM specialty s ${where}`, params);
  return { rows, page, limit, total };
}

export async function get(id) {
  const [rows] = await pool.query(`${SELECT} WHERE s.id = ?`, [v.id(id, 'id')]);
  if (!rows.length) throw notFound();
  return rows[0];
}

function translate(err) {
  if (err.code === 'ER_DUP_ENTRY') return new AppError(409, 'SPECIALTY_EXISTS', 'Tên chuyên khoa đã tồn tại');
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return new AppError(409, 'SPECIALTY_IN_USE', 'Chuyên khoa đang có bác sĩ, không thể xóa');
  }
  return err;
}

export async function create(b) {
  const row = {
    name: v.str(b.name, 'name', { required: true, max: 100 }),
    description: v.str(b.description, 'description', { max: 500 }),
  };
  try {
    const [r] = await pool.query('INSERT INTO specialty SET ?', [row]);
    return get(r.insertId);
  } catch (err) { throw translate(err); }
}

export async function update(id, b) {
  const sid = v.id(id, 'id');
  const set = {};
  if (v.has(b, 'name')) set.name = v.str(b.name, 'name', { required: true, max: 100 });
  if (v.has(b, 'description')) set.description = v.str(b.description, 'description', { max: 500 });
  if (!Object.keys(set).length) throw new AppError(400, 'INVALID_INPUT', 'Không có trường nào để cập nhật');
  try {
    const [r] = await pool.query('UPDATE specialty SET ? WHERE id = ?', [set, sid]);
    if (!r.affectedRows) throw notFound();
  } catch (err) { throw translate(err); }
  return get(sid);
}

export async function remove(id) {
  try {
    const [r] = await pool.query('DELETE FROM specialty WHERE id = ?', [v.id(id, 'id')]);
    if (!r.affectedRows) throw notFound();
  } catch (err) { throw translate(err); }
}
