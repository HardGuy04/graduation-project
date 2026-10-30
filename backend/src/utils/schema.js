// Kiểm tra cột do migration thêm vào đã tồn tại chưa, để API vẫn chạy khi migration chưa được áp dụng.
// Có cột thì nhớ luôn; chưa có thì kiểm tra lại sau RECHECK_MS (chạy migration xong không cần khởi động lại).
import pool from '../config/db.js';

const RECHECK_MS = 60_000;
const cache = new Map();

export async function hasColumn(table, column) {
  const key = `${table}.${column}`;
  const hit = cache.get(key);
  if (hit && (hit.ok || Date.now() - hit.at < RECHECK_MS)) return hit.ok;
  const [rows] = await pool.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
    [table, column],
  );
  const ok = rows.length > 0;
  cache.set(key, { ok, at: Date.now() });
  return ok;
}

/** Biểu thức SELECT cho doctor.bio: 'd.bio' khi đã có cột, ngược lại NULL. */
export async function doctorBioSelect() {
  return (await hasColumn('doctor', 'bio')) ? 'd.bio' : 'NULL';
}
