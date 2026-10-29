import {
  HiOutlineViewGrid, HiOutlineUserGroup, HiOutlineCalendar, HiOutlineClipboardList,
  HiOutlineCreditCard, HiOutlineChartBar, HiOutlineOfficeBuilding, HiOutlineCurrencyDollar, HiOutlineUser,
} from "react-icons/hi";
import AppShell from "./AppShell";

const navItems = [
  { value: "overview", href: "/admin", end: true, label: "Tổng quan", icon: HiOutlineViewGrid },
  { value: "appointments", href: "/admin/appointments", label: "Lịch hẹn", icon: HiOutlineCalendar },
  { value: "doctors", href: "/admin/doctors", label: "Bác sĩ", icon: HiOutlineUserGroup },
  { value: "patients", href: "/admin/patients", label: "Bệnh nhân", icon: HiOutlineClipboardList },
  { value: "invoices", href: "/admin/invoices", label: "Hóa đơn", icon: HiOutlineCreditCard },
  { value: "salary", href: "/admin/salary", label: "Lương", icon: HiOutlineCurrencyDollar },
  { value: "statistics", href: "/admin/statistics", label: "Thống kê", icon: HiOutlineChartBar },
  { value: "rooms", href: "/admin/rooms", label: "Phòng khám", icon: HiOutlineOfficeBuilding },
  { value: "profile", href: "/admin/profile", label: "Hồ sơ cá nhân", icon: HiOutlineUser, tab: false },
];

export default function AdminLayout() {
  return <AppShell navItems={navItems} roleLabel="Quản trị viên" profileHref="/admin/profile" routeHeader navBreakpoint="xl" />;
}
