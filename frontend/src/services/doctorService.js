import {
  apiGetDoctorAppointments, apiGetAppointmentDetail, apiUpdateAppointmentStatus,
  apiGetPatientRecords, apiCreateMedicalRecord, apiUpdateMedicalRecord,
  apiCreatePrescription, apiGetDoctorSchedule, apiGetDoctorLeaves,
} from "../mock/mockApi";

export const doctorService = {
  getMyAppointments: (doctorId, filters) => apiGetDoctorAppointments(doctorId, filters),
  getAppointmentDetail: (id) => apiGetAppointmentDetail(id),
  updateAppointmentStatus: (id, status) => apiUpdateAppointmentStatus(id, status),
  getPatientRecords: (patientId) => apiGetPatientRecords(patientId),
  createMedicalRecord: (doctorId, payload) => apiCreateMedicalRecord(doctorId, payload),
  updateMedicalRecord: (id, payload) => apiUpdateMedicalRecord(id, payload),
  createPrescription: (payload) => apiCreatePrescription(payload),
  getMySchedule: (doctorId) => apiGetDoctorSchedule(doctorId),
  getMyLeaves: (doctorId) => apiGetDoctorLeaves(doctorId),
};
