// ─────────────────────────────────────────────────────────────────────────────
// Seed runner — chạy bằng: npm run seed
// Đọc seed.sql và thực thi trên MySQL
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load env trước khi import db
require('../src/config/env');
const pool = require('../src/config/db');

async function runSeed() {
  console.log('🌱 Bắt đầu seed dữ liệu...\n');

  try {
    // Hash password "123456"
    const hashedPassword = await bcrypt.hash('123456', 10);
    console.log('🔑 Password hash generated');

    // Đọc file seed.sql
    const seedPath = path.join(__dirname, 'seed.sql');
    let sql = fs.readFileSync(seedPath, 'utf-8');

    // Thay thế placeholder bcrypt hash
    sql = sql.replace(
      /SET @pwd = '[^']*';/,
      `SET @pwd = '${hashedPassword}';`
    );

    const conn = await pool.getConnection();
    try {
      // Tắt foreign key checks tạm thời để seed không bị lỗi thứ tự
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');

      // Xóa dữ liệu cũ (theo thứ tự ngược)
      const tables = [
        'wallet_transaction', 'wallet', 'notification', 'invoice_detail', 'invoice',
        'prescription_detail', 'prescription', 'medical_record', 'appointment',
        'doctor_leave', 'doctor_schedule', 'income', 'refresh_tokens',
        'patient', 'doctor', 'admin_profile', 'room', 'specialty', 'users',
      ];
      for (const t of tables) {
        try {
          await conn.query(`DELETE FROM \`${t}\``);
          await conn.query(`ALTER TABLE \`${t}\` AUTO_INCREMENT = 1`);
        } catch (e) {
          // Bỏ qua nếu bảng chưa tồn tại
        }
      }
      console.log('🗑️  Đã xóa dữ liệu cũ');

      // Tách và thực thi từng statement
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      let success = 0;
      let errors = 0;
      for (const stmt of statements) {
        try {
          await conn.query(stmt);
          success++;
        } catch (err) {
          if (!stmt.includes('USE ') && !stmt.includes('CREATE DATABASE')) {
            errors++;
            console.warn(`⚠️  Lỗi: ${err.message.substring(0, 120)}`);
            // Log statement đầu tiên để debug
            if (errors <= 3) {
              console.warn(`   Statement: ${stmt.substring(0, 80)}...`);
            }
          }
        }
      }

      // Bật lại foreign key checks
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');

      console.log(`\n✅ Seed hoàn tất! (${success} statements thành công, ${errors} lỗi)`);
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('❌ Seed thất bại:', err.message);
  } finally {
    process.exit(0);
  }
}

runSeed();
