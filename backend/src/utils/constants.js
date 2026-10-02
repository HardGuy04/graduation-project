// ─────────────────────────────────────────────────────────────────────────────
// Constants — roles, appointment/invoice/room statuses, etc.
// Đồng bộ với frontend/src/utils/constants.js và database/schema.sql
// ─────────────────────────────────────────────────────────────────────────────

const ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  PATIENT: 'patient',
};

const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
};

const INVOICE_STATUS = {
  UNPAID: 'unpaid',
  PAID: 'paid',
  REFUNDED: 'refunded',
};

const ROOM_STATUS = {
  AVAILABLE: 'available',
  IN_USE: 'in_use',
  MAINTENANCE: 'maintenance',
};

const USER_STATUS = {
  ACTIVE: 'active',
  LOCKED: 'locked',
  DISABLED: 'disabled',
};

const NOTIFICATION_TYPES = {
  APPOINTMENT_CONFIRMED: 'appointment_confirmed',
  APPOINTMENT_REJECTED: 'appointment_rejected',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
};

// Ngày công chuẩn / tháng (dùng tính lương)
const STANDARD_WORK_DAYS = 26;

module.exports = {
  ROLES,
  APPOINTMENT_STATUS,
  INVOICE_STATUS,
  ROOM_STATUS,
  USER_STATUS,
  NOTIFICATION_TYPES,
  STANDARD_WORK_DAYS,
};
