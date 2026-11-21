// Tạo dữ liệu THỬ NGHIỆM tối thiểu để kiểm thử API: chỉ INSERT, không xóa/sửa dữ liệu có sẵn,
// chạy lại nhiều lần vẫn an toàn (bản ghi đã có thì giữ nguyên).
// Mọi bản ghi đều dễ nhận biết: email thuộc miền "@test.medicare.vn", tên chuyên khoa/phòng
// có hậu tố "(thử nghiệm)". Tên hiển thị vẫn là tên người Việt Nam cho hợp lý.
// Dọn bằng: npm run test:cleanup
// Chạy: npm run seed   (mật khẩu mặc định Test@12345, đổi bằng biến SEED_PASSWORD)
import bcrypt from 'bcryptjs';
import pool, { withTransaction } from '../src/config/db.js';

const PASSWORD = process.env.SEED_PASSWORD || 'Test@12345';
const TEST_DOMAIN = '@test.medicare.vn';

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
      'SELECT id FROM specialty WHERE name = ?', ['Nội tổng quát (thử nghiệm)'],
      'INSERT INTO specialty (name, description) VALUES (?, ?)', ['Nội tổng quát (thử nghiệm)', 'Chuyên khoa dùng cho kiểm thử'],
    );
    const room = await getOrInsert(
      conn,
      'SELECT id FROM room WHERE name = ?', ['Phòng 101 (thử nghiệm)'],
      'INSERT INTO room (name) VALUES (?)', ['Phòng 101 (thử nghiệm)'],
    );
    const room2 = await getOrInsert(
      conn,
      'SELECT id FROM room WHERE name = ?', ['Phòng 102 (thử nghiệm)'],
      'INSERT INTO room (name) VALUES (?)', ['Phòng 102 (thử nghiệm)'],
    );

    const adminEmail = `quan.tri.vien${TEST_DOMAIN}`;
    const adminUser = await ensureUser(conn, {
      email: adminEmail, fullName: 'Quản trị viên Nguyễn Thu Hà', role: 'ADMIN', phone: '0900000001',
    });
    const admin = await getOrInsert(
      conn,
      'SELECT id FROM admin_profile WHERE user_id = ?', [adminUser.id],
      'INSERT INTO admin_profile (user_id, position) VALUES (?, ?)', [adminUser.id, 'Lễ tân'],
    );

    const doctors = [];
    const doctorSpecs = [
      { email: `bs.tran.minh.quan${TEST_DOMAIN}`, fullName: 'BS. Trần Minh Quân', phone: '0900000010' },
      { email: `bs.nguyen.thi.thu.ha${TEST_DOMAIN}`, fullName: 'BS. Nguyễn Thị Thu Hà', phone: '0900000011' },
    ];
    for (const d of doctorSpecs) {
      const u = await ensureUser(conn, {
        email: d.email, fullName: d.fullName, role: 'DOCTOR', phone: d.phone,
      });
      const doc = await getOrInsert(
        conn,
        'SELECT id FROM doctor WHERE user_id = ?', [u.id],
        'INSERT INTO doctor (user_id, specialty_id, experience, degree) VALUES (?, ?, ?, ?)',
        [u.id, spec.id, 5, 'Bác sĩ'],
      );
      doctors.push({ email: d.email, userId: u.id, doctorId: doc.id });
    }

    return {
      specialtyId: spec.id,
      roomIds: [room.id, room2.id],
      admin: { email: adminEmail, userId: adminUser.id, adminId: admin.id },
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
