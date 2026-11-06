// Đối chiếu database/schema.sql với database thật — CHỈ ĐỌC metadata (SHOW CREATE TABLE),
// không đọc dữ liệu bảng. Chạy: npm run db:check (từ thư mục backend).
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../src/config/db.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] ? path.resolve(process.argv[2]) : path.join(dir, 'schema.sql');
const sql = fs.readFileSync(file, 'utf8');

// AUTO_INCREMENT=n thay đổi theo dữ liệu nên không tính là khác biệt cấu trúc
const normalize = (s) => s
  .replace(/\s+AUTO_INCREMENT=\d+/g, '')
  .split('\n').map((l) => l.trim()).filter(Boolean).join('\n')
  .replace(/;\s*$/, '');

const fileTables = new Map();
const order = [];
for (const m of sql.matchAll(/CREATE TABLE `?(\w+)`?\s*\([\s\S]*?\)\s*ENGINE=[^;]*;/g)) {
  fileTables.set(m[1], normalize(m[0]));
  order.push(m[1]);
}

let problems = 0;
const report = (msg) => { problems += 1; console.log('  ✗', msg); };

try {
  const [rows] = await pool.query(
    "SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
  );
  const dbTables = rows.map((r) => r.t);

  console.log(`Bảng trong DB: ${dbTables.length} | trong schema.sql: ${fileTables.size}`);
  for (const t of dbTables) if (!fileTables.has(t)) report(`${t}: có trong DB, thiếu trong schema.sql`);
  for (const t of fileTables.keys()) if (!dbTables.includes(t)) report(`${t}: có trong schema.sql, không có trong DB`);

  for (const t of dbTables.filter((x) => fileTables.has(x))) {
    const [[row]] = await pool.query('SHOW CREATE TABLE ??', [t]);
    const live = normalize(row['Create Table']).split('\n');
    const file = fileTables.get(t).split('\n');
    const missing = live.filter((l) => !file.includes(l));
    const extra = file.filter((l) => !live.includes(l));
    if (missing.length || extra.length) {
      report(`${t}: khác biệt`);
      missing.forEach((l) => console.log('      DB có, file thiếu :', l));
      extra.forEach((l) => console.log('      file có, DB không :', l));
    } else {
      console.log('  ✓', t);
    }
  }

  // Bảng cha phải đứng trước bảng con để file chạy được từ đầu đến cuối
  for (const [t, ddl] of fileTables) {
    for (const ref of ddl.matchAll(/REFERENCES `(\w+)`/g)) {
      if (ref[1] !== t && order.indexOf(ref[1]) > order.indexOf(t)) {
        report(`${t} tham chiếu ${ref[1]} nhưng ${ref[1]} được định nghĩa sau`);
      }
    }
  }

  console.log(problems ? `\nCòn ${problems} khác biệt.` : '\nKhông còn khác biệt: schema.sql khớp database thật.');
} finally {
  await pool.end();
}
process.exitCode = problems ? 1 : 0;
