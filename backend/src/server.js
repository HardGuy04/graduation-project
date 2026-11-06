// env.js nạp dotenv và kiểm tra cấu hình trước khi bất kỳ module nào dùng tới
import env from './config/env.js';
import app from './app.js';
import pool from './config/db.js';
import { startReminderJob } from './services/notification.service.js';

const server = app.listen(env.PORT, () => {
  console.log(`MediCare Hub API — http://localhost:${env.PORT}`);
  startReminderJob();
});

function shutdown() {
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
