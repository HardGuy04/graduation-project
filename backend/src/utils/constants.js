// Giá trị enum lấy đúng từ database thật (xem database/schema.sql) — viết HOA.

export const ROLES = Object.freeze({ ADMIN: 'ADMIN', DOCTOR: 'DOCTOR', PATIENT: 'PATIENT' });

export const USER_STATUS = Object.freeze({ ACTIVE: 'ACTIVE', LOCKED: 'LOCKED', DISABLED: 'DISABLED' });

export const GENDERS = Object.freeze(['MALE', 'FEMALE', 'OTHER']);

export const APPT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
});

// Lịch CANCELLED/NO_SHOW giải phóng slot (cột sinh active_*_slot = NULL) nên không tính khi kiểm tra chồng lấn
export const INACTIVE_APPT_STATUSES = Object.freeze([APPT_STATUS.CANCELLED, APPT_STATUS.NO_SHOW]);

export const ROOM_STATUS = Object.freeze(['AVAILABLE', 'MAINTENANCE', 'INACTIVE']);

export const SCHEDULE_STATUS = Object.freeze(['ACTIVE', 'INACTIVE']);

export const PAYMENT_STATUS = Object.freeze({ UNPAID: 'UNPAID', PAID: 'PAID', REFUNDED: 'REFUNDED' });

export const PAYMENT_METHODS = Object.freeze(['CASH', 'CARD', 'TRANSFER', 'WALLET']);

export const WALLET_TX_TYPE = Object.freeze({ TOPUP: 'TOPUP', PAYMENT: 'PAYMENT', REFUND: 'REFUND' });

// notification.type là varchar(30)
export const NOTIFICATION_TYPE = Object.freeze({
  APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
  APPOINTMENT_CONFIRMED: 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  APPOINTMENT_NO_SHOW: 'APPOINTMENT_NO_SHOW',
  APPOINTMENT_ROOM_CHANGED: 'APPOINTMENT_ROOM_CHANGED',
  APPOINTMENT_REMINDER: 'APPOINTMENT_REMINDER',
  INVOICE_CREATED: 'INVOICE_CREATED',
  INVOICE_PAID: 'INVOICE_PAID',
});
