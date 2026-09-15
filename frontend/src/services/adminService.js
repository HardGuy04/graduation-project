import {
  apiAdminGetDoctors, apiAdminGetDoctorDetail, apiAdminCreateDoctor, apiAdminUpdateDoctor,
  apiAdminToggleDoctorStatus, apiAdminDeleteDoctor,
  apiAdminGetSchedules, apiAdminGetSchedulesByDoctor, apiAdminCreateSchedule,
  apiAdminUpdateSchedule, apiAdminDeleteSchedule, apiAdminGetSalaryStats,
  apiAdminGetLeaves, apiAdminCreateLeave, apiAdminDeleteLeave,
  apiAdminGetAppointments, apiAdminCreateAppointment, apiAdminUpdateAppointmentStatus,
  apiAdminUpdateAppointment,
  apiAdminGetPatients, apiAdminGetPatientDetail, apiAdminTogglePatientStatus,
  apiAdminGetInvoices, apiAdminGetInvoiceDetail, apiAdminCreateInvoice, apiAdminConfirmPayment,
  apiAdminStatsOverview, apiAdminStatsAppointments, apiAdminStatsRevenue, apiAdminStatsByDoctor,
  apiAdminGetRooms, apiAdminGetAvailableRooms,
} from "../mock/mockApi";

export const adminService = {
  // doctors
  getDoctors: (filters) => apiAdminGetDoctors(filters),
  getDoctorDetail: (id) => apiAdminGetDoctorDetail(id),
  createDoctor: (payload) => apiAdminCreateDoctor(payload),
  updateDoctor: (id, payload) => apiAdminUpdateDoctor(id, payload),
  toggleDoctorStatus: (id) => apiAdminToggleDoctorStatus(id),
  deleteDoctor: (id) => apiAdminDeleteDoctor(id),
  // schedules
  getSchedules: () => apiAdminGetSchedules(),
  getSchedulesByDoctor: (doctorId) => apiAdminGetSchedulesByDoctor(doctorId),
  createSchedule: (payload) => apiAdminCreateSchedule(payload),
  updateSchedule: (id, payload) => apiAdminUpdateSchedule(id, payload),
  deleteSchedule: (id) => apiAdminDeleteSchedule(id),
  getSalaryStats: () => apiAdminGetSalaryStats(),
  // leaves
  getLeaves: (filters) => apiAdminGetLeaves(filters),
  createLeave: (payload) => apiAdminCreateLeave(payload),
  deleteLeave: (id) => apiAdminDeleteLeave(id),
  // appointments
  getAppointments: (filters) => apiAdminGetAppointments(filters),
  createAppointment: (payload) => apiAdminCreateAppointment(payload),
  confirmAppointment: (id) => apiAdminUpdateAppointmentStatus(id, "confirm"),
  rejectAppointment: (id) => apiAdminUpdateAppointmentStatus(id, "reject"),
  cancelAppointment: (id) => apiAdminUpdateAppointmentStatus(id, "cancel"),
  updateAppointment: (id, payload) => apiAdminUpdateAppointment(id, payload),
  // patients
  getPatients: (filters) => apiAdminGetPatients(filters),
  getPatientDetail: (id) => apiAdminGetPatientDetail(id),
  togglePatientStatus: (id) => apiAdminTogglePatientStatus(id),
  // invoices
  getInvoices: (filters) => apiAdminGetInvoices(filters),
  getInvoiceDetail: (id) => apiAdminGetInvoiceDetail(id),
  createInvoice: (payload) => apiAdminCreateInvoice(payload),
  confirmPayment: (id) => apiAdminConfirmPayment(id),
  // stats
  getStatsOverview: () => apiAdminStatsOverview(),
  getStatsAppointments: () => apiAdminStatsAppointments(),
  getStatsRevenue: () => apiAdminStatsRevenue(),
  getStatsByDoctor: () => apiAdminStatsByDoctor(),
  // rooms
  getRooms: () => apiAdminGetRooms(),
  getAvailableRooms: (date, startTime) => apiAdminGetAvailableRooms(date, startTime),
};
