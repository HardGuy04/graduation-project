import 'dotenv/config'; // phải đứng đầu để biến môi trường sẵn sàng trước khi db.js chạy
import express from 'express';
import { pool } from './db.js';
import { bookAppointment, AppError } from './bookings.js';

const app = express();
app.use(express.json());

app.get('/health', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
});

app.post('/appointments', async (req, res, next) => {
  try {
    const { patientId, doctorId, roomId, startAt, endAt, reason } = req.body ?? {};
    const appointment = await bookAppointment({
      patientId,
      doctorId,
      roomId: roomId ?? null,
      startAt,
      endAt,
      reason: reason ?? null,
    });
    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
});

// Xử lý lỗi tập trung
app.use((err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Lỗi hệ thống' } });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Clinic API chạy tại http://localhost:${port}`));