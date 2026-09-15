# MediCare Hub — Frontend Hệ thống quản lý phòng khám/bệnh viện

Frontend được xây dựng dựa trên tài liệu đồ án tốt nghiệp: hệ thống quản lý phòng
khám với 3 vai trò **Admin (kiêm lễ tân)**, **Bác sĩ**, **Bệnh nhân**.

## Công nghệ sử dụng
- React 18 + Vite
- TailwindCSS 3 (thiết kế riêng: màu teal y tế, font Manrope + Inter)
- React Router v7 (data router)
- React Hook Form (quản lý form)
- Recharts (biểu đồ thống kê)
- React Icons (Heroicons outline)
- React Toastify (thông báo)

## Cài đặt & chạy thử

```bash
npm install
npm run dev       # chạy dev server tại http://localhost:5173
npm run build     # build production vào thư mục dist/
npm run preview   # xem thử bản build
```

## Tài khoản demo (mật khẩu chung: `123456`)

| Vai trò    | Email                        |
|------------|-------------------------------|
| Admin      | admin@medicare.vn             |
| Bác sĩ     | tranthib@medicare.vn          |
| Bệnh nhân  | nguyenvanan@gmail.com         |

(Trang đăng nhập có sẵn nút bấm nhanh để điền các tài khoản trên.)

## Cấu trúc thư mục

```
src/
├── mock/                 # Giả lập Back-end (in-memory), đúng contract API trong đồ án
│   ├── seedData.js        # Dữ liệu mẫu: bác sĩ, bệnh nhân, lịch hẹn, hồ sơ bệnh án...
│   └── mockApi.js         # Các hàm mô phỏng từng endpoint REST (login, CRUD, thống kê...)
├── services/             # Lớp service gọi mock API — thay bằng axios khi có Back-end thật
├── context/AuthContext.jsx
├── routes/               # ProtectedRoute, RoleRedirect
├── layouts/              # AuthLayout, AdminLayout, DoctorLayout, PatientLayout, DashboardShell
├── components/
│   ├── ui/                # Button, Card, Modal, Input/Select, Table, Badge, Tabs...
│   ├── common/             # Sidebar, Topbar, StatCard, ChatbotWidget
│   └── charts/             # TrendAreaChart, SimpleBarChart, DonutChart
├── pages/
│   ├── auth/               # Login, Register
│   ├── admin/              # Dashboard, Doctors, Appointments, Patients, Invoices, Statistics, Rooms
│   ├── doctor/             # Dashboard, Appointments (+ khám bệnh/kê đơn), Patients, Schedule
│   └── patient/            # Dashboard, Đặt lịch (stepper), Appointments, Records, Invoices, Profile
└── utils/                 # constants.js, formatters.js
```

## Kết nối Back-end thật

Toàn bộ dữ liệu hiện đang được mô phỏng trong `src/mock/mockApi.js` (không cần
Back-end vẫn chạy được đầy đủ chức năng). Khi Back-end (Node.js/Express +
MySQL) đã sẵn sàng theo đúng tài liệu đồ án:

1. Tạo file `src/services/httpClient.js` cấu hình `axios` với `baseURL` trỏ tới
   API thật, đính kèm JWT token vào header `Authorization`.
2. Trong từng file `src/services/*.js`, thay lời gọi hàm mock (`apiXxx`) bằng
   lời gọi `httpClient.get/post/put/delete(...)`.
3. Không cần sửa bất kỳ trang UI nào vì toàn bộ đã import qua lớp `services`.

## Điểm nhấn giao diện
- Thiết kế riêng: nền xanh bạc hà `#F4F7F5`, màu chủ đạo teal y tế `#0F5C56`,
  điểm nhấn vàng nghệ `#D9A441`.
- Sidebar tối màu theo từng vai trò, đồng bộ trên 3 layout.
- Luồng đặt lịch khám dạng stepper 4 bước (Chuyên khoa → Bác sĩ → Thời gian → Xác nhận).
- Luồng khám bệnh của bác sĩ: xác nhận → bắt đầu khám → ghi hồ sơ bệnh án → kê đơn thuốc → hoàn tất.
- Chatbot AI nổi góc màn hình (mô phỏng tính năng mở rộng "AI cục bộ qua Ollama" trong đồ án).
- Toàn bộ giao diện responsive, có trạng thái loading/empty/error rõ ràng.
