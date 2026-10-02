const pool = require('../src/config/db');

(async () => {
  try {
    const [r1] = await pool.query('DESCRIBE prescription_detail');
    console.log('prescription_detail columns:', r1.map(c => c.Field));

    const [r2] = await pool.query('DESCRIBE invoice_detail');
    console.log('invoice_detail columns:', r2.map(c => c.Field));

    // Check current data counts
    const queries = [
      'SELECT COUNT(*) as cnt FROM users',
      'SELECT COUNT(*) as cnt FROM specialty',
      'SELECT COUNT(*) as cnt FROM doctor',
      'SELECT COUNT(*) as cnt FROM patient',
      'SELECT COUNT(*) as cnt FROM room',
      'SELECT COUNT(*) as cnt FROM appointment',
      'SELECT COUNT(*) as cnt FROM medical_record',
      'SELECT COUNT(*) as cnt FROM prescription',
      'SELECT COUNT(*) as cnt FROM invoice',
      'SELECT COUNT(*) as cnt FROM wallet',
    ];
    for (const q of queries) {
      const [rows] = await pool.query(q);
      const tbl = q.match(/FROM (\w+)/)[1];
      console.log(`  ${tbl}: ${rows[0].cnt} rows`);
    }
  } catch (e) {
    console.error(e.message);
  }
  process.exit(0);
})();
