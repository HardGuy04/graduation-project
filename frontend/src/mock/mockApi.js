// ---------------------------------------------------------------------------
// MOCK API LAYER
// ---------------------------------------------------------------------------
// Mô phỏng lại backend Node.js/Express + MySQL được mô tả trong tài liệu
// đồ án (RESTful API, JWT, response envelope {success, message, data}).
// Toàn bộ dữ liệu được giữ trong bộ nhớ (in-memory) trong phiên làm việc,
// cho phép Front-end hoạt động độc lập trong khi chờ tích hợp Back-end thật.
//
// Khi có Back-end thật, chỉ cần thay nội dung các hàm trong `src/services/*`
// bằng lời gọi axios tới `baseURL` thật — các trang UI không cần thay đổi.
// ---------------------------------------------------------------------------
import {
  users, doctors, patients, adminAccount, specialties, rooms,
  doctorSchedules, appointments, medicalRecords, prescriptions, invoices,
  incomes, credentials, doctorLeaves, patientWallets, notifications,
} from "./seedData";

// deep-clone seed vào state có thể chỉnh sửa được trong phiên làm việc
const state = {
  admin: clone(adminAccount),
  users: clone(users),
  doctors: clone(doctors),
  patients: clone(patients),
  specialties: clone(specialties),
  rooms: clone(rooms),
  schedules: clone(doctorSchedules),
  appointments: clone(appointments),
  records: clone(medicalRecords),
  prescriptions: clone(prescriptions),
  invoices: clone(invoices),
  incomes: clone(incomes),
  leaves: clone(doctorLeaves),
  wallets: clone(patientWallets),
  notifications: clone(notifications),
};

let idCounters = {
  doctor: 200,
  schedule: 100,
  appointment: 2000,
  record: 900,
  prescription: 900,
  invoice: 1000,
  leave: 100,
  notification: 100,
};

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

function delay(ms = 380) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ApiError extends Error {
  constructor(message, status = 400, error) {
    super(message);
    this.status = status;
    this.error = error;
  }
}

function ok(data, message = "Thành công") {
  return { success: true, message, data };
}

function findDoctorUser(id) {
  return state.doctors.find((d) => d.id === Number(id));
}
function findPatientUser(id) {
  return state.patients.find((p) => p.id === Number(id));
}
function specialtyName(id) {
  return state.specialties.find((s) => s.id === Number(id))?.name || "—";
}
function findLeave(doctorId, date) {
  return state.leaves.find((l) => l.doctorId === Number(doctorId) && l.date === date);
}
function formatDateVN(isoDate) {
  if (!isoDate) return isoDate;
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}
function roomName(id) {
  return state.rooms.find((r) => r.id === Number(id))?.name || null;
}
// Số ngày công chuẩn / tháng dùng để quy đổi lương theo ngày nghỉ (dayoff)
const STANDARD_WORK_DAYS = 26;

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------
export async function apiLogin({ email, password }) {
  await delay();
  const found = [state.admin, ...state.doctors, ...state.patients].find((u) => u.email === email);
  if (!found || credentials[email] !== password) {
    throw new ApiError("Email hoặc mật khẩu không chính xác", 401);
  }
  if (found.status === "locked") {
    throw new ApiError("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.", 403);
  }
  const token = `mock-token.${found.role}.${found.id}.${Date.now()}`;
  return ok({ token, user: sanitizeUser(found) }, "Đăng nhập thành công");
}

export async function apiRegister(payload) {
  await delay();
  const exists = state.patients.some((p) => p.email === payload.email);
  if (exists) throw new ApiError("Email này đã được đăng ký", 409);
  const id = 300 + state.patients.length + 1;
  const newPatient = {
    id, role: "patient", status: "active",
    fullName: payload.fullName, email: payload.email, phone: payload.phone,
    dateOfBirth: payload.dateOfBirth, gender: payload.gender, address: payload.address,
  };
  state.patients.push(newPatient);
  credentials[payload.email] = payload.password;
  const token = `mock-token.patient.${id}.${Date.now()}`;
  return ok({ token, user: sanitizeUser(newPatient) }, "Đăng ký tài khoản thành công");
}

function sanitizeUser(u) {
  const { ...rest } = u;
  return rest;
}

export async function apiChangePassword({ email, oldPassword, newPassword }) {
  await delay();
  if (credentials[email] !== oldPassword) throw new ApiError("Mật khẩu hiện tại không đúng", 400);
  credentials[email] = newPassword;
  return ok(null, "Đổi mật khẩu thành công");
}

// ---------------------------------------------------------------------------
// COMMON
// ---------------------------------------------------------------------------
export async function apiGetSpecialties() {
  await delay(220);
  const withCount = state.specialties.map((s) => ({
    ...s,
    doctorCount: state.doctors.filter((d) => d.specialtyId === s.id && d.status === "active").length,
  }));
  return ok(withCount);
}

export async function apiGetPublicDoctors({ specialtyId } = {}) {
  await delay(260);
  let list = state.doctors.filter((d) => d.status === "active");
  if (specialtyId) list = list.filter((d) => d.specialtyId === Number(specialtyId));
  return ok(list.map(decorateDoctor));
}

function decorateDoctor(d) {
  const today = new Date().toISOString().slice(0, 10);
  return { ...d, specialtyName: specialtyName(d.specialtyId), onLeaveToday: !!findLeave(d.id, today) };
}

// ---------------------------------------------------------------------------
// PATIENT-FACING
// ---------------------------------------------------------------------------
export async function apiGetDoctorSlots(doctorId, date) {
  await delay(300);
  const leave = findLeave(doctorId, date);
  if (leave) {
    return ok({ doctorId: Number(doctorId), date, availableSlots: [], onLeave: true, leaveReason: leave.reason });
  }
  const d = new Date(date);
  const dow = d.getDay();
  const schedule = state.schedules.find((s) => s.doctorId === Number(doctorId) && s.dayOfWeek === dow);
  if (!schedule) return ok({ doctorId: Number(doctorId), date, availableSlots: [] });

  const slots = [];
  let [h, m] = schedule.startTime.split(":").map(Number);
  const [endH, endM] = schedule.endTime.split(":").map(Number);
  const cur = new Date(2000, 0, 1, h, m);
  const end = new Date(2000, 0, 1, endH, endM);
  while (cur < end) {
    const start = `${String(cur.getHours()).padStart(2, "0")}:${String(cur.getMinutes()).padStart(2, "0")}`;
    cur.setMinutes(cur.getMinutes() + schedule.slotDuration);
    const stop = `${String(cur.getHours()).padStart(2, "0")}:${String(cur.getMinutes()).padStart(2, "0")}`;
    const taken = state.appointments.some((a) =>
      a.doctorId === Number(doctorId) && a.date === date && a.startTime === start && a.status !== "cancelled" && a.status !== "rejected"
    );
    if (!taken) slots.push({ startTime: start, endTime: stop });
  }
  return ok({ doctorId: Number(doctorId), date, availableSlots: slots, room: schedule.room });
}

export async function apiCreateAppointment(patientId, payload) {
  await delay(450);
  if (findLeave(payload.doctorId, payload.appointmentDate)) {
    throw new ApiError("Bác sĩ nghỉ vào ngày bạn chọn, vui lòng chọn ngày khác", 409);
  }
  const conflict = state.appointments.some((a) =>
    a.doctorId === Number(payload.doctorId) && a.date === payload.appointmentDate &&
    a.startTime === payload.startTime && a.status !== "cancelled" && a.status !== "rejected"
  );
  if (conflict) throw new ApiError("Khung giờ này vừa có người đặt, vui lòng chọn khung giờ khác", 409);
  const id = ++idCounters.appointment;
  const appt = {
    id, patientId: Number(patientId), doctorId: Number(payload.doctorId),
    date: payload.appointmentDate, startTime: payload.startTime,
    endTime: payload.endTime || payload.startTime,
    reason: payload.reason || "", status: "pending",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  state.appointments.unshift(appt);
  return ok(appt, "Đặt lịch thành công, vui lòng chờ xác nhận");
}

export async function apiGetPatientAppointments(patientId, filters = {}) {
  await delay();
  let list = state.appointments.filter((a) => a.patientId === Number(patientId));
  if (filters.status) list = list.filter((a) => a.status === filters.status);
  list = list.sort((a, b) => (a.date + a.startTime > b.date + b.startTime ? -1 : 1));
  return ok(list.map(decorateAppointment));
}

export function decorateAppointment(a) {
  const doc = findDoctorUser(a.doctorId);
  const pat = findPatientUser(a.patientId);
  return {
    ...a,
    doctorName: doc?.fullName,
    doctorSpecialty: doc ? specialtyName(doc.specialtyId) : null,
    patientName: pat?.fullName,
    patientPhone: pat?.phone,
    roomName: a.roomId ? roomName(a.roomId) : null,
  };
}

export async function apiGetAppointmentDetail(id) {
  await delay(240);
  const a = state.appointments.find((x) => x.id === Number(id));
  if (!a) throw new ApiError("Không tìm thấy lịch hẹn", 404);
  const record = state.records.find((r) => r.appointmentId === a.id);
  const prescription = record ? state.prescriptions.find((p) => p.medicalRecordId === record.id) : null;
  return ok({ ...decorateAppointment(a), record: record || null, prescription: prescription || null });
}

export async function apiCancelAppointment(id, actorRole = "patient") {
  await delay(320);
  const a = state.appointments.find((x) => x.id === Number(id));
  if (!a) throw new ApiError("Không tìm thấy lịch hẹn", 404);
  if (["completed", "cancelled", "rejected"].includes(a.status)) {
    throw new ApiError("Lịch hẹn này không thể hủy", 400);
  }
  a.status = "cancelled";
  return ok(decorateAppointment(a), "Hủy lịch hẹn thành công");
}

export async function apiGetPatientRecords(patientId) {
  await delay();
  const list = state.records
    .filter((r) => r.patientId === Number(patientId))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(decorateRecord);
  return ok(list);
}

function decorateRecord(r) {
  const doc = findDoctorUser(r.doctorId);
  const prescription = state.prescriptions.find((p) => p.medicalRecordId === r.id) || null;
  return { ...r, doctorName: doc?.fullName, doctorSpecialty: doc ? specialtyName(doc.specialtyId) : null, prescription };
}

export async function apiGetRecordDetail(id) {
  await delay(240);
  const r = state.records.find((x) => x.id === Number(id));
  if (!r) throw new ApiError("Không tìm thấy hồ sơ bệnh án", 404);
  return ok(decorateRecord(r));
}

export async function apiGetPatientInvoices(patientId) {
  await delay();
  const list = state.invoices
    .filter((i) => i.patientId === Number(patientId))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return ok(list);
}

export async function apiGetWalletBalance(patientId) {
  await delay(200);
  return ok({ balance: state.wallets[Number(patientId)] ?? 0 });
}

export async function apiLoadBalance(patientId, amount) {
  await delay(700);
  const amt = Number(amount);
  if (!amt || amt <= 0) throw new ApiError("Số tiền nạp không hợp lệ", 400);
  const current = state.wallets[Number(patientId)] ?? 0;
  state.wallets[Number(patientId)] = current + amt;
  return ok({ balance: state.wallets[Number(patientId)] }, "Nạp tiền vào ví thành công (mô phỏng)");
}

// ---------------------------------------------------------------------------
// NOTIFICATIONS (bệnh nhân)
// ---------------------------------------------------------------------------
export async function apiGetNotifications(patientId) {
  await delay(220);
  const list = state.notifications
    .filter((n) => n.patientId === Number(patientId))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return ok(list);
}

export async function apiMarkNotificationRead(id) {
  await delay(150);
  const n = state.notifications.find((x) => x.id === Number(id));
  if (n) n.isRead = true;
  return ok(n || null);
}

export async function apiMarkAllNotificationsRead(patientId) {
  await delay(200);
  state.notifications.filter((n) => n.patientId === Number(patientId)).forEach((n) => { n.isRead = true; });
  return ok(null, "Đã đánh dấu tất cả là đã đọc");
}

export async function apiPayInvoice(id, amount, patientId) {
  await delay(900);
  const inv = state.invoices.find((x) => x.id === Number(id));
  if (!inv) throw new ApiError("Không tìm thấy hóa đơn", 404);
  if (inv.status === "paid") throw new ApiError("Hóa đơn đã được thanh toán trước đó", 400);
  if (Number(amount) !== inv.amount) {
    throw new ApiError(`Số tiền chuyển khoản phải khớp chính xác với số tiền hóa đơn (${inv.amount.toLocaleString("vi-VN")}đ)`, 400);
  }
  const balance = state.wallets[Number(patientId)] ?? 0;
  if (balance < amount) {
    throw new ApiError("Số dư tài khoản không đủ để thực hiện giao dịch này", 402);
  }
  state.wallets[Number(patientId)] = balance - amount;
  inv.status = "paid";
  inv.paidAt = new Date().toISOString().slice(0, 10);
  return ok({ invoice: inv, newBalance: state.wallets[Number(patientId)] }, "Chuyển khoản thành công");
}

export async function apiGetProfile(userId) {
  await delay(200);
  const u = [state.admin, ...state.doctors, ...state.patients].find((x) => x.id === Number(userId));
  if (!u) throw new ApiError("Không tìm thấy người dùng", 404);
  return ok(u);
}

export async function apiUpdateProfile(userId, payload) {
  await delay(400);
  const u = state.patients.find((x) => x.id === Number(userId))
    || state.doctors.find((x) => x.id === Number(userId))
    || (state.admin.id === Number(userId) ? state.admin : null);
  if (!u) throw new ApiError("Không tìm thấy người dùng", 404);
  Object.assign(u, payload);
  return ok(u, "Cập nhật hồ sơ thành công");
}

// ---------------------------------------------------------------------------
// DOCTOR-FACING
// ---------------------------------------------------------------------------
export async function apiGetDoctorAppointments(doctorId, filters = {}) {
  await delay();
  let list = state.appointments.filter((a) => a.doctorId === Number(doctorId));
  if (filters.date) list = list.filter((a) => a.date === filters.date);
  if (filters.status) list = list.filter((a) => a.status === filters.status);
  list = list.sort((a, b) => (a.date + a.startTime > b.date + b.startTime ? 1 : -1));
  return ok(list.map(decorateAppointment));
}

export async function apiUpdateAppointmentStatus(id, status) {
  await delay(320);
  const a = state.appointments.find((x) => x.id === Number(id));
  if (!a) throw new ApiError("Không tìm thấy lịch hẹn", 404);
  a.status = status;
  return ok(decorateAppointment(a), "Cập nhật trạng thái thành công");
}

export async function apiCreateMedicalRecord(doctorId, payload) {
  await delay(500);
  const appt = state.appointments.find((a) => a.id === Number(payload.appointmentId));
  if (!appt) throw new ApiError("Không tìm thấy lịch hẹn", 404);
  const id = ++idCounters.record;
  const record = {
    id, appointmentId: appt.id, patientId: appt.patientId, doctorId: Number(doctorId),
    symptoms: payload.symptoms, diagnosis: payload.diagnosis, notes: payload.notes || "",
    followUpDate: payload.followUpDate || null, createdAt: new Date().toISOString().slice(0, 10),
  };
  state.records.push(record);
  appt.status = "completed";
  return ok(decorateRecord(record), "Lưu hồ sơ khám bệnh thành công");
}

export async function apiUpdateMedicalRecord(id, payload) {
  await delay(400);
  const r = state.records.find((x) => x.id === Number(id));
  if (!r) throw new ApiError("Không tìm thấy hồ sơ", 404);
  Object.assign(r, payload);
  return ok(decorateRecord(r), "Cập nhật hồ sơ thành công");
}

export async function apiCreatePrescription(payload) {
  await delay(450);
  const id = ++idCounters.prescription;
  const presc = { id, medicalRecordId: Number(payload.medicalRecordId), details: payload.details };
  state.prescriptions.push(presc);
  return ok(presc, "Kê đơn thuốc thành công");
}

export async function apiGetDoctorSchedule(doctorId) {
  await delay(220);
  const list = state.schedules.filter((s) => s.doctorId === Number(doctorId));
  return ok(list);
}

// ---------------------------------------------------------------------------
// ADMIN — DOCTORS
// ---------------------------------------------------------------------------
export async function apiAdminGetDoctors(filters = {}) {
  await delay();
  let list = [...state.doctors];
  if (filters.specialtyId) list = list.filter((d) => d.specialtyId === Number(filters.specialtyId));
  if (filters.status) list = list.filter((d) => d.status === filters.status);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    list = list.filter((d) => d.fullName.toLowerCase().includes(q) || d.email.toLowerCase().includes(q));
  }
  return ok(list.map(decorateDoctor));
}

export async function apiAdminGetDoctorDetail(id) {
  await delay(220);
  const d = findDoctorUser(id);
  if (!d) throw new ApiError("Không tìm thấy bác sĩ", 404);
  const schedule = state.schedules.filter((s) => s.doctorId === d.id);
  return ok({ ...decorateDoctor(d), schedules: schedule });
}

export async function apiAdminCreateDoctor(payload) {
  await delay(500);
  const exists = state.doctors.some((d) => d.email === payload.email);
  if (exists) throw new ApiError("Email đã tồn tại trong hệ thống", 409);
  const id = ++idCounters.doctor;
  const doctor = {
    id, role: "doctor", status: "active", avatarColor: "#0F5C56", baseSalary: payload.baseSalary || 15000000,
    fullName: payload.fullName, email: payload.email, phone: payload.phone,
    specialtyId: Number(payload.specialtyId), degree: payload.degree,
    experienceYears: Number(payload.experienceYears) || 0, description: payload.description || "",
  };
  state.doctors.push(doctor);
  credentials[payload.email] = payload.password || "123456";
  return ok(decorateDoctor(doctor), "Thêm bác sĩ thành công");
}

export async function apiAdminUpdateDoctor(id, payload) {
  await delay(420);
  const d = findDoctorUser(id);
  if (!d) throw new ApiError("Không tìm thấy bác sĩ", 404);
  Object.assign(d, payload);
  return ok(decorateDoctor(d), "Cập nhật thông tin bác sĩ thành công");
}

export async function apiAdminToggleDoctorStatus(id) {
  await delay(300);
  const d = findDoctorUser(id);
  if (!d) throw new ApiError("Không tìm thấy bác sĩ", 404);
  d.status = d.status === "active" ? "locked" : "active";
  return ok(decorateDoctor(d), "Cập nhật trạng thái tài khoản thành công");
}

export async function apiAdminDeleteDoctor(id) {
  await delay(300);
  const idx = state.doctors.findIndex((d) => d.id === Number(id));
  if (idx === -1) throw new ApiError("Không tìm thấy bác sĩ", 404);
  state.doctors[idx].status = "deleted";
  return ok(null, "Đã xóa bác sĩ khỏi hệ thống");
}

// ---------------------------------------------------------------------------
// ADMIN — SCHEDULES
// ---------------------------------------------------------------------------
export async function apiAdminGetSchedules() {
  await delay();
  return ok(state.schedules.map((s) => ({ ...s, doctorName: findDoctorUser(s.doctorId)?.fullName })));
}

export async function apiAdminGetSchedulesByDoctor(doctorId) {
  await delay(220);
  return ok(state.schedules.filter((s) => s.doctorId === Number(doctorId)));
}

export async function apiAdminCreateSchedule(payload) {
  await delay(400);
  const id = ++idCounters.schedule;
  const schedule = { id, ...payload, doctorId: Number(payload.doctorId), dayOfWeek: Number(payload.dayOfWeek) };
  state.schedules.push(schedule);
  return ok(schedule, "Thêm lịch làm việc thành công");
}

export async function apiAdminUpdateSchedule(id, payload) {
  await delay(360);
  const s = state.schedules.find((x) => x.id === Number(id));
  if (!s) throw new ApiError("Không tìm thấy lịch làm việc", 404);
  Object.assign(s, payload);
  return ok(s, "Cập nhật lịch làm việc thành công");
}

export async function apiAdminDeleteSchedule(id) {
  await delay(280);
  state.schedules = state.schedules.filter((s) => s.id !== Number(id));
  return ok(null, "Đã xóa lịch làm việc");
}

export async function apiAdminGetSalaryStats() {
  await delay(300);
  return ok(state.incomes.map((inc) => ({
    ...inc,
    doctorName: findDoctorUser(inc.doctorId)?.fullName,
    monthly: inc.monthly.map((m) => {
      // dayoff được đếm động từ bảng doctor_leaves theo từng tháng —
      // nhờ vậy khi sang tháng mới, chưa có ngày nghỉ nào ghi nhận thì dayoff tự động = 0 (reset).
      const dayoff = state.leaves.filter((l) => l.doctorId === inc.doctorId && l.date.startsWith(m.month)).length;
      const dayon = Math.max(STANDARD_WORK_DAYS - dayoff, 0);
      const received = Math.round((m.baseSalary / STANDARD_WORK_DAYS) * dayon) + m.bonus;
      return { ...m, dayoff, dayon, received };
    }),
  })));
}

// ---------------------------------------------------------------------------
// ADMIN — DOCTOR LEAVES (nghỉ phép)
// ---------------------------------------------------------------------------
export async function apiAdminGetLeaves(filters = {}) {
  await delay(240);
  let list = [...state.leaves];
  if (filters.doctorId) list = list.filter((l) => l.doctorId === Number(filters.doctorId));
  list = list.sort((a, b) => (a.date < b.date ? 1 : -1));
  return ok(list.map((l) => ({
    ...l,
    doctorName: findDoctorUser(l.doctorId)?.fullName,
    affectedAppointments: state.appointments.filter((a) =>
      a.doctorId === l.doctorId && a.date === l.date && !["cancelled", "rejected", "completed"].includes(a.status)
    ).length,
  })));
}

export async function apiAdminCreateLeave({ doctorId, date, reason }) {
  await delay(380);
  if (findLeave(doctorId, date)) {
    throw new ApiError("Bác sĩ đã được đánh dấu nghỉ vào ngày này rồi", 409);
  }
  const id = ++idCounters.leave;
  const leave = { id, doctorId: Number(doctorId), date, reason: reason || "Nghỉ phép", createdAt: new Date().toISOString().slice(0, 10) };
  state.leaves.push(leave);
  const affected = state.appointments.filter((a) =>
    a.doctorId === Number(doctorId) && a.date === date && !["cancelled", "rejected", "completed"].includes(a.status)
  );
  return ok(
    { ...leave, doctorName: findDoctorUser(doctorId)?.fullName, affectedAppointments: affected.length },
    affected.length > 0
      ? `Đã đánh dấu nghỉ. Lưu ý: có ${affected.length} lịch hẹn trong ngày này cần được sắp xếp lại.`
      : "Đã đánh dấu ngày nghỉ cho bác sĩ"
  );
}

export async function apiAdminDeleteLeave(id) {
  await delay(260);
  state.leaves = state.leaves.filter((l) => l.id !== Number(id));
  return ok(null, "Đã hủy đánh dấu ngày nghỉ");
}

export async function apiGetDoctorLeaves(doctorId) {
  await delay(200);
  const today = new Date().toISOString().slice(0, 10);
  return ok(
    state.leaves
      .filter((l) => l.doctorId === Number(doctorId) && l.date >= today)
      .sort((a, b) => (a.date > b.date ? 1 : -1))
  );
}

// ---------------------------------------------------------------------------
// ADMIN — APPOINTMENTS
// ---------------------------------------------------------------------------
export async function apiAdminGetAppointments(filters = {}) {
  await delay();
  let list = [...state.appointments];
  if (filters.status) list = list.filter((a) => a.status === filters.status);
  if (filters.doctorId) list = list.filter((a) => a.doctorId === Number(filters.doctorId));
  if (filters.date) list = list.filter((a) => a.date === filters.date);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    list = list.filter((a) => {
      const p = findPatientUser(a.patientId);
      return p?.fullName.toLowerCase().includes(q) || p?.phone.includes(q);
    });
  }
  list = list.sort((a, b) => (a.date + a.startTime > b.date + b.startTime ? -1 : 1));
  return ok(list.map(decorateAppointment));
}

export async function apiAdminGetAvailableRooms(date, startTime) {
  await delay(260);
  if (!date || !startTime) return ok([]);
  const busyRoomIds = new Set(
    state.appointments
      .filter((a) => a.date === date && a.startTime === startTime && a.roomId && !["cancelled", "rejected"].includes(a.status))
      .map((a) => a.roomId)
  );
  const available = state.rooms.filter((r) => r.status !== "maintenance" && !busyRoomIds.has(r.id));
  return ok(available);
}

export async function apiAdminCreateAppointment(payload) {
  await delay(450);
  if (findLeave(payload.doctorId, payload.date)) {
    throw new ApiError("Bác sĩ nghỉ vào ngày này, vui lòng chọn ngày khác hoặc đổi bác sĩ", 409);
  }
  const conflict = state.appointments.some((a) =>
    a.doctorId === Number(payload.doctorId) && a.date === payload.date &&
    a.startTime === payload.startTime && a.status !== "cancelled" && a.status !== "rejected"
  );
  if (conflict) throw new ApiError("Bác sĩ đã có lịch hẹn khác trong khung giờ này", 409);
  if (payload.roomId) {
    const roomTaken = state.appointments.some((a) =>
      a.roomId === Number(payload.roomId) && a.date === payload.date && a.startTime === payload.startTime &&
      !["cancelled", "rejected"].includes(a.status)
    );
    if (roomTaken) throw new ApiError("Phòng khám này vừa có lịch hẹn khác trong cùng khung giờ", 409);
  }
  const id = ++idCounters.appointment;
  const appt = {
    id, patientId: Number(payload.patientId), doctorId: Number(payload.doctorId),
    date: payload.date, startTime: payload.startTime, endTime: payload.endTime || payload.startTime,
    roomId: payload.roomId ? Number(payload.roomId) : null,
    reason: payload.reason || "Đặt lịch trực tiếp tại quầy lễ tân", status: "confirmed",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  state.appointments.unshift(appt);
  return ok(decorateAppointment(appt), "Tạo lịch hẹn thành công");
}

function createNotification({ type, patientId, appointmentId, text }) {
  const notif = {
    id: ++idCounters.notification, type, patientId: Number(patientId), appointmentId: appointmentId ? Number(appointmentId) : null,
    text, isRead: false, createdAt: new Date().toISOString(),
  };
  state.notifications.unshift(notif);
  return notif;
}

export async function apiAdminUpdateAppointmentStatus(id, action) {
  await delay(320);
  const a = state.appointments.find((x) => x.id === Number(id));
  if (!a) throw new ApiError("Không tìm thấy lịch hẹn", 404);
  const map = { confirm: "confirmed", reject: "rejected", cancel: "cancelled" };
  a.status = map[action] || action;

  // Gửi thông báo tới bệnh nhân khi Admin xác nhận / từ chối / hủy lịch hẹn
  const doc = findDoctorUser(a.doctorId);
  const dateLabel = formatDateVN(a.date);
  const notifText = {
    confirmed: `Lịch hẹn với ${doc?.fullName || "bác sĩ"} ngày ${dateLabel} lúc ${a.startTime} đã được xác nhận.`,
    rejected: `Rất tiếc, lịch hẹn với ${doc?.fullName || "bác sĩ"} ngày ${dateLabel} lúc ${a.startTime} đã bị từ chối. Vui lòng đặt lại lịch khác.`,
    cancelled: `Lịch hẹn với ${doc?.fullName || "bác sĩ"} ngày ${dateLabel} lúc ${a.startTime} đã bị hủy bởi phòng khám.`,
  }[a.status];
  if (notifText) {
    createNotification({ type: `appointment_${a.status}`, patientId: a.patientId, appointmentId: a.id, text: notifText });
  }

  return ok(decorateAppointment(a), "Cập nhật lịch hẹn thành công");
}

export async function apiAdminUpdateAppointment(id, payload) {
  await delay(360);
  const a = state.appointments.find((x) => x.id === Number(id));
  if (!a) throw new ApiError("Không tìm thấy lịch hẹn", 404);
  Object.assign(a, payload);
  return ok(decorateAppointment(a), "Điều chỉnh lịch hẹn thành công");
}

// ---------------------------------------------------------------------------
// ADMIN — PATIENTS
// ---------------------------------------------------------------------------
export async function apiAdminGetPatients(filters = {}) {
  await delay();
  let list = [...state.patients];
  if (filters.status) list = list.filter((p) => p.status === filters.status);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    list = list.filter((p) => p.fullName.toLowerCase().includes(q) || p.phone.includes(q) || p.email.toLowerCase().includes(q));
  }
  return ok(list);
}

export async function apiAdminGetPatientDetail(id) {
  await delay(260);
  const p = findPatientUser(id);
  if (!p) throw new ApiError("Không tìm thấy bệnh nhân", 404);
  const history = state.appointments.filter((a) => a.patientId === p.id).map(decorateAppointment);
  const records = state.records.filter((r) => r.patientId === p.id).map(decorateRecord);
  return ok({ ...p, history, records });
}

export async function apiAdminTogglePatientStatus(id) {
  await delay(280);
  const p = findPatientUser(id);
  if (!p) throw new ApiError("Không tìm thấy bệnh nhân", 404);
  p.status = p.status === "active" ? "locked" : "active";
  return ok(p, "Cập nhật trạng thái tài khoản thành công");
}

// ---------------------------------------------------------------------------
// ADMIN — INVOICES
// ---------------------------------------------------------------------------
export async function apiAdminGetInvoices(filters = {}) {
  await delay();
  let list = [...state.invoices];
  if (filters.status) list = list.filter((i) => i.status === filters.status);
  return ok(list.map((i) => ({ ...i, patientName: findPatientUser(i.patientId)?.fullName })).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
}

export async function apiAdminGetInvoiceDetail(id) {
  await delay(220);
  const inv = state.invoices.find((x) => x.id === Number(id));
  if (!inv) throw new ApiError("Không tìm thấy hóa đơn", 404);
  return ok({ ...inv, patientName: findPatientUser(inv.patientId)?.fullName });
}

export async function apiAdminCreateInvoice(payload) {
  await delay(420);
  const id = ++idCounters.invoice;
  const amount = (payload.items || []).reduce((s, it) => s + Number(it.amount || 0), 0);
  const inv = {
    id, appointmentId: Number(payload.appointmentId), patientId: Number(payload.patientId),
    items: payload.items || [], amount, status: "unpaid",
    createdAt: new Date().toISOString().slice(0, 10), paidAt: null,
  };
  state.invoices.push(inv);
  return ok(inv, "Tạo hóa đơn thành công");
}

export async function apiAdminConfirmPayment(id) {
  await delay(360);
  const inv = state.invoices.find((x) => x.id === Number(id));
  if (!inv) throw new ApiError("Không tìm thấy hóa đơn", 404);
  inv.status = "paid";
  inv.paidAt = new Date().toISOString().slice(0, 10);
  return ok(inv, "Xác nhận thanh toán thành công");
}

// ---------------------------------------------------------------------------
// ADMIN — STATS / ROOMS
// ---------------------------------------------------------------------------
export async function apiAdminStatsOverview() {
  await delay(300);
  const today = new Date().toISOString().slice(0, 10);
  const totalVisitsToday = state.appointments.filter((a) => a.date === today).length;
  const totalPatients = state.patients.length;
  const totalDoctors = state.doctors.filter((d) => d.status === "active").length;
  const revenue = state.invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const pendingCount = state.appointments.filter((a) => a.status === "pending").length;
  const unpaidCount = state.invoices.filter((i) => i.status === "unpaid").length;
  return ok({ totalVisitsToday, totalPatients, totalDoctors, revenue, pendingCount, unpaidCount });
}

export async function apiAdminStatsAppointments() {
  await delay(320);
  const byDate = {};
  state.appointments.forEach((a) => {
    byDate[a.date] = byDate[a.date] || { date: a.date, total: 0, completed: 0, cancelled: 0 };
    byDate[a.date].total += 1;
    if (a.status === "completed") byDate[a.date].completed += 1;
    if (a.status === "cancelled" || a.status === "rejected") byDate[a.date].cancelled += 1;
  });
  return ok(Object.values(byDate).sort((a, b) => (a.date > b.date ? 1 : -1)));
}

export async function apiAdminStatsRevenue() {
  await delay(320);
  const byDate = {};
  state.invoices.filter((i) => i.status === "paid").forEach((i) => {
    byDate[i.paidAt] = (byDate[i.paidAt] || 0) + i.amount;
  });
  return ok(Object.entries(byDate).map(([date, revenue]) => ({ date, revenue })).sort((a, b) => (a.date > b.date ? 1 : -1)));
}

export async function apiAdminStatsByDoctor() {
  await delay(320);
  const list = state.doctors.map((d) => {
    const apps = state.appointments.filter((a) => a.doctorId === d.id);
    const completed = apps.filter((a) => a.status === "completed").length;
    return {
      doctorId: d.id, doctorName: d.fullName, specialtyName: specialtyName(d.specialtyId),
      totalAppointments: apps.length, completed,
    };
  });
  return ok(list);
}

export async function apiAdminGetRooms() {
  await delay(220);
  return ok(state.rooms);
}

// ---------------------------------------------------------------------------
// CHATBOT (mô phỏng AI local qua Ollama theo đề xuất mở rộng trong đồ án)
// ---------------------------------------------------------------------------
export async function apiChatbotMessage({ message, role, userId }) {
  await delay(650);
  const text = message.toLowerCase();
  let reply = "Xin lỗi, tôi chưa có đủ dữ liệu để trả lời câu hỏi này. Bạn có thể hỏi về lịch khám, bác sĩ, chuyên khoa hoặc hóa đơn.";

  if (text.includes("bác sĩ") && text.includes("tim")) {
    const d = state.doctors.find((x) => x.specialtyId === 5);
    reply = `Hiện phòng khám có ${d?.fullName} phụ trách chuyên khoa Tim mạch, ${d?.experienceYears} năm kinh nghiệm. Bạn có thể đặt lịch trong mục "Đặt lịch khám".`;
  } else if (text.includes("chuyên khoa") || text.includes("khoa nào")) {
    reply = `Phòng khám hiện có ${state.specialties.length} chuyên khoa: ${state.specialties.map((s) => s.name).join(", ")}.`;
  } else if (role === "patient" && (text.includes("lịch") || text.includes("hẹn"))) {
    const list = state.appointments.filter((a) => a.patientId === Number(userId) && ["pending", "confirmed"].includes(a.status));
    reply = list.length
      ? `Bạn đang có ${list.length} lịch hẹn sắp tới. Gần nhất vào ngày ${list[0].date} lúc ${list[0].startTime} với bác sĩ ${findDoctorUser(list[0].doctorId)?.fullName}.`
      : "Bạn hiện chưa có lịch hẹn nào sắp tới. Hãy đặt lịch mới trong mục \"Đặt lịch khám\" nhé.";
  } else if (role === "patient" && text.includes("hóa đơn")) {
    const unpaid = state.invoices.filter((i) => i.patientId === Number(userId) && i.status === "unpaid");
    reply = unpaid.length
      ? `Bạn có ${unpaid.length} hóa đơn chưa thanh toán, tổng cộng ${unpaid.reduce((s, i) => s + i.amount, 0).toLocaleString("vi-VN")}đ.`
      : "Bạn không có hóa đơn nào chưa thanh toán.";
  } else if (role === "admin" && (text.includes("doanh thu"))) {
    const revenue = state.invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
    reply = `Tổng doanh thu đã ghi nhận: ${revenue.toLocaleString("vi-VN")}đ từ ${state.invoices.filter((i) => i.status === "paid").length} hóa đơn đã thanh toán.`;
  } else if (text.includes("đau đầu") || text.includes("sốt")) {
    reply = "Triệu chứng đau đầu, sốt có thể liên quan đến cảm cúm thông thường. Bạn nên đặt lịch khám chuyên khoa Nội tổng quát để được chẩn đoán chính xác.";
  } else if (text.includes("xin chào") || text.includes("hello") || text.includes("hi")) {
    reply = "Xin chào! Tôi là trợ lý ảo của MediCare Hub. Tôi có thể giúp bạn tra cứu bác sĩ, chuyên khoa, lịch hẹn hoặc hóa đơn.";
  }

  return ok({ reply, createdAt: new Date().toISOString() });
}

// ---------------------------------------------------------------------------
// AI GỢI Ý BỆNH + THUỐC THEO TRIỆU CHỨNG (mô phỏng AI_SERVICE/drug_recommendation)
// ---------------------------------------------------------------------------
// Khi BE + AI_SERVICE thật sẵn sàng, chỉ cần sửa `src/services/aiService.js`
// để gọi `httpClient.post('/ai/predict-disease', {...})` — hàm mock này giữ
// nguyên format response {diseases, medicines} để không phải sửa bất kỳ
// component UI nào (DoctorAppointmentDetail.jsx dùng qua aiService).
export async function apiAiPredictDisease({ symptoms, diagnosis }) {
  await delay(900);
  const text = `${symptoms || ""} ${diagnosis || ""}`.toLowerCase();

  let diseases = [
    { name: "Cảm cúm thông thường", probability: 86, description: "Kết quả mô phỏng dựa trên thông tin triệu chứng đã nhập." },
    { name: "Viêm đường hô hấp trên", probability: 72, description: "Kết quả mô phỏng để phục vụ việc xây dựng giao diện." },
    { name: "Dị ứng đường hô hấp", probability: 48, description: "Cần bác sĩ đánh giá thêm dựa trên tình trạng thực tế." },
    { name: "Viêm phế quản", probability: 31, description: "Kết quả mô phỏng, không thay thế chẩn đoán y khoa." },
  ];
  let medicines = [
    { name: "Paracetamol", probability: 82, usage: "Mẫu minh họa thuốc giảm đau, hạ sốt." },
    { name: "Vitamin C", probability: 64, usage: "Mẫu minh họa đề xuất thuốc." },
    { name: "Nước muối sinh lý", probability: 53, usage: "Mẫu minh họa hỗ trợ chăm sóc." },
    { name: "Thuốc ho", probability: 37, usage: "Cần bác sĩ kiểm tra trước khi kê đơn." },
  ];

  // Dữ liệu minh họa theo từ khóa — sẽ được thay bằng model AI thật (drug_recommendation)
  if (text.includes("đau họng") || text.includes("viêm họng")) {
    diseases = [
      { name: "Viêm họng", probability: 91, description: "Kết quả mô phỏng dựa trên từ khóa triệu chứng." },
      { name: "Viêm amidan", probability: 76, description: "Kết quả mô phỏng để hiển thị giao diện." },
      { name: "Cảm cúm thông thường", probability: 61, description: "Kết quả mô phỏng, cần bác sĩ đánh giá." },
      { name: "Dị ứng đường hô hấp", probability: 39, description: "Kết quả mô phỏng, không thay thế chẩn đoán." },
    ];
  }
  if (text.includes("đau đầu") || text.includes("sốt")) {
    medicines = [
      { name: "Paracetamol", probability: 88, usage: "Mẫu minh họa thuốc giảm đau, hạ sốt." },
      { name: "Nước điện giải", probability: 69, usage: "Mẫu minh họa hỗ trợ bù nước." },
      { name: "Vitamin C", probability: 51, usage: "Mẫu minh họa đề xuất thuốc." },
    ];
  }

  return ok({
    diseases: diseases.sort((a, b) => b.probability - a.probability),
    medicines: medicines.sort((a, b) => b.probability - a.probability),
  });
}
