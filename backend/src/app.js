import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import env from './config/env.js';
import pool from './config/db.js';
import apiRoutes from './routes/index.routes.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

app.use(helmet());

// Xác thực bằng header Bearer (không cookie) nên không cần credentials.
// Dev: Vite hay nhảy sang 5174, 5175 khi 5173 đang bận — cho mọi cổng localhost.
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.CORS_ORIGIN.includes(origin)) return callback(null, true);
    if (env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
}));

// Chỉ log method/URL/status/thời gian — không log body vì có thể chứa mật khẩu hoặc dữ liệu bệnh án
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.use(express.json({ limit: '100kb' }));

app.get('/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ data: { status: 'ok' } });
});

app.use('/api', apiRoutes);

// Express 5 không khớp app.get('/') — GET / rơi vào đây cùng các đường dẫn lạ
app.use((req, res) => {
  if (req.method === 'GET' && (req.path === '/' || req.url === '/' || req.originalUrl === '/')) {
    return res.json({
      data: {
        name: 'MediCare Hub API',
        status: 'ok',
        health: '/health',
        api: '/api',
      },
    });
  }
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint không tồn tại' } });
});

app.use(errorHandler);

export default app;
