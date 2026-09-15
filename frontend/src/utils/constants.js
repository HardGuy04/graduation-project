export const ROLES = {
  ADMIN: "admin",
  DOCTOR: "doctor",
  PATIENT: "patient",
};

export const APPOINTMENT_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  REJECTED: "rejected",
};

export const APPOINTMENT_STATUS_LABEL = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  in_progress: "Đang khám",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  rejected: "Đã từ chối",
};

export const APPOINTMENT_STATUS_STYLE = {
  pending: "bg-gold-50 text-gold-600 border-gold-200",
  confirmed: "bg-teal-50 text-teal-600 border-teal-200",
  in_progress: "bg-slate-100 text-ink-soft border-slate-200",
  completed: "bg-leaf-50 text-leaf-600 border-leaf-400/30",
  cancelled: "bg-slate-100 text-slate-400 border-slate-200",
  rejected: "bg-clay-50 text-clay-500 border-clay-400/30",
};

export const INVOICE_STATUS_LABEL = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
};

export const ROOM_STATUS_LABEL = {
  available: "Sẵn sàng",
  in_use: "Đang sử dụng",
  maintenance: "Bảo trì",
};

export const ROOM_STATUS_STYLE = {
  available: "bg-leaf-50 text-leaf-600 border-leaf-400/30",
  in_use: "bg-gold-50 text-gold-600 border-gold-200",
  maintenance: "bg-clay-50 text-clay-500 border-clay-400/30",
};

export const WEEKDAY_LABEL = {
  0: "Chủ nhật",
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
};

export const GENDER_LABEL = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

export const TOKEN_KEY = "medicare_hub_token";
export const USER_KEY = "medicare_hub_user";
