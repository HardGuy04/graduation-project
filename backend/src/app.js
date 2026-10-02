import express from 'express';
import helmet  from 'helmet';
import cors    from 'cors';
import morgan  from 'morgan';

import pool              from './config/db.js';
import appointmentRoutes from './routes/appointment.routes.js';
import errorHandler      from './middlewares/errorHandler.js';

const app = express();

// ── Bảo mật ──────────────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS — hỗ trợ nhiều origin phân tách bằng dấu phẩy ─────────────────────
const origins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:5173'];
app.use(cors({ origin: origins, credentials: true }));

// ── Logging ──────────────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body parser ──────────────────────────────────────────────────────────────
app.use(express.json());

// ── Health check — xác nhận server + DB hoạt động ────────────────────────────
app.get('/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/appointments', appointmentRoutes);

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint không tồn tại' } });
});

// ── Error handler (phải đặt cuối cùng) ───────────────────────────────────────
app.use(errorHandler);

export default app;
