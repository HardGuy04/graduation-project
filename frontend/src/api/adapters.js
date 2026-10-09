// Đổi hình dạng backend (HOA, lồng patient/doctor, ISO UTC) sang hình dạng UI đang dùng.

export function toUiRole(role) {
  return String(role || "").toLowerCase();
}

const APPT_TO_UI = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CHECKED_IN: "in_progress",
  DONE: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
};
const APPT_TO_API = {
  pending: "PENDING",
  confirmed: "CONFIRMED",
  in_progress: "CHECKED_IN",
  completed: "DONE",
  cancelled: "CANCELLED",
  rejected: "CANCELLED",
  no_show: "NO_SHOW",
};

export function apptStatusToUi(s) {
  return APPT_TO_UI[s] || String(s || "").toLowerCase();
}
export function apptStatusToApi(s) {
  if (!s) return undefined;
  return APPT_TO_API[s] || String(s).toUpperCase();
}

export function toUiUser(u) {
  if (!u) return u;
  const role = toUiRole(u.role);
  const profileId = u.patient?.id || u.doctor?.id || u.admin?.id || u.id;
  return {
    ...u,
    id: profileId,
    userId: u.id,
    role,
    status: String(u.status || "ACTIVE").toLowerCase(),
    dateOfBirth: u.patient?.dateOfBirth ?? u.dateOfBirth,
    gender: (u.patient?.gender || u.gender || "").toLowerCase() || undefined,
    address: u.patient?.address ?? u.address,
    specialtyId: u.doctor?.specialtyId ?? u.specialtyId,
    specialtyName: u.doctor?.specialtyName ?? u.specialtyName,
    degree: u.doctor?.degree ?? u.degree,
    experienceYears: u.doctor?.experience ?? u.experienceYears ?? u.experience,
    position: u.admin?.position ?? u.position,
  };
}

function splitIso(iso) {
  if (!iso) return { date: null, startTime: null };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: String(iso).slice(0, 10), startTime: null };
  const local = new Date(d.getTime() + 7 * 3_600_000);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    startTime: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
  };
}

export function toUiAppointment(a) {
  if (!a) return a;
  const { date, startTime } = splitIso(a.startAt);
  const end = splitIso(a.endAt);
  const rec = a.record || null;
  return {
    ...a,
    status: apptStatusToUi(a.status),
    date,
    startTime,
    endTime: end.startTime,
    doctorId: a.doctor?.id ?? a.doctorId,
    doctorName: a.doctor?.fullName ?? a.doctorName,
    doctorSpecialty: a.doctor?.specialtyName ?? a.doctorSpecialty,
    patientId: a.patient?.id ?? a.patientId,
    patientName: a.patient?.fullName ?? a.patientName,
    patientPhone: a.patient?.phone ?? a.patientPhone,
    roomId: a.room?.id ?? a.roomId ?? null,
    roomName: a.room?.name ?? a.roomName ?? null,
    record: rec ? toUiRecord(rec) : null,
    prescription: rec?.prescription ? toUiPrescription(rec.prescription) : a.prescription || null,
  };
}

export function toUiRecord(r) {
  if (!r) return r;
  const { date } = splitIso(r.appointment?.startAt || r.createdAt);
  return {
    ...r,
    notes: r.note ?? r.notes,
    doctorId: r.doctor?.id ?? r.doctorId,
    doctorName: r.doctor?.fullName ?? r.doctorName,
    doctorSpecialty: r.doctor?.specialtyName ?? r.doctorSpecialty,
    patientId: r.patient?.id ?? r.patientId,
    patientName: r.patient?.fullName ?? r.patientName,
    createdAt: date || r.createdAt,
    prescription: r.prescription ? toUiPrescription(r.prescription) : r.prescription,
  };
}

export function toUiPrescription(p) {
  if (!p) return p;
  return {
    ...p,
    details: (p.items || p.details || []).map((it) => ({
      ...it,
      instruction: it.usageInstruction ?? it.instruction,
    })),
  };
}

export function toUiInvoice(inv) {
  if (!inv) return inv;
  const { date } = splitIso(inv.createdAt);
  const paid = splitIso(inv.paidAt);
  return {
    ...inv,
    status: String(inv.paymentStatus || inv.status || "").toLowerCase(),
    amount: Number(inv.totalAmount ?? inv.amount ?? 0),
    patientId: inv.patient?.id ?? inv.patientId,
    patientName: inv.patient?.fullName ?? inv.patientName,
    createdAt: date || inv.createdAt,
    paidAt: inv.paidAt ? paid.date : null,
    items: (inv.items || []).map((it) => ({ ...it, amount: Number(it.amount) })),
  };
}

export function toUiDoctor(d) {
  if (!d) return d;
  return {
    ...d,
    status: String(d.status || "ACTIVE").toLowerCase(),
    experienceYears: d.experience ?? d.experienceYears,
    email: d.email,
    phone: d.phone,
  };
}

export function toUiPatient(p) {
  if (!p) return p;
  return {
    ...p,
    status: String(p.status || "ACTIVE").toLowerCase(),
    gender: (p.gender || "").toLowerCase() || undefined,
    walletBalance: p.walletBalance != null ? Number(p.walletBalance) : p.walletBalance,
  };
}

/** Backend 1=T2 … 7=CN → UI 0=CN, 1=T2 … 6=T7 */
export function dowToUi(n) {
  const x = Number(n);
  return x === 7 ? 0 : x;
}
export function dowToApi(n) {
  const x = Number(n);
  return x === 0 ? 7 : x;
}

export function toUiSchedule(s) {
  if (!s) return s;
  return {
    ...s,
    dayOfWeek: dowToUi(s.dayOfWeek),
    maxPatients: s.maxPatient ?? s.maxPatients,
    room: s.room || "—",
    status: String(s.status || "ACTIVE").toLowerCase(),
  };
}

export function toUiLeave(l) {
  if (!l) return l;
  return { ...l, date: l.leaveDate ?? l.date };
}

export function toUiNotification(n) {
  if (!n) return n;
  const typeMap = {
    APPOINTMENT_CREATED: "appointment_created",
    APPOINTMENT_CONFIRMED: "appointment_confirmed",
    APPOINTMENT_CANCELLED: "appointment_cancelled",
    APPOINTMENT_NO_SHOW: "appointment_cancelled",
    APPOINTMENT_ROOM_CHANGED: "appointment_confirmed",
    APPOINTMENT_REMINDER: "appointment_confirmed",
    INVOICE_CREATED: "appointment_confirmed",
    INVOICE_PAID: "appointment_confirmed",
  };
  return { ...n, type: typeMap[n.type] || String(n.type || "").toLowerCase() };
}

export function clinicIso(date, time) {
  const t = time.length === 5 ? `${time}:00` : time;
  return `${date}T${t}+07:00`;
}

export const listOf = (res) => res.data ?? [];
