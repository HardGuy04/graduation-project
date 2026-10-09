import http, { unwrap } from "../api/http";
import {
  toUiAppointment, toUiRecord, toUiInvoice, toUiNotification,
  apptStatusToApi, clinicIso,
} from "../api/adapters";

async function attachRecord(appt) {
  const a = toUiAppointment(appt);
  if (!appt.medicalRecordId) return a;
  try {
    const rec = unwrap(await http.get(`/patient/medical-records/${appt.medicalRecordId}`));
    a.record = toUiRecord(rec.data);
    a.prescription = rec.data.prescription
      ? { ...rec.data.prescription, details: (rec.data.prescription.items || []).map((it) => ({ ...it, instruction: it.usageInstruction })) }
      : null;
  } catch { /* không có quyền / chưa có bệnh án */ }
  return a;
}

export const patientService = {
  getProfile: () => import("./profileService").then((m) => m.profileService.getProfile()),
  updateProfile: (id, payload) => import("./profileService").then((m) => m.profileService.updateProfile(id, payload)),

  async getDoctorSlots(doctorId, date) {
    const res = unwrap(await http.get(`/doctors/${doctorId}/slots`, { params: { date } }));
    return {
      success: true,
      data: {
        ...res.data,
        availableSlots: (res.data.slots || []).map((s) => ({
          startTime: s.startTime, endTime: s.endTime, startAt: s.startAt, endAt: s.endAt,
        })),
      },
    };
  },

  async bookAppointment(_patientId, payload) {
    const body = {
      doctorId: payload.doctorId,
      startAt: payload.startAt || clinicIso(payload.appointmentDate || payload.date, payload.startTime),
      endAt: payload.endAt || (payload.endTime ? clinicIso(payload.appointmentDate || payload.date, payload.endTime) : undefined),
      reason: payload.reason,
    };
    const res = unwrap(await http.post("/appointments", body));
    return { success: true, data: toUiAppointment(res.data) };
  },

  async getMyAppointments(_patientId, filters = {}) {
    const res = unwrap(await http.get("/appointments", {
      params: { status: apptStatusToApi(filters.status), limit: 100, sort: "desc" },
    }));
    return { success: true, data: res.data.map(toUiAppointment) };
  },

  async getAppointmentDetail(id) {
    const res = unwrap(await http.get(`/appointments/${id}`));
    return { success: true, data: await attachRecord(res.data) };
  },

  async cancelAppointment(id) {
    const res = unwrap(await http.patch(`/appointments/${id}/cancel`));
    return { success: true, data: toUiAppointment(res.data) };
  },

  async getMedicalRecords() {
    const res = unwrap(await http.get("/patient/medical-records", { params: { limit: 100 } }));
    return { success: true, data: res.data.map(toUiRecord) };
  },

  async getRecordDetail(id) {
    const res = unwrap(await http.get(`/patient/medical-records/${id}`));
    return { success: true, data: toUiRecord(res.data) };
  },

  async getInvoices() {
    const res = unwrap(await http.get("/patient/invoices", { params: { limit: 100 } }));
    return { success: true, data: res.data.map(toUiInvoice) };
  },

  async payInvoice(id) {
    const res = unwrap(await http.post(`/patient/invoices/${id}/pay-wallet`));
    return {
      success: true,
      data: {
        invoice: toUiInvoice(res.data.invoice),
        newBalance: Number(res.data.walletBalance),
      },
    };
  },

  async getWalletBalance() {
    const res = unwrap(await http.get("/patient/wallet"));
    return { success: true, data: { balance: Number(res.data.balance) } };
  },

  async loadBalance(_patientId, amount) {
    const res = unwrap(await http.post("/patient/wallet/topup", { amount }));
    return { success: true, data: res.data };
  },

  async getNotifications() {
    const res = unwrap(await http.get("/patient/notifications", { params: { limit: 50 } }));
    return { success: true, data: res.data.map(toUiNotification) };
  },

  async markNotificationRead(id) {
    await http.patch(`/patient/notifications/${id}/read`);
    return { success: true, data: null };
  },

  async markAllNotificationsRead() {
    await http.patch("/patient/notifications/read-all");
    return { success: true, data: null };
  },
};
