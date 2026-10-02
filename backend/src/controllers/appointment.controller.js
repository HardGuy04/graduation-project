import { bookAppointment } from '../services/appointment.service.js';

/**
 * POST /api/appointments — đặt lịch khám.
 * Express 5 tự bắt rejected promise → chuyển sang errorHandler.
 */
export async function createAppointment(req, res) {
  const { patientId, doctorId, roomId, startAt, endAt, reason } = req.body ?? {};

  const appointment = await bookAppointment({
    patientId,
    doctorId,
    roomId:  roomId ?? null,
    startAt,
    endAt,
    reason:  reason ?? null,
  });

  res.status(201).json(appointment);
}
