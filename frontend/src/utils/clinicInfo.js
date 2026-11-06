/**
 * Thông tin liên hệ của phòng khám — nguồn duy nhất cho footer.
 * Sửa giá trị ở đây khi phòng khám cập nhật thông tin thật.
 */
export const CLINIC_INFO = {
  name: "MediCare Hub",
  tagline: "Nền tảng quản lý phòng khám: đặt lịch, hồ sơ bệnh án và thanh toán hóa đơn trực tuyến.",
  hotline: "0393666888",
  email: "medicarehub@gmail.com",
  address: "Km 10 Nguyễn Trãi, Hà Đông",
  workingHours: "08:00 – 20:00",
  facebookUrl: "https://www.facebook.com/tran.thai2402?locale=vi_VN",
};

/** Nhóm liên kết nhanh trong footer, theo vai trò. Chỉ dùng route có thật trong src/App.jsx. */
export const FOOTER_LINKS = {
  patient: [
    { label: "Tổng quan", href: "/patient" },
    { label: "Đặt lịch khám", href: "/patient/book" },
    { label: "Lịch khám", href: "/patient/visits" },
    { label: "Hồ sơ bệnh án", href: "/patient/records" },
    { label: "Hóa đơn", href: "/patient/invoices" },
    { label: "Hồ sơ cá nhân", href: "/patient/profile" },
  ],
  doctor: [
    { label: "Tổng quan", href: "/doctor" },
    { label: "Lịch làm việc", href: "/doctor/schedule" },
    { label: "Lịch khám của tôi", href: "/doctor/appointments" },
    { label: "Tra cứu bệnh nhân", href: "/doctor/patients" },
    { label: "Hồ sơ cá nhân", href: "/doctor/profile" },
  ],
};
