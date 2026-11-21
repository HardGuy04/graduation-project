// Đổi tên + email cho toàn bộ tài khoản thử nghiệm do test tạo ra, sang tên người Việt Nam.
//
// Bối cảnh: các lần chạy `npm test` tạo ra user với tên dạng "Test appt-a", "TEST Bác sĩ Một"
// và email "test-xxxx@example.com" → hiển thị rác trên giao diện Admin (Bác sĩ / Bệnh nhân)
// và lọt cả vào danh sách chuyên khoa mà chatbot trả lời.
//
// Cách làm: tài khoản thử nghiệm được đổi sang miền riêng "@test.medicare.vn" (tài khoản
// thật dùng "@medicare.vn" / "@gmail.com"), còn full_name đặt đúng tên người Việt Nam.
// Nhờ vậy tests/cleanup.js vẫn nhận diện và dọn được, nhưng giao diện hiển thị sạch.
//
// Script này idempotent: chạy lại nhiều lần vẫn an toàn.
// Chạy: node database/rename-test-users.js
import pool, { withTransaction } from '../src/config/db.js';

const TEST_DOMAIN = '@test.medicare.vn';

// ── Kho tên người Việt Nam ───────────────────────────────────────────────────
const DOCTOR_NAMES = [
  'BS. Trần Minh Quân',
  'BS. Nguyễn Thị Thu Hà',
  'BS. Lê Văn Kiên',
  'BS. Phạm Quốc Bảo',
  'BS. Hoàng Thị Lan',
  'BS. Đỗ Đức Thắng',
  'BS. Vũ Ngọc Hân',
  'BS. Bùi Thanh Sơn',
  'BS. Đặng Hữu Phước',
  'BS. Ngô Thị Mai',
  'BS. Trịnh Quốc Việt',
  'BS. Lý Thanh Hà',
  'BS. Chu Văn Đạt',
  'BS. Mai Trung Kiên',
];

const PATIENT_NAMES = [
  'Lê Minh Thư',
  'Trần Ngọc Ánh',
  'Phạm Quang Huy',
  'Hoàng Thị Mai',
  'Vũ Đức Thắng',
  'Nguyễn Thị Hồng',
  'Đặng Xuân Bình',
  'Bùi Trung Kiên',
  'Trịnh Thị Lan',
  'Lê Hoàng Long',
  'Phan Thị Ngọc',
  'Võ Thành Long',
  'Ngô Minh Tuấn',
  'Đỗ Thị Hồng Nhung',
  'Trương Văn Kiên',
  'Lương Thị Hạnh',
  'Nguyễn Văn Hùng',
  'Phạm Thị Mai',
  'Hoàng Anh Tuấn',
  'Đặng Thị Thu',
  'Bùi Văn Nam',
  'Trần Thị Hồng',
  'Lê Tuấn Kiệt',
  'Vũ Thị Lan',
  'Ngô Thanh Hà',
  'Phan Quốc Bình',
  'Đỗ Thị Trang',
  'Hoàng Văn Thành',
  'Nguyễn Thị Yến',
  'Trịnh Đức Anh',
  'Lương Văn Hùng',
  'Đặng Văn Khoa',
  'Trần Ngọc Yến',
  'Cao Thị Hồng Vân',
  'Dương Anh Tuấn',
  'Hà Thị Bích Ngọc',
  'Lục Văn Hiếu',
  'Mai Quốc Bảo',
  'Nghiêm Thị Thanh',
];

const ADMIN_NAMES = ['Quản trị viên Nguyễn Thu Hà', 'Quản trị viên Trần Quốc Bảo'];

// Tên chuyên khoa / phòng thử nghiệm — đổi sang tiếng Việt, giữ hậu tố để cleanup nhận diện.
const SPECIALTY_RENAMES = [
  ['TEST-Nội tổng quát', 'Nội tổng quát (thử nghiệm)'],
  ['TEST-Phòng 101', 'Phòng 101 (thử nghiệm)'],
  ['TEST-Phòng 102', 'Phòng 102 (thử nghiệm)'],
];

const isTestUser = (row) =>
  row.email.startsWith('test-') && row.email.endsWith('@example.com');

/** Chuyển "Lê Minh Thư" → "le.minh.thu" (bỏ dấu, không dấu, chấm phân cách họ tên). */
function toSlug(fullName) {
  const cleaned = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9\s.]/g, ' ')
    .trim()
    .replace(/\s+/g, '.')
    .toLowerCase();
  return cleaned.replace(/\.+/g, '.');
}

try {
  const result = await withTransaction(async (conn) => {
    const [users] = await conn.query(
      `SELECT id, username, email, full_name, role
         FROM users
        WHERE email LIKE 'test-%@example.com'
           OR email LIKE 'probe-%@example.com'
           OR email LIKE '%${TEST_DOMAIN}'`,
    );

    const counters = { ADMIN: 0, DOCTOR: 0, PATIENT: 0 };
    const usedEmails = new Set();
    const usedNames = new Set();
    const updates = [];

    // Email đã tồn tại trong DB (trừ chính các user test đang xử lý) để tránh trùng UNIQUE
    const [existing] = await conn.query('SELECT email FROM users');
    for (const r of existing) {
      if (!isTestUser(r) && !r.email.endsWith(TEST_DOMAIN)) usedEmails.add(r.email);
    }

    for (const u of users) {
      const pool_ = u.role === 'ADMIN' ? ADMIN_NAMES
        : u.role === 'DOCTOR' ? DOCTOR_NAMES : PATIENT_NAMES;

      let fullName = null;
      for (let i = counters[u.role]; i < pool_.length; i += 1) {
        if (!usedNames.has(pool_[i])) { fullName = pool_[i]; break; }
      }
      if (!fullName) {
        // Hết tên trong kho → ghép thêm hậu tố số để không trùng
        fullName = `${pool_[0]} ${counters[u.role] + 1}`;
      }
      usedNames.add(fullName);
      counters[u.role] += 1;

      let slug = toSlug(fullName);
      let email = `${slug}${TEST_DOMAIN}`;
      let n = 2;
      while (usedEmails.has(email)) {
        email = `${slug}${n}${TEST_DOMAIN}`;
        n += 1;
      }
      usedEmails.add(email);

      updates.push({ id: u.id, fullName, email });
    }

    // Ghi tên + email mới
    for (const up of updates) {
      await conn.query(
        'UPDATE users SET username = ?, email = ?, full_name = ? WHERE id = ?',
        [up.email, up.email, up.fullName, up.id],
      );
    }

    // Chuẩn hoá học vị / chức danh cho hồ sơ bác sĩ & quản trị viên
    await conn.query(
      `UPDATE doctor d JOIN users u ON u.id = d.user_id
          SET d.degree = COALESCE(NULLIF(d.degree, ''), 'Bác sĩ')
        WHERE u.email LIKE '%${TEST_DOMAIN}'`,
    );
    await conn.query(
      `UPDATE admin_profile a JOIN users u ON u.id = a.user_id
          SET a.position = 'Lễ tân'
        WHERE u.email LIKE '%${TEST_DOMAIN}'`,
    );

    // Đổi tên chuyên khoa / phòng thử nghiệm
    const renamedSpec = [];
    const renamedRoom = [];
    for (const [from, to] of SPECIALTY_RENAMES) {
      const [r] = await conn.query('UPDATE specialty SET name = ? WHERE name = ?', [to, from]);
      if (r.affectedRows) renamedSpec.push(`${from} → ${to}`);
      const [r2] = await conn.query('UPDATE room SET name = ? WHERE name = ?', [to, from]);
      if (r2.affectedRows) renamedRoom.push(`${from} → ${to}`);
    }
    // Chuyên khoa/phòng do test sinh ra có hậu tố ngẫu nhiên: "TEST-Khoa-mwpwerew" → "Chuyên khoa thử nghiệm (mwpwerew)"
    const [randSpec] = await conn.query(
      `SELECT id, name FROM specialty WHERE name LIKE 'TEST-%'`,
    );
    for (const s of randSpec) {
      const suffix = s.name.replace(/^TEST-(Khoa|Stats)-/, '');
      const label = s.name.includes('Stats') ? 'Chuyên khoa thống kê thử nghiệm' : 'Chuyên khoa thử nghiệm';
      await conn.query('UPDATE specialty SET name = ? WHERE id = ?', [`${label} (${suffix})`, s.id]);
      renamedSpec.push(`${s.name} → ${label} (${suffix})`);
    }
    const [randRoom] = await conn.query(`SELECT id, name FROM room WHERE name LIKE 'TEST-%'`);
    for (const r of randRoom) {
      const suffix = r.name.replace(/^TEST-(Phòng|Room)-/, '');
      await conn.query('UPDATE room SET name = ? WHERE id = ?', [`Phòng thử nghiệm (${suffix})`, r.id]);
      renamedRoom.push(`${r.name} → Phòng thử nghiệm (${suffix})`);
    }

    return { users: updates, renamedSpec, renamedRoom };
  });

  console.log(`Đã đổi ${result.users.length} tài khoản thử nghiệm:`);
  for (const u of result.users) {
    console.log(`  #${u.id}  ${u.fullName}  <${u.email}>`);
  }
  if (result.renamedSpec.length) {
    console.log('Chuyên khoa:');
    for (const s of result.renamedSpec) console.log(`  ${s}`);
  }
  if (result.renamedRoom.length) {
    console.log('Phòng:');
    for (const s of result.renamedRoom) console.log(`  ${s}`);
  }
} catch (err) {
  console.error('Đổi tên thất bại:', err.code || '', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
