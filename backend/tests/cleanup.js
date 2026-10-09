// Dọn dữ liệu kiểm thử: CHỈ xóa user có email test-%@example.com, chuyên khoa/phòng tên "TEST-%"
// và các bản ghi phụ thuộc của chúng. Không đụng tới dữ liệu thật.
//   npm run test:cleanup              → xóa
//   npm run test:cleanup -- --dry-run → chỉ đếm
import pool, { withTransaction } from '../src/config/db.js';

const DRY = process.argv.includes('--dry-run');
const ids = (rows) => rows.map((r) => r.id);

async function selectIds(conn, sql, list) {
  if (Array.isArray(list) && !list.length) return [];
  const [rows] = await conn.query(sql, list === undefined ? [] : [list]);
  return ids(rows);
}

async function del(conn, table, column, list, counts) {
  if (!list.length) { counts[table] = (counts[table] || 0); return; }
  if (DRY) {
    const [[r]] = await conn.query('SELECT COUNT(*) AS n FROM ?? WHERE ?? IN (?)', [table, column, list]);
    counts[table] = (counts[table] || 0) + r.n;
    return;
  }
  const [r] = await conn.query(`DELETE FROM ?? WHERE ?? IN (?)`, [table, column, list]);
  counts[table] = (counts[table] || 0) + r.affectedRows;
}

try {
  const counts = await withTransaction(async (conn) => {
    const c = {};
    const users = await selectIds(conn, "SELECT id FROM users WHERE email LIKE 'test-%@example.com'");
    const patients = await selectIds(conn, 'SELECT id FROM patient WHERE user_id IN (?)', users);
    const doctors = await selectIds(conn, 'SELECT id FROM doctor WHERE user_id IN (?)', users);
    const admins = await selectIds(conn, 'SELECT id FROM admin_profile WHERE user_id IN (?)', users);
    const specialties = await selectIds(conn, "SELECT id FROM specialty WHERE name LIKE 'TEST-%'");
    const rooms = await selectIds(conn, "SELECT id FROM room WHERE name LIKE 'TEST-%'");

    const appts = [
      ...await selectIds(conn, 'SELECT id FROM appointment WHERE patient_id IN (?)', patients),
      ...await selectIds(conn, 'SELECT id FROM appointment WHERE doctor_id IN (?)', doctors),
    ].filter((x, i, a) => a.indexOf(x) === i);

    // Lịch thật mà dính tới phòng/admin test thì dừng lại, không tự ý xóa dữ liệu thật
    const [foreign] = await conn.query(
      `SELECT COUNT(*) AS n FROM appointment
        WHERE (room_id IN (?) OR admin_id IN (?)) ${appts.length ? 'AND id NOT IN (?)' : ''}`,
      [rooms.length ? rooms : [0], admins.length ? admins : [0], ...(appts.length ? [appts] : [])],
    );
    if (foreign[0].n > 0) {
      throw new Error(`Có ${foreign[0].n} lịch hẹn thật dùng phòng/admin test — hãy xử lý thủ công trước khi dọn`);
    }

    const invoices = await selectIds(conn, 'SELECT id FROM invoice WHERE appointment_id IN (?)', appts);
    const records = await selectIds(conn, 'SELECT id FROM medical_record WHERE appointment_id IN (?)', appts);
    const prescriptions = await selectIds(conn, 'SELECT id FROM prescription WHERE medical_record_id IN (?)', records);
    const wallets = await selectIds(conn, 'SELECT id FROM wallet WHERE patient_id IN (?)', patients);
    const wtx = [
      ...await selectIds(conn, 'SELECT id FROM wallet_transaction WHERE wallet_id IN (?)', wallets),
      ...await selectIds(conn, 'SELECT id FROM wallet_transaction WHERE invoice_id IN (?)', invoices),
    ].filter((x, i, a) => a.indexOf(x) === i);
    const notifs = [
      ...await selectIds(conn, 'SELECT id FROM notification WHERE patient_id IN (?)', patients),
      ...await selectIds(conn, 'SELECT id FROM notification WHERE appointment_id IN (?)', appts),
    ].filter((x, i, a) => a.indexOf(x) === i);

    // Thứ tự xóa: bảng con trước bảng cha (đa số FK không có ON DELETE CASCADE)
    await del(conn, 'wallet_transaction', 'id', wtx, c);
    await del(conn, 'invoice_detail', 'invoice_id', invoices, c);
    await del(conn, 'invoice', 'id', invoices, c);
    await del(conn, 'prescription_detail', 'prescription_id', prescriptions, c);
    await del(conn, 'prescription', 'id', prescriptions, c);
    await del(conn, 'medical_record', 'id', records, c);
    await del(conn, 'notification', 'id', notifs, c);
    await del(conn, 'appointment', 'id', appts, c);
    await del(conn, 'wallet', 'id', wallets, c);
    await del(conn, 'doctor_schedule', 'doctor_id', doctors, c);
    await del(conn, 'doctor_leave', 'doctor_id', doctors, c);
    await del(conn, 'income', 'doctor_id', doctors, c);
    await del(conn, 'patient', 'id', patients, c);
    await del(conn, 'doctor', 'id', doctors, c);
    await del(conn, 'admin_profile', 'id', admins, c);
    await del(conn, 'refresh_tokens', 'user_id', users, c);
    await del(conn, 'users', 'id', users, c);
    await del(conn, 'specialty', 'id', specialties, c);
    await del(conn, 'room', 'id', rooms, c);
    return c;
  });
  console.log(DRY ? 'Dry-run — số dòng SẼ bị xóa:' : 'Đã xóa dữ liệu test:');
  for (const [t, n] of Object.entries(counts)) if (n) console.log(`  ${t}: ${n}`);
} catch (err) {
  console.error('Dọn dữ liệu thất bại:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
