import { Router } from 'express';
import { createAppointment } from '../controllers/appointment.controller.js';

const router = Router();

// POST /api/appointments — đặt lịch khám
router.post('/', createAppointment);

export default router;
