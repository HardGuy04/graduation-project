import {
  apiGetProfile, apiUpdateProfile, apiGetDoctorSlots, apiCreateAppointment,
  apiGetPatientAppointments, apiGetAppointmentDetail, apiCancelAppointment,
  apiGetPatientRecords, apiGetRecordDetail, apiGetPatientInvoices, apiPayInvoice,
  apiGetWalletBalance, apiLoadBalance,
  apiGetNotifications, apiMarkNotificationRead, apiMarkAllNotificationsRead,
} from "../mock/mockApi";

export const patientService = {
  getProfile: (userId) => apiGetProfile(userId),
  updateProfile: (userId, payload) => apiUpdateProfile(userId, payload),
  getDoctorSlots: (doctorId, date) => apiGetDoctorSlots(doctorId, date),
  bookAppointment: (patientId, payload) => apiCreateAppointment(patientId, payload),
  getMyAppointments: (patientId, filters) => apiGetPatientAppointments(patientId, filters),
  getAppointmentDetail: (id) => apiGetAppointmentDetail(id),
  cancelAppointment: (id) => apiCancelAppointment(id, "patient"),
  getMedicalRecords: (patientId) => apiGetPatientRecords(patientId),
  getRecordDetail: (id) => apiGetRecordDetail(id),
  getInvoices: (patientId) => apiGetPatientInvoices(patientId),
  payInvoice: (id, amount, patientId) => apiPayInvoice(id, amount, patientId),
  getWalletBalance: (patientId) => apiGetWalletBalance(patientId), // GET /patient/wallet/balance
  loadBalance: (patientId, amount) => apiLoadBalance(patientId, amount), // POST /patient/wallet/loadbalance

  // Thông báo — chỉ dành cho vai trò Bệnh nhân
  getNotifications: (patientId) => apiGetNotifications(patientId), // GET /patient/notifications
  markNotificationRead: (id) => apiMarkNotificationRead(id), // PATCH /patient/notifications/:id/read
  markAllNotificationsRead: (patientId) => apiMarkAllNotificationsRead(patientId), // PATCH /patient/notifications/read-all
};
