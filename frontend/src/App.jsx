import { createBrowserRouter, RouterProvider } from "react-router-dom";

import AuthLayout from "./layouts/AuthLayout";
import AdminLayout from "./layouts/AdminLayout";
import DoctorLayout from "./layouts/DoctorLayout";
import PatientLayout from "./layouts/PatientLayout";

import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRedirect from "./routes/RoleRedirect";
import NotFound from "./pages/NotFound";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDoctors from "./pages/admin/AdminDoctors";
import AdminDoctorDetail from "./pages/admin/AdminDoctorDetail";
import AdminAppointments from "./pages/admin/AdminAppointments";
import AdminPatients from "./pages/admin/AdminPatients";
import AdminPatientDetail from "./pages/admin/AdminPatientDetail";
import AdminInvoices from "./pages/admin/AdminInvoices";
import AdminSalaryStatistics from "./pages/admin/AdminSalaryStatistics";
import AdminStatistics from "./pages/admin/AdminStatistics";
import AdminRooms from "./pages/admin/AdminRooms";
import AdminProfile from "./pages/admin/AdminProfile";

import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorAppointments from "./pages/doctor/DoctorAppointments";
import DoctorAppointmentDetail from "./pages/doctor/DoctorAppointmentDetail";
import DoctorPatients from "./pages/doctor/DoctorPatients";
import DoctorSchedule from "./pages/doctor/DoctorSchedule";
import DoctorProfile from "./pages/doctor/DoctorProfile";

import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientBookAppointment from "./pages/patient/PatientBookAppointment";
import PatientAppointments from "./pages/patient/PatientAppointments";
import PatientRecords from "./pages/patient/PatientRecords";
import PatientInvoices from "./pages/patient/PatientInvoices";
import PatientProfile from "./pages/patient/PatientProfile";

const router = createBrowserRouter([
  { path: "/", element: <RoleRedirect /> },
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
    ],
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute roles={["admin"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboard />, handle: { title: "Tổng quan", subtitle: "Toàn cảnh hoạt động phòng khám hôm nay" } },
      { path: "appointments", element: <AdminAppointments />, handle: { title: "Lịch hẹn", subtitle: "Quản lý và xử lý lịch hẹn của bệnh nhân" } },
      { path: "doctors", element: <AdminDoctors />, handle: { title: "Bác sĩ", subtitle: "Quản lý danh sách bác sĩ trong hệ thống" } },
      { path: "doctors/:id", element: <AdminDoctorDetail />, handle: { title: "Chi tiết bác sĩ" } },
      { path: "patients", element: <AdminPatients />, handle: { title: "Bệnh nhân", subtitle: "Danh sách bệnh nhân đã đăng ký" } },
      { path: "patients/:id", element: <AdminPatientDetail />, handle: { title: "Hồ sơ bệnh nhân" } },
      { path: "invoices", element: <AdminInvoices />, handle: { title: "Hóa đơn", subtitle: "Theo dõi thanh toán của bệnh nhân" } },
      { path: "salary", element: <AdminSalaryStatistics />, handle: { title: "Lương bác sĩ", subtitle: "Thống kê chi trả lương hàng tháng theo bác sĩ" } },
      { path: "statistics", element: <AdminStatistics />, handle: { title: "Thống kê", subtitle: "Báo cáo hoạt động và doanh thu" } },
      { path: "rooms", element: <AdminRooms />, handle: { title: "Phòng khám", subtitle: "Trạng thái sử dụng các phòng khám" } },
      { path: "profile", element: <AdminProfile />, handle: { title: "Hồ sơ cá nhân" } },
    ],
  },
  {
    path: "/doctor",
    element: (
      <ProtectedRoute roles={["doctor"]}>
        <DoctorLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DoctorDashboard />, handle: { title: "Tổng quan", subtitle: "Lịch làm việc và công việc hôm nay" } },
      { path: "appointments", element: <DoctorAppointments />, handle: { title: "Lịch hẹn của tôi" } },
      { path: "appointments/:id", element: <DoctorAppointmentDetail />, handle: { title: "Chi tiết lịch hẹn" } },
      { path: "patients", element: <DoctorPatients />, handle: { title: "Tra cứu bệnh nhân", subtitle: "Xem lịch sử khám của bệnh nhân bạn phụ trách" } },
      { path: "schedule", element: <DoctorSchedule />, handle: { title: "Lịch làm việc" } },
      { path: "profile", element: <DoctorProfile />, handle: { title: "Hồ sơ cá nhân" } },
    ],
  },
  {
    path: "/patient",
    element: (
      <ProtectedRoute roles={["patient"]}>
        <PatientLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <PatientDashboard />, handle: { title: "Tổng quan", subtitle: "Theo dõi lịch khám và sức khỏe của bạn" } },
      { path: "book", element: <PatientBookAppointment />, handle: { title: "Đặt lịch khám" } },
      { path: "appointments", element: <PatientAppointments />, handle: { title: "Lịch hẹn của tôi" } },
      { path: "records", element: <PatientRecords />, handle: { title: "Lịch sử khám bệnh" } },
      { path: "invoices", element: <PatientInvoices />, handle: { title: "Hóa đơn" } },
      { path: "profile", element: <PatientProfile />, handle: { title: "Hồ sơ cá nhân" } },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
