// Tạo dữ liệu THỬ NGHIỆM tối thiểu để kiểm thử API: chỉ INSERT, không xóa/sửa dữ liệu có sẵn,
// chạy lại nhiều lần vẫn an toàn (bản ghi đã có thì giữ nguyên).
// Mọi bản ghi đều dễ nhận biết: email test-seed-*@example.com, tên chuyên khoa/phòng bắt đầu bằng "TEST-".
// Dọn bằng: npm run test:cleanup
// Chạy: npm run seed   (mật khẩu mặc định Test@12345, đổi bằng biến SEED_PASSWORD)
import bcrypt from 'bcryptjs';
import pool, { withTransaction } from '../src/config/db.js';

const PASSWORD = process.env.SEED_PASSWORD || 'Test@12345';

async function getOrInsert(conn, selectSql, selectParams, insertSql, insertParams) {
  const [rows] = await conn.query(selectSql, selectParams);
  if (rows.length) return { id: rows[0].id, created: false };
  const [r] = await conn.query(insertSql, insertParams);
  return { id: r.insertId, created: true };
}

async function ensureUser(conn, { email, fullName, role, phone }) {
  const hash = await bcrypt.hash(PASSWORD, 10);
  return getOrInsert(
    conn,
    'SELECT id FROM users WHERE email = ?', [email],
    'INSERT INTO users (username, email, phone, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)',
    [email, email, phone, hash, fullName, role],
  );
}

try {
  const out = await withTransaction(async (conn) => {
    const spec = await getOrInsert(
      conn,
      'SELECT id FROM specialty WHERE name = ?', ['TEST-Nội tổng quát'],
      'INSERT INTO specialty (name, description) VALUES (?, ?)', ['TEST-Nội tổng quát', 'Chuyên khoa dùng cho kiểm thử'],
    );
    const room = await getOrInsert(
      conn,
      'SELECT id FROM room WHERE name = ?', ['TEST-Phòng 101'],
      'INSERT INTO room (name) VALUES (?)', ['TEST-Phòng 101'],
    );
    const room2 = await getOrInsert(
      conn,
      'SELECT id FROM room WHERE name = ?', ['TEST-Phòng 102'],
      'INSERT INTO room (name) VALUES (?)', ['TEST-Phòng 102'],
    );

    const adminUser = await ensureUser(conn, {
      email: 'test-seed-admin@example.com', fullName: 'TEST Quản trị viên', role: 'ADMIN', phone: '0900000001',
    });
    const admin = await getOrInsert(
      conn,
      'SELECT id FROM admin_profile WHERE user_id = ?', [adminUser.id],
      'INSERT INTO admin_profile (user_id, position) VALUES (?, ?)', [adminUser.id, 'Lễ tân (test)'],
    );

    const doctors = [];
    for (const [i, name] of ['TEST Bác sĩ Một', 'TEST Bác sĩ Hai'].entries()) {
      const u = await ensureUser(conn, {
        email: `test-seed-doctor${i + 1}@example.com`, fullName: name, role: 'DOCTOR', phone: `090000001${i}`,
      });
      const d = await getOrInsert(
        conn,
        'SELECT id FROM doctor WHERE user_id = ?', [u.id],
        'INSERT INTO doctor (user_id, specialty_id, experience, degree) VALUES (?, ?, ?, ?)',
        [u.id, spec.id, 5, 'Bác sĩ (test)'],
      );
      doctors.push({ email: `test-seed-doctor${i + 1}@example.com`, userId: u.id, doctorId: d.id });
    }

    return {
      specialtyId: spec.id,
      roomIds: [room.id, room2.id],
      admin: { email: 'test-seed-admin@example.com', userId: adminUser.id, adminId: admin.id },
      doctors,
    };
  });
  console.log('Seed dữ liệu thử nghiệm xong (mật khẩu: SEED_PASSWORD hoặc mặc định Test@12345):');
  console.log(JSON.stringify(out, null, 2));
} catch (err) {
  console.error('Seed thất bại:', err.code || '', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
