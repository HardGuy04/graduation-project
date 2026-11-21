// Kiểm tra nhanh dữ liệu users: tổng số, số tên còn dạng "Test", số email còn miền example.com.
import pool from '../src/config/db.js';

try {
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM users');
  const [[{ testNames }]] = await pool.query(
    "SELECT COUNT(*) AS testNames FROM users WHERE full_name LIKE 'Test %' OR full_name LIKE 'TEST %'",
  );
  const [[{ exampleEmails }]] = await pool.query(
    "SELECT COUNT(*) AS exampleEmails FROM users WHERE email LIKE '%@example.com'",
  );
  const [byRole] = await pool.query(
    'SELECT role, COUNT(*) AS n FROM users GROUP BY role ORDER BY role',
  );
  console.log(`Tổng user: ${total}`);
  console.log(`Còn tên dạng "Test": ${testNames}`);
  console.log(`Còn email @example.com: ${exampleEmails}`);
  console.log('Phân bố vai trò:', byRole.map((r) => `${r.role}=${r.n}`).join(', '));
} catch (err) {
  console.error('Kiểm tra thất bại:', err.code || '', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
