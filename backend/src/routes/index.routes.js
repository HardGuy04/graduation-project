// Router tổng — gom các module vào /api/*
import { Router } from 'express';
import pool from '../config/db.js';
import authRoutes from './auth.routes.js';
import specialtyRoutes from './specialty.routes.js';
import doctorRoutes, { publicDoctorRouter } from './doctor.routes.js';
import patientRoutes from './patient.routes.js';
import adminRoutes from './admin.routes.js';
import appointmentRoutes from './appointment.routes.js';
import paymentRoutes from './payment.routes.js';

const router = Router();

router.get('/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ data: { status: 'ok', time: new Date().toISOString() } });
});

// Công khai
router.use('/auth', authRoutes);
router.use('/payments', paymentRoutes);
router.use('/specialties', specialtyRoutes);
router.use('/doctors', publicDoctorRouter);

// Theo vai trò (mỗi router tự gắn authenticate + authorize)
router.use('/doctor', doctorRoutes);
router.use('/patient', patientRoutes);
router.use('/admin', adminRoutes);
router.use('/appointments', appointmentRoutes);

export default router;
