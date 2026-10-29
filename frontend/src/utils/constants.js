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
  NO_SHOW: "no_show",
};

export const APPOINTMENT_STATUS_LABEL = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  in_progress: "Đang khám",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  rejected: "Đã từ chối",
  no_show: "Không đến",
};

export const APPOINTMENT_STATUS_STYLE = {
  pending: "bg-gold-50 text-gold-600 border-gold-200",
  confirmed: "bg-teal-50 text-teal-600 border-teal-200",
  in_progress: "bg-slate-100 text-ink-soft border-slate-200",
  completed: "bg-leaf-50 text-leaf-600 border-leaf-400/30",
  cancelled: "bg-slate-100 text-slate-400 border-slate-200",
  rejected: "bg-clay-50 text-clay-500 border-clay-400/30",
  no_show: "bg-clay-50 text-clay-500 border-clay-400/30",
};

export const INVOICE_STATUS_LABEL = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
};

export const ROOM_STATUS_LABEL = {
  available: "Sẵn sàng",
  maintenance: "Bảo trì",
  inactive: "Ngưng dùng",
  // Giữ nhãn cũ nếu còn dữ liệu mock
  in_use: "Đang sử dụng",
};

export const ROOM_STATUS_STYLE = {
  available: "bg-leaf-50 text-leaf-600 border-leaf-400/30",
  maintenance: "bg-clay-50 text-clay-500 border-clay-400/30",
  inactive: "bg-slate-100 text-slate-500 border-slate-200",
  in_use: "bg-gold-50 text-gold-600 border-gold-200",
};

/** Trạng thái phòng khớp enum backend (AVAILABLE | MAINTENANCE | INACTIVE). */
export const ROOM_STATUS_OPTIONS = [
  { value: "available", api: "AVAILABLE", label: ROOM_STATUS_LABEL.available },
  { value: "maintenance", api: "MAINTENANCE", label: ROOM_STATUS_LABEL.maintenance },
  { value: "inactive", api: "INACTIVE", label: ROOM_STATUS_LABEL.inactive },
];

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

export const GENDER_OPTIONS = Object.entries(GENDER_LABEL).map(([value, label]) => ({ value, label }));

export const TOKEN_KEY = "medicare_hub_token";
export const REFRESH_KEY = "medicare_hub_refresh";
export const USER_KEY = "medicare_hub_user";
