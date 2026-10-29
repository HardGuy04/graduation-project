import http, { unwrap } from "../api/http";
import {
  toUiAppointment, toUiRecord, toUiSchedule, toUiLeave, toUiPrescription,
  apptStatusToApi, dowToApi,
} from "../api/adapters";

async function attachRecord(appt) {
  const a = toUiAppointment(appt);
  if (!appt.medicalRecordId) return a;
  try {
    const rec = unwrap(await http.get(`/doctor/medical-records/${appt.medicalRecordId}`));
    a.record = toUiRecord(rec.data);
    a.prescription = rec.data.prescription ? toUiPrescription(rec.data.prescription) : null;
  } catch { /* */ }
  return a;
}

export const doctorService = {
  async getMyAppointments(_doctorId, filters = {}) {
    const res = unwrap(await http.get("/appointments", {
      params: {
        status: apptStatusToApi(filters.status),
        date: filters.date,
        limit: 100,
        sort: "asc",
      },
    }));
    return { success: true, data: res.data.map(toUiAppointment) };
  },

  async getAppointmentDetail(id) {
    const res = unwrap(await http.get(`/appointments/${id}`));
    return { success: true, data: await attachRecord(res.data) };
  },

  async updateAppointmentStatus(id, status) {
    const path = status === "in_progress" || status === "CHECKED_IN"
      ? `/appointments/${id}/check-in`
      : status === "cancelled" || status === "rejected"
        ? `/appointments/${id}/cancel`
        : null;
    if (!path) throw new Error("Bác sĩ không được chuyển trạng thái này");
    const res = unwrap(await http.patch(path));
    return { success: true, data: toUiAppointment(res.data) };
  },

  async getPatientRecords(patientId) {
    const res = unwrap(await http.get(`/doctor/patients/${patientId}/history`, { params: { limit: 100 } }));
    return { success: true, data: res.data.map(toUiRecord) };
  },

  async createMedicalRecord(_doctorId, payload) {
    const res = unwrap(await http.post("/doctor/medical-records", {
      appointmentId: payload.appointmentId,
      symptoms: payload.symptoms,
      diagnosis: payload.diagnosis?.trim() || "Chưa xác định",
      note: payload.notes ?? payload.note,
      followUpDate: payload.followUpDate || undefined,
    }));
    return { success: true, data: toUiRecord(res.data) };
  },

  async updateMedicalRecord(id, payload) {
    const res = unwrap(await http.patch(`/doctor/medical-records/${id}`, {
      symptoms: payload.symptoms,
      diagnosis: payload.diagnosis,
      note: payload.notes ?? payload.note,
      followUpDate: payload.followUpDate,
    }));
    return { success: true, data: toUiRecord(res.data) };
  },

  async createPrescription(payload) {
    const res = unwrap(await http.put(`/doctor/medical-records/${payload.medicalRecordId}/prescription`, {
      note: payload.note,
      items: (payload.details || payload.items || []).map((d) => ({
        medicineName: d.medicineName,
        dosage: d.dosage,
        quantity: d.quantity,
        usageInstruction: d.instruction ?? d.usageInstruction,
      })),
    }));
    return { success: true, data: toUiPrescription(res.data.prescription) };
  },

  async getMySchedule() {
    const res = unwrap(await http.get("/doctor/schedules"));
    return { success: true, data: res.data.map(toUiSchedule) };
  },

  async createSchedule(payload) {
    const res = unwrap(await http.post("/doctor/schedules", scheduleBody(payload)));
    return { success: true, data: toUiSchedule(res.data) };
  },

  async updateSchedule(id, payload) {
    const res = unwrap(await http.patch(`/doctor/schedules/${id}`, scheduleBody(payload)));
    return { success: true, data: toUiSchedule(res.data) };
  },

  async deleteSchedule(id) {
    await http.delete(`/doctor/schedules/${id}`);
    return { success: true, data: null };
  },

  async getMyLeaves() {
    const res = unwrap(await http.get("/doctor/leaves", { params: { limit: 100 } }));
    return { success: true, data: res.data.map(toUiLeave) };
  },

  async createLeave({ date, reason }) {
    const res = unwrap(await http.post("/doctor/leaves", { leaveDate: date, reason }));
    return { success: true, data: toUiLeave(res.data) };
  },

  async deleteLeave(id) {
    await http.delete(`/doctor/leaves/${id}`);
    return { success: true, data: null };
  },
};

function scheduleBody(p) {
  return {
    dayOfWeek: p.dayOfWeek != null ? dowToApi(p.dayOfWeek) : undefined,
    startTime: p.startTime,
    endTime: p.endTime,
    slotDuration: p.slotDuration != null ? Number(p.slotDuration) : undefined,
    maxPatient: p.maxPatients != null ? Number(p.maxPatients) : undefined,
    status: p.status ? String(p.status).toUpperCase() : undefined,
  };
}
