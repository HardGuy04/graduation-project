import {
  HiOutlineViewGrid, HiOutlineUserGroup, HiOutlineCalendar, HiOutlineClipboardList,
  HiOutlineCreditCard, HiOutlineChartBar, HiOutlineOfficeBuilding, HiOutlineCurrencyDollar, HiOutlineUser,
} from "react-icons/hi";
import DashboardShell from "./DashboardShell";

const navItems = [
  { to: "/admin", end: true, label: "Tổng quan", icon: HiOutlineViewGrid },
  { to: "/admin/appointments", label: "Lịch hẹn", icon: HiOutlineCalendar },
  { to: "/admin/doctors", label: "Bác sĩ", icon: HiOutlineUserGroup },
  { to: "/admin/patients", label: "Bệnh nhân", icon: HiOutlineClipboardList },
  { to: "/admin/invoices", label: "Hóa đơn", icon: HiOutlineCreditCard },
  { to: "/admin/salary", label: "Lương bác sĩ", icon: HiOutlineCurrencyDollar },
  { to: "/admin/statistics", label: "Thống kê", icon: HiOutlineChartBar },
  { to: "/admin/rooms", label: "Phòng khám", icon: HiOutlineOfficeBuilding },
  { to: "/admin/profile", label: "Hồ sơ cá nhân", icon: HiOutlineUser },
];

export default function AdminLayout() {
  return <DashboardShell navItems={navItems} roleLabel="Không gian Quản trị viên" />;
}
