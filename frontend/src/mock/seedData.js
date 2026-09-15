import { addDays, format, subDays } from "date-fns";

const D = (offset) => format(addDays(new Date(), offset), "yyyy-MM-dd");

// ---------------------------------------------------------------------------
// SPECIALTIES
// ---------------------------------------------------------------------------
export const specialties = [
  { id: 1, name: "Nội tổng quát", description: "Khám và điều trị các bệnh lý nội khoa thông thường.", icon: "stethoscope" },
  { id: 2, name: "Nhi khoa", description: "Chăm sóc sức khỏe trẻ em từ sơ sinh đến 15 tuổi.", icon: "baby" },
  { id: 3, name: "Da liễu", description: "Chẩn đoán và điều trị các bệnh về da, tóc, móng.", icon: "sparkles" },
  { id: 4, name: "Tai Mũi Họng", description: "Chuyên khoa các bệnh lý tai, mũi, họng.", icon: "ear" },
  { id: 5, name: "Tim mạch", description: "Tầm soát và điều trị các bệnh lý tim mạch.", icon: "heart" },
  { id: 6, name: "Cơ xương khớp", description: "Điều trị các vấn đề về xương khớp, vận động.", icon: "bone" },
];

// ---------------------------------------------------------------------------
// USERS — DOCTORS
// ---------------------------------------------------------------------------
export const doctors = [
  {
    id: 101, role: "doctor", fullName: "BS.CKI Trần Thị Bình", email: "tranthib@medicare.vn",
    phone: "0987654321", specialtyId: 1, degree: "Chuyên khoa I", experienceYears: 8,
    description: "8 năm kinh nghiệm nội tổng quát, tốt nghiệp Đại học Y Hà Nội.", status: "active",
    avatarColor: "#0F5C56", baseSalary: 22000000,
  },
  {
    id: 102, role: "doctor", fullName: "BS. Lê Văn Cường", email: "levancuong@medicare.vn",
    phone: "0912233445", specialtyId: 2, degree: "Thạc sĩ", experienceYears: 6,
    description: "Chuyên nhi khoa, giàu kinh nghiệm khám trẻ sơ sinh.", status: "active",
    avatarColor: "#C08D2E", baseSalary: 19000000,
  },
  {
    id: 103, role: "doctor", fullName: "BS.CKII Phạm Thu Hà", email: "phamthuha@medicare.vn",
    phone: "0977889900", specialtyId: 3, degree: "Chuyên khoa II", experienceYears: 12,
    description: "12 năm kinh nghiệm điều trị da liễu thẩm mỹ.", status: "active",
    avatarColor: "#9C7124", baseSalary: 26000000,
  },
  {
    id: 104, role: "doctor", fullName: "BS. Nguyễn Đức Minh", email: "nguyenducminh@medicare.vn",
    phone: "0966554433", specialtyId: 4, degree: "Bác sĩ", experienceYears: 4,
    description: "Chuyên khám và điều trị các bệnh lý tai mũi họng.", status: "active",
    avatarColor: "#3F9683", baseSalary: 16000000,
  },
  {
    id: 105, role: "doctor", fullName: "BS.CKI Đỗ Thanh Tùng", email: "dothanhtung@medicare.vn",
    phone: "0933221100", specialtyId: 5, degree: "Chuyên khoa I", experienceYears: 10,
    description: "10 năm kinh nghiệm tim mạch, từng công tác tại BV Bạch Mai.", status: "active",
    avatarColor: "#227354", baseSalary: 24000000,
  },
  {
    id: 106, role: "doctor", fullName: "BS. Vũ Ngọc Lan", email: "vungoclan@medicare.vn",
    phone: "0944556677", specialtyId: 6, degree: "Thạc sĩ", experienceYears: 5,
    description: "Chuyên điều trị các bệnh lý cơ xương khớp, vật lý trị liệu.", status: "locked",
    avatarColor: "#A23931", baseSalary: 17000000,
  },
];

// ---------------------------------------------------------------------------
// USERS — PATIENTS
// ---------------------------------------------------------------------------
export const patients = [
  { id: 201, role: "patient", fullName: "Nguyễn Văn An", email: "nguyenvanan@gmail.com", phone: "0912345678", dateOfBirth: "1990-05-15", gender: "male", address: "Cầu Giấy, Hà Nội", status: "active" },
  { id: 202, role: "patient", fullName: "Trần Thị Bích", email: "tranthibich@gmail.com", phone: "0923456789", dateOfBirth: "1985-11-02", gender: "female", address: "Đống Đa, Hà Nội", status: "active" },
  { id: 203, role: "patient", fullName: "Lê Hoàng Nam", email: "lehoangnam@gmail.com", phone: "0934567890", dateOfBirth: "2001-02-20", gender: "male", address: "Hai Bà Trưng, Hà Nội", status: "active" },
  { id: 204, role: "patient", fullName: "Phạm Thị Duyên", email: "phamthiduyen@gmail.com", phone: "0945678901", dateOfBirth: "1998-08-09", gender: "female", address: "Thanh Xuân, Hà Nội", status: "active" },
  { id: 205, role: "patient", fullName: "Hoàng Minh Đức", email: "hoangminhduc@gmail.com", phone: "0956789012", dateOfBirth: "1975-03-30", gender: "male", address: "Ba Đình, Hà Nội", status: "active" },
  { id: 206, role: "patient", fullName: "Đặng Thu Trang", email: "dangthutrang@gmail.com", phone: "0967890123", dateOfBirth: "1993-12-12", gender: "female", address: "Long Biên, Hà Nội", status: "active" },
  { id: 207, role: "patient", fullName: "Bùi Anh Tuấn", email: "buianhtuan@gmail.com", phone: "0978901234", dateOfBirth: "2015-07-18", gender: "male", address: "Nam Từ Liêm, Hà Nội", status: "active" },
  { id: 208, role: "patient", fullName: "Vũ Thị Mai", email: "vuthimai@gmail.com", phone: "0989012345", dateOfBirth: "1988-09-25", gender: "female", address: "Hoàng Mai, Hà Nội", status: "locked" },
  { id: 209, role: "patient", fullName: "Ngô Quốc Bảo", email: "ngoquocbao@gmail.com", phone: "0990123456", dateOfBirth: "1999-01-05", gender: "male", address: "Tây Hồ, Hà Nội", status: "active" },
  { id: 210, role: "patient", fullName: "Đinh Khánh Linh", email: "dinhkhanhlinh@gmail.com", phone: "0901234567", dateOfBirth: "1996-06-14", gender: "female", address: "Cầu Giấy, Hà Nội", status: "active" },
];

// ---------------------------------------------------------------------------
// NOTIFICATIONS — thông báo gửi tới bệnh nhân khi trạng thái lịch hẹn thay đổi
// ---------------------------------------------------------------------------
export const notifications = [
  {
    id: 1, type: "appointment_confirmed", patientId: 201, appointmentId: 1011,
    text: "Lịch hẹn với BS. Nguyễn Đức Minh ngày " + D(0) + " lúc 14:00 đã được xác nhận.",
    isRead: false, createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 2, type: "appointment_rejected", patientId: 208, appointmentId: 1010,
    text: "Rất tiếc, lịch hẹn với BS. Lê Văn Cường ngày " + D(-1) + " lúc 10:00 đã bị từ chối. Vui lòng đặt lại lịch khác.",
    isRead: false, createdAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
  },
  {
    id: 3, type: "appointment_confirmed", patientId: 206, appointmentId: 1014,
    text: "Lịch hẹn với BS.CKI Đỗ Thanh Tùng ngày " + D(1) + " lúc 08:00 đã được xác nhận.",
    isRead: true, createdAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
  },
];

// admin account
export const adminAccount = {
  id: 1, role: "admin", fullName: "Quản trị viên Mai Lan", email: "admin@medicare.vn", phone: "0900000000", status: "active",
};

// ---------------------------------------------------------------------------
// VÍ THANH TOÁN ẢO CỦA BỆNH NHÂN (mô phỏng số dư tài khoản ngân hàng liên kết)
// ---------------------------------------------------------------------------
export const patientWallets = {
  201: 5000000,
  202: 12000000,
  203: 800000,   // cố tình để thấp để demo trường hợp không đủ số dư
  204: 3200000,
  205: 20000000,
  206: 250000,   // không đủ để trả hóa đơn #907 (430.000đ) — demo lỗi số dư
  207: 1500000,
  208: 6000000,
  209: 4500000,
  210: 7000000,
};

export const users = [adminAccount, ...doctors, ...patients];

// credentials map — dùng cho mock đăng nhập, mật khẩu chung cho demo
export const credentials = users.reduce((acc, u) => {
  acc[u.email] = "123456";
  return acc;
}, {});

// ---------------------------------------------------------------------------
// ROOMS
// ---------------------------------------------------------------------------
export const rooms = [
  { id: 1, name: "Phòng khám 101", floor: "Tầng 1", status: "in_use" },
  { id: 2, name: "Phòng khám 102", floor: "Tầng 1", status: "available" },
  { id: 3, name: "Phòng khám 103", floor: "Tầng 1", status: "available" },
  { id: 4, name: "Phòng khám Nhi", floor: "Tầng 2", status: "in_use" },
  { id: 5, name: "Phòng xét nghiệm", floor: "Tầng 2", status: "maintenance" },
  { id: 6, name: "Phòng tiểu phẫu", floor: "Tầng 3", status: "available" },
];

// ---------------------------------------------------------------------------
// DOCTOR SCHEDULES (weekly recurring)
// ---------------------------------------------------------------------------
export const doctorSchedules = [
  { id: 1, doctorId: 101, dayOfWeek: 1, startTime: "08:00", endTime: "12:00", slotDuration: 30, maxPatients: 8, room: "Phòng khám 101" },
  { id: 2, doctorId: 101, dayOfWeek: 3, startTime: "08:00", endTime: "12:00", slotDuration: 30, maxPatients: 8, room: "Phòng khám 101" },
  { id: 3, doctorId: 101, dayOfWeek: 5, startTime: "13:30", endTime: "17:00", slotDuration: 30, maxPatients: 7, room: "Phòng khám 101" },
  { id: 4, doctorId: 102, dayOfWeek: 2, startTime: "08:00", endTime: "11:30", slotDuration: 30, maxPatients: 7, room: "Phòng khám Nhi" },
  { id: 5, doctorId: 102, dayOfWeek: 4, startTime: "13:30", endTime: "17:00", slotDuration: 30, maxPatients: 7, room: "Phòng khám Nhi" },
  { id: 6, doctorId: 103, dayOfWeek: 1, startTime: "13:30", endTime: "17:00", slotDuration: 20, maxPatients: 10, room: "Phòng khám 102" },
  { id: 7, doctorId: 103, dayOfWeek: 4, startTime: "08:00", endTime: "12:00", slotDuration: 20, maxPatients: 12, room: "Phòng khám 102" },
  { id: 8, doctorId: 104, dayOfWeek: 2, startTime: "13:30", endTime: "17:00", slotDuration: 30, maxPatients: 7, room: "Phòng khám 103" },
  { id: 9, doctorId: 104, dayOfWeek: 5, startTime: "08:00", endTime: "11:30", slotDuration: 30, maxPatients: 7, room: "Phòng khám 103" },
  { id: 10, doctorId: 105, dayOfWeek: 3, startTime: "13:30", endTime: "17:00", slotDuration: 30, maxPatients: 6, room: "Phòng khám 101" },
  { id: 11, doctorId: 105, dayOfWeek: 6, startTime: "08:00", endTime: "11:30", slotDuration: 30, maxPatients: 6, room: "Phòng khám 101" },
  { id: 12, doctorId: 106, dayOfWeek: 2, startTime: "08:00", endTime: "12:00", slotDuration: 30, maxPatients: 8, room: "Phòng khám 102" },
];

// ---------------------------------------------------------------------------
// APPOINTMENTS — mix of past (completed/cancelled) and upcoming (pending/confirmed)
// ---------------------------------------------------------------------------
export const appointments = [
  { id: 1001, patientId: 201, doctorId: 101, date: D(-6), startTime: "08:00", endTime: "08:30", reason: "Đau đầu, sốt nhẹ 2 ngày", status: "completed", createdAt: D(-8) },
  { id: 1002, patientId: 202, doctorId: 105, date: D(-5), startTime: "14:00", endTime: "14:30", reason: "Đau tức ngực khi gắng sức", status: "completed", createdAt: D(-7) },
  { id: 1003, patientId: 203, doctorId: 103, date: D(-5), startTime: "13:30", endTime: "13:50", reason: "Nổi mẩn ngứa toàn thân", status: "completed", createdAt: D(-6) },
  { id: 1004, patientId: 207, doctorId: 102, date: D(-4), startTime: "09:00", endTime: "09:30", reason: "Sốt cao, ho có đờm", status: "completed", createdAt: D(-5) },
  { id: 1005, patientId: 204, doctorId: 104, date: D(-4), startTime: "14:30", endTime: "15:00", reason: "Đau họng, khó nuốt", status: "completed", createdAt: D(-6) },
  { id: 1006, patientId: 205, doctorId: 101, date: D(-3), startTime: "08:30", endTime: "09:00", reason: "Khám sức khỏe định kỳ", status: "completed", createdAt: D(-4) },
  { id: 1007, patientId: 206, doctorId: 103, date: D(-3), startTime: "13:50", endTime: "14:10", reason: "Mụn trứng cá nặng", status: "completed", createdAt: D(-5) },
  { id: 1008, patientId: 209, doctorId: 105, date: D(-2), startTime: "14:30", endTime: "15:00", reason: "Hồi hộp, tim đập nhanh", status: "cancelled", createdAt: D(-4) },
  { id: 1009, patientId: 210, doctorId: 101, date: D(-2), startTime: "09:00", endTime: "09:30", reason: "Đau bụng âm ỉ vùng thượng vị", status: "completed", createdAt: D(-3) },
  { id: 1010, patientId: 208, doctorId: 102, date: D(-1), startTime: "10:00", endTime: "10:30", reason: "Bé quấy khóc, biếng ăn", status: "rejected", createdAt: D(-2) },
  { id: 1011, patientId: 201, doctorId: 104, date: D(0), startTime: "14:00", endTime: "14:30", reason: "Ù tai, nghe kém một bên", status: "confirmed", createdAt: D(-2) },
  { id: 1012, patientId: 203, doctorId: 101, date: D(0), startTime: "08:30", endTime: "09:00", reason: "Tái khám định kỳ", status: "in_progress", createdAt: D(-3) },
  { id: 1013, patientId: 202, doctorId: 103, date: D(0), startTime: "13:50", endTime: "14:10", reason: "Viêm da tiếp xúc", status: "pending", createdAt: D(0) },
  { id: 1014, patientId: 206, doctorId: 105, date: D(1), startTime: "08:00", endTime: "08:30", reason: "Kiểm tra huyết áp cao", status: "confirmed", createdAt: D(-1) },
  { id: 1015, patientId: 204, doctorId: 102, date: D(1), startTime: "09:30", endTime: "10:00", reason: "Tiêm phòng định kỳ cho bé", status: "confirmed", createdAt: D(-1) },
  { id: 1016, patientId: 210, doctorId: 106, date: D(2), startTime: "08:30", endTime: "09:00", reason: "Đau lưng kéo dài", status: "pending", createdAt: D(0) },
  { id: 1017, patientId: 205, doctorId: 104, date: D(2), startTime: "14:00", endTime: "14:30", reason: "Viêm xoang tái phát", status: "pending", createdAt: D(0) },
  { id: 1018, patientId: 209, doctorId: 101, date: D(3), startTime: "08:00", endTime: "08:30", reason: "Mệt mỏi kéo dài, mất ngủ", status: "pending", createdAt: D(0) },
  { id: 1019, patientId: 207, doctorId: 103, date: D(4), startTime: "13:30", endTime: "13:50", reason: "Chàm da cơ địa", status: "confirmed", createdAt: D(-1) },
  { id: 1020, patientId: 208, doctorId: 105, date: D(5), startTime: "08:30", endTime: "09:00", reason: "Khám tim mạch tổng quát", status: "pending", createdAt: D(0) },
];

// ---------------------------------------------------------------------------
// MEDICAL RECORDS — one per completed appointment
// ---------------------------------------------------------------------------
export const medicalRecords = [
  { id: 501, appointmentId: 1001, patientId: 201, doctorId: 101, symptoms: "Đau đầu, sốt nhẹ 2 ngày, hơi chóng mặt", diagnosis: "Cảm cúm thông thường", notes: "Nghỉ ngơi, uống nhiều nước, theo dõi nhiệt độ.", followUpDate: D(4), createdAt: D(-6) },
  { id: 502, appointmentId: 1002, patientId: 202, doctorId: 105, symptoms: "Đau tức ngực trái khi gắng sức, khó thở nhẹ", diagnosis: "Thiếu máu cơ tim cục bộ nghi ngờ, cần theo dõi thêm", notes: "Hạn chế vận động mạnh, tái khám sau 2 tuần kèm điện tâm đồ.", followUpDate: D(9), createdAt: D(-5) },
  { id: 503, appointmentId: 1003, patientId: 203, doctorId: 103, symptoms: "Nổi mẩn đỏ, ngứa nhiều vùng tay và thân mình", diagnosis: "Viêm da dị ứng", notes: "Tránh tiếp xúc xà phòng mạnh, dùng kem dưỡng ẩm.", followUpDate: null, createdAt: D(-5) },
  { id: 504, appointmentId: 1004, patientId: 207, doctorId: 102, symptoms: "Sốt 38.5°C, ho có đờm, chảy mũi", diagnosis: "Viêm phế quản cấp", notes: "Theo dõi sốt tại nhà, tái khám nếu sốt trên 3 ngày.", followUpDate: D(-1), createdAt: D(-4) },
  { id: 505, appointmentId: 1005, patientId: 204, doctorId: 104, symptoms: "Đau rát họng, khó nuốt, ho khan", diagnosis: "Viêm họng cấp", notes: "Súc miệng nước muối ấm, hạn chế đồ lạnh.", followUpDate: null, createdAt: D(-4) },
  { id: 506, appointmentId: 1006, patientId: 205, doctorId: 101, symptoms: "Không có triệu chứng bất thường", diagnosis: "Sức khỏe ổn định", notes: "Duy trì chế độ ăn uống lành mạnh, tái khám định kỳ 6 tháng/lần.", followUpDate: D(180), createdAt: D(-3) },
  { id: 507, appointmentId: 1007, patientId: 206, doctorId: 103, symptoms: "Mụn viêm đỏ, mụn mủ nhiều ở vùng mặt", diagnosis: "Mụn trứng cá mức độ trung bình - nặng", notes: "Vệ sinh da đúng cách, tránh nặn mụn, tái khám sau 3 tuần.", followUpDate: D(18), createdAt: D(-3) },
  { id: 508, appointmentId: 1009, patientId: 210, doctorId: 101, symptoms: "Đau âm ỉ vùng thượng vị, ợ chua sau ăn", diagnosis: "Viêm dạ dày cấp", notes: "Ăn uống điều độ, tránh đồ cay nóng, rượu bia.", followUpDate: D(10), createdAt: D(-2) },
];

// ---------------------------------------------------------------------------
// PRESCRIPTIONS
// ---------------------------------------------------------------------------
export const prescriptions = [
  { id: 701, medicalRecordId: 501, details: [
    { medicineName: "Paracetamol 500mg", dosage: "1 viên x 3 lần/ngày", quantity: 10, instruction: "Uống sau ăn" },
    { medicineName: "Vitamin C 1000mg", dosage: "1 viên/ngày", quantity: 7, instruction: "Uống buổi sáng" },
  ]},
  { id: 702, medicalRecordId: 502, details: [
    { medicineName: "Aspirin 81mg", dosage: "1 viên/ngày", quantity: 14, instruction: "Uống sau ăn sáng" },
    { medicineName: "Atorvastatin 20mg", dosage: "1 viên/tối", quantity: 14, instruction: "Uống trước khi ngủ" },
  ]},
  { id: 703, medicalRecordId: 503, details: [
    { medicineName: "Cetirizine 10mg", dosage: "1 viên/tối", quantity: 5, instruction: "Uống sau ăn tối" },
    { medicineName: "Kem bôi Hydrocortisone 1%", dosage: "Bôi 2 lần/ngày", quantity: 1, instruction: "Bôi vùng da tổn thương" },
  ]},
  { id: 704, medicalRecordId: 504, details: [
    { medicineName: "Amoxicillin 500mg", dosage: "1 viên x 3 lần/ngày", quantity: 21, instruction: "Uống đủ liều 7 ngày" },
    { medicineName: "Siro ho Prospan", dosage: "10ml x 2 lần/ngày", quantity: 1, instruction: "Uống sau ăn" },
  ]},
  { id: 705, medicalRecordId: 505, details: [
    { medicineName: "Alphachymotrypsin", dosage: "2 viên x 2 lần/ngày", quantity: 8, instruction: "Ngậm dưới lưỡi" },
  ]},
  { id: 707, medicalRecordId: 507, details: [
    { medicineName: "Doxycycline 100mg", dosage: "1 viên/ngày", quantity: 21, instruction: "Uống sau ăn, tránh nắng" },
    { medicineName: "Gel trị mụn Benzoyl Peroxide", dosage: "Bôi tối trước khi ngủ", quantity: 1, instruction: "Tránh vùng mắt" },
  ]},
  { id: 708, medicalRecordId: 508, details: [
    { medicineName: "Omeprazole 20mg", dosage: "1 viên/ngày", quantity: 14, instruction: "Uống trước ăn sáng 30 phút" },
    { medicineName: "Domperidone 10mg", dosage: "1 viên x 2 lần/ngày", quantity: 14, instruction: "Uống trước ăn" },
  ]},
];

// ---------------------------------------------------------------------------
// INVOICES
// ---------------------------------------------------------------------------
export const invoices = [
  { id: 901, appointmentId: 1001, patientId: 201, items: [{ label: "Phí khám Nội tổng quát", amount: 200000 }, { label: "Thuốc kê đơn", amount: 85000 }], amount: 285000, status: "paid", createdAt: D(-6), paidAt: D(-6) },
  { id: 902, appointmentId: 1002, patientId: 202, items: [{ label: "Phí khám Tim mạch", amount: 300000 }, { label: "Điện tâm đồ", amount: 150000 }, { label: "Thuốc kê đơn", amount: 120000 }], amount: 570000, status: "paid", createdAt: D(-5), paidAt: D(-5) },
  { id: 903, appointmentId: 1003, patientId: 203, items: [{ label: "Phí khám Da liễu", amount: 250000 }, { label: "Thuốc kê đơn", amount: 65000 }], amount: 315000, status: "paid", createdAt: D(-5), paidAt: D(-4) },
  { id: 904, appointmentId: 1004, patientId: 207, items: [{ label: "Phí khám Nhi khoa", amount: 220000 }, { label: "Thuốc kê đơn", amount: 140000 }], amount: 360000, status: "paid", createdAt: D(-4), paidAt: D(-4) },
  { id: 905, appointmentId: 1005, patientId: 204, items: [{ label: "Phí khám TMH", amount: 200000 }, { label: "Thuốc kê đơn", amount: 45000 }], amount: 245000, status: "unpaid", createdAt: D(-4), paidAt: null },
  { id: 906, appointmentId: 1006, patientId: 205, items: [{ label: "Khám sức khỏe định kỳ", amount: 350000 }], amount: 350000, status: "paid", createdAt: D(-3), paidAt: D(-3) },
  { id: 907, appointmentId: 1007, patientId: 206, items: [{ label: "Phí khám Da liễu", amount: 250000 }, { label: "Thuốc kê đơn", amount: 180000 }], amount: 430000, status: "unpaid", createdAt: D(-3), paidAt: null },
  { id: 908, appointmentId: 1009, patientId: 210, items: [{ label: "Phí khám Nội tổng quát", amount: 200000 }, { label: "Thuốc kê đơn", amount: 95000 }], amount: 295000, status: "unpaid", createdAt: D(-2), paidAt: null },
  { id: 909, appointmentId: 1011, patientId: 201, items: [{ label: "Phí khám Tai Mũi Họng", amount: 200000 }, { label: "Thuốc kê đơn", amount: 60000 }], amount: 260000, status: "unpaid", createdAt: D(0), paidAt: null },
];

// ---------------------------------------------------------------------------
// DOCTOR LEAVES — ngày bác sĩ xin nghỉ (do Admin đánh dấu)
// ---------------------------------------------------------------------------
export const doctorLeaves = [
  { id: 1, doctorId: 103, date: D(2), reason: "Nghỉ phép cá nhân", createdAt: D(-1) },
  { id: 2, doctorId: 105, date: D(6), reason: "Tham dự hội thảo y khoa", createdAt: D(-2) },
  { id: 3, doctorId: 101, date: D(-1), reason: "Nghỉ ốm", createdAt: D(-2) },
];

// ---------------------------------------------------------------------------
// MONTHLY INCOME (bác sĩ) — 6 tháng gần nhất
// ---------------------------------------------------------------------------
function lastSixMonths() {
  const out = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
export const months6 = lastSixMonths();

export const incomes = doctors.map((doc, idx) => ({
  doctorId: doc.id,
  monthly: months6.map((m, i) => ({
    month: m,
    baseSalary: doc.baseSalary,
    bonus: 1200000 + (idx * 150000) + i * 80000,
    total: doc.baseSalary + 1200000 + (idx * 150000) + i * 80000,
  })),
}));

export { subDays, D };
