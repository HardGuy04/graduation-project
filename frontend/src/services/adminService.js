import http, { unwrap } from "../api/http";
import {
  toUiDoctor, toUiPatient, toUiAppointment, toUiInvoice, toUiSchedule, toUiLeave, toUiRecord,
  apptStatusToApi, clinicIso, dowToApi,
} from "../api/adapters";

const lastMonths = (n) => {
  const out = [];
  const d = new Date();
  d.setUTCDate(1);
  for (let i = 0; i < n; i++) {
    out.unshift(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    d.setUTCMonth(d.getUTCMonth() - 1);
  }
  return out;
};

export const adminService = {
  async getDoctors(filters = {}) {
    const res = unwrap(await http.get("/admin/doctors", { params: { ...filters, limit: 100 } }));
    return { success: true, data: res.data.map(toUiDoctor) };
  },
  async getDoctorDetail(id) {
    const res = unwrap(await http.get(`/admin/doctors/${id}`));
    const sch = unwrap(await http.get(`/admin/doctors/${id}/schedules`));
    return { success: true, data: { ...toUiDoctor(res.data), schedules: sch.data.map(toUiSchedule) } };
  },
  async createDoctor(payload) {
    const res = unwrap(await http.post("/admin/users", {
      role: "DOCTOR",
      email: payload.email,
      fullName: payload.fullName,
      phone: payload.phone,
      password: payload.password || "Test@12345",
      specialtyId: payload.specialtyId,
      experience: payload.experienceYears ?? payload.experience,
      degree: payload.degree,
    }));
    return { success: true, data: toUiDoctor({ ...res.data.doctor, email: res.data.email, fullName: res.data.fullName, status: res.data.status, userId: res.data.id }) };
  },
  async updateDoctor(id, payload) {
    const res = unwrap(await http.patch(`/admin/doctors/${id}`, {
      fullName: payload.fullName,
      phone: payload.phone,
      specialtyId: payload.specialtyId,
      experience: payload.experienceYears ?? payload.experience,
      degree: payload.degree,
    }));
    return { success: true, data: toUiDoctor(res.data) };
  },
  async toggleDoctorStatus(id) {
    const d = unwrap(await http.get(`/admin/doctors/${id}`));
    const next = d.data.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    await http.patch(`/admin/users/${d.data.userId}/status`, { status: next });
    const again = unwrap(await http.get(`/admin/doctors/${id}`));
    return { success: true, data: toUiDoctor(again.data) };
  },
  async deleteDoctor(id) {
    const d = unwrap(await http.get(`/admin/doctors/${id}`));
    await http.patch(`/admin/users/${d.data.userId}/status`, { status: "DISABLED" });
    return { success: true, data: null };
  },

  async getSchedules() {
    const docs = unwrap(await http.get("/admin/doctors", { params: { limit: 100 } }));
    const lists = await Promise.all(docs.data.map((d) => http.get(`/admin/doctors/${d.id}/schedules`)));
    const rows = lists.flatMap((r, i) => (r.data.data || []).map((s) => ({ ...toUiSchedule(s), doctorName: docs.data[i].fullName })));
    return { success: true, data: rows };
  },
  async getSchedulesByDoctor(doctorId) {
    const res = unwrap(await http.get(`/admin/doctors/${doctorId}/schedules`));
    return { success: true, data: res.data.map(toUiSchedule) };
  },
  async createSchedule(payload) {
    const res = unwrap(await http.post(`/admin/doctors/${payload.doctorId}/schedules`, {
      dayOfWeek: dowToApi(payload.dayOfWeek),
      startTime: payload.startTime,
      endTime: payload.endTime,
      slotDuration: payload.slotDuration || 30,
      maxPatient: payload.maxPatients ?? payload.maxPatient ?? 20,
    }));
    return { success: true, data: toUiSchedule(res.data) };
  },
  async updateSchedule(id, payload) {
    const doctorId = payload.doctorId;
    const res = unwrap(await http.patch(`/admin/doctors/${doctorId}/schedules/${id}`, {
      dayOfWeek: payload.dayOfWeek != null ? dowToApi(payload.dayOfWeek) : undefined,
      startTime: payload.startTime,
      endTime: payload.endTime,
      slotDuration: payload.slotDuration,
      maxPatient: payload.maxPatients ?? payload.maxPatient,
      status: payload.status,
    }));
    return { success: true, data: toUiSchedule(res.data) };
  },
  async deleteSchedule(id, payload = {}) {
    await http.delete(`/admin/doctors/${payload.doctorId}/schedules/${id}`);
    return { success: true, data: null };
  },

  async getSalaryStats() {
    const months = lastMonths(6);
    const pages = await Promise.all(months.map((m) => http.get("/admin/incomes", { params: { month: m, limit: 100 } })));
    const byDoctor = new Map();
    months.forEach((month, i) => {
      for (const row of pages[i].data.data || []) {
        if (!byDoctor.has(row.doctorId)) {
          byDoctor.set(row.doctorId, { doctorId: row.doctorId, doctorName: row.fullName, monthly: [] });
        }
        const salary = Number(row.salary ?? 0);
        const received = Number(row.received ?? 0);
        byDoctor.get(row.doctorId).monthly.push({
          month,
          baseSalary: salary,
          bonus: 0,
          dayon: row.dayOn ?? 0,
          dayoff: row.dayOff ?? 0,
          received,
        });
      }
    });
    return { success: true, data: [...byDoctor.values()] };
  },

  async getLeaves(filters = {}) {
    const res = unwrap(await http.get("/admin/leaves", { params: { ...filters, limit: 100 } }));
    return { success: true, data: res.data.map(toUiLeave) };
  },
  async createLeave(payload) {
    const res = unwrap(await http.post(`/admin/doctors/${payload.doctorId}/leaves`, {
      leaveDate: payload.date || payload.leaveDate,
      reason: payload.reason,
    }));
    return { success: true, data: toUiLeave(res.data) };
  },
  async deleteLeave(id, payload = {}) {
    await http.delete(`/admin/doctors/${payload.doctorId}/leaves/${id}`);
    return { success: true, data: null };
  },

  async getAppointments(filters = {}) {
    const res = unwrap(await http.get("/appointments", {
      params: {
        status: apptStatusToApi(filters.status),
        doctorId: filters.doctorId,
        date: filters.date,
        q: filters.q,
        limit: 100,
        sort: "desc",
      },
    }));
    return { success: true, data: res.data.map(toUiAppointment) };
  },
  async createAppointment(payload) {
    const date = payload.date || payload.appointmentDate;
    const res = unwrap(await http.post("/appointments", {
      patientId: payload.patientId,
      doctorId: payload.doctorId,
      roomId: payload.roomId || undefined,
      startAt: clinicIso(date, payload.startTime),
      endAt: payload.endTime ? clinicIso(date, payload.endTime) : undefined,
      reason: payload.reason,
    }));
    return { success: true, data: toUiAppointment(res.data) };
  },
  async confirmAppointment(id) {
    const res = unwrap(await http.patch(`/appointments/${id}/confirm`));
    return { success: true, data: toUiAppointment(res.data) };
  },
  async rejectAppointment(id) {
    const res = unwrap(await http.patch(`/appointments/${id}/cancel`, { reason: "Từ chối bởi lễ tân" }));
    return { success: true, data: toUiAppointment(res.data) };
  },
  async cancelAppointment(id) {
    const res = unwrap(await http.patch(`/appointments/${id}/cancel`));
    return { success: true, data: toUiAppointment(res.data) };
  },
  async updateAppointment(id, payload) {
    if (payload.roomId !== undefined || payload.roomId === null) {
      const res = unwrap(await http.patch(`/appointments/${id}/room`, { roomId: payload.roomId ?? null }));
      return { success: true, data: toUiAppointment(res.data) };
    }
    return this.getAppointments().then((r) => ({ success: true, data: r.data.find((a) => a.id === Number(id)) }));
  },

  async getPatients(filters = {}) {
    const res = unwrap(await http.get("/admin/patients", { params: { ...filters, limit: 100 } }));
    return { success: true, data: res.data.map(toUiPatient) };
  },
  async getPatientDetail(id) {
    const p = unwrap(await http.get(`/admin/patients/${id}`));
    const apps = unwrap(await http.get("/appointments", { params: { patientId: id, limit: 100 } }));
    return {
      success: true,
      data: {
        ...toUiPatient(p.data),
        history: apps.data.map(toUiAppointment),
        records: [],
      },
    };
  },
  async togglePatientStatus(id) {
    const p = unwrap(await http.get(`/admin/patients/${id}`));
    const next = p.data.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    await http.patch(`/admin/users/${p.data.userId}/status`, { status: next });
    const again = unwrap(await http.get(`/admin/patients/${id}`));
    return { success: true, data: toUiPatient(again.data) };
  },

  async getInvoices(filters = {}) {
    const status = filters.status ? String(filters.status).toUpperCase() : undefined;
    const res = unwrap(await http.get("/admin/invoices", { params: { paymentStatus: status, limit: 100 } }));
    return { success: true, data: res.data.map(toUiInvoice) };
  },
  async getInvoiceDetail(id) {
    const res = unwrap(await http.get(`/admin/invoices/${id}`));
    return { success: true, data: toUiInvoice(res.data) };
  },
  async createInvoice(payload) {
    const res = unwrap(await http.post("/admin/invoices", {
      appointmentId: payload.appointmentId,
      items: payload.items,
    }));
    return { success: true, data: toUiInvoice(res.data) };
  },
  async confirmPayment(id) {
    const res = unwrap(await http.patch(`/admin/invoices/${id}/pay`, { method: "CASH" }));
    return { success: true, data: toUiInvoice(res.data) };
  },

  async getStatsOverview() {
    const res = unwrap(await http.get("/admin/stats/overview"));
    const d = res.data;
    return {
      success: true,
      data: {
        totalVisitsToday: d.today?.total ?? 0,
        totalPatients: d.patients,
        totalDoctors: d.activeDoctors,
        revenue: Number(d.revenueThisMonth || 0),
        pendingCount: d.pendingUpcoming ?? 0,
        unpaidCount: d.unpaidInvoices ?? 0,
      },
    };
  },
  async getStatsAppointments() {
    const res = unwrap(await http.get("/admin/stats/visits", { params: { groupBy: "day" } }));
    return {
      success: true,
      data: (res.data.rows || []).map((r) => ({
        date: r.period, total: r.total, completed: r.done, cancelled: r.cancelled,
      })),
    };
  },
  async getStatsRevenue() {
    const res = unwrap(await http.get("/admin/stats/revenue", { params: { groupBy: "day" } }));
    return {
      success: true,
      data: (res.data.rows || []).map((r) => ({ date: r.period, revenue: Number(r.amount) })),
    };
  },
  async getStatsByDoctor() {
    const res = unwrap(await http.get("/admin/stats/by-doctor"));
    return {
      success: true,
      data: (res.data.rows || []).map((r) => ({
        doctorId: r.doctorId, doctorName: r.fullName, specialtyName: r.specialtyName,
        totalAppointments: r.total, completed: r.done,
      })),
    };
  },

  async getRooms() {
    const res = unwrap(await http.get("/admin/rooms", { params: { limit: 100 } }));
    return {
      success: true,
      data: res.data.map((r) => ({ ...r, status: String(r.status || "").toLowerCase() === "available" ? "available" : String(r.status || "").toLowerCase() })),
    };
  },
  async getAvailableRooms(date, startTime) {
    if (!date || !startTime) return { success: true, data: [] };
    const startAt = clinicIso(date, startTime);
    const [h, m] = startTime.split(":").map(Number);
    const endM = h * 60 + m + 30;
    const endTime = `${String(Math.floor(endM / 60)).padStart(2, "0")}:${String(endM % 60).padStart(2, "0")}`;
    const res = unwrap(await http.get("/admin/rooms/available", { params: { startAt, endAt: clinicIso(date, endTime) } }));
    return { success: true, data: res.data };
  },
};
