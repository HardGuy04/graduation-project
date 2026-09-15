import { HiOutlineViewGrid, HiOutlineCalendar, HiOutlineUserGroup, HiOutlineClock, HiOutlineUser } from "react-icons/hi";
import DashboardShell from "./DashboardShell";

const navItems = [
  { to: "/doctor", end: true, label: "Tổng quan", icon: HiOutlineViewGrid },
  { to: "/doctor/appointments", label: "Lịch hẹn của tôi", icon: HiOutlineCalendar },
  { to: "/doctor/patients", label: "Tra cứu bệnh nhân", icon: HiOutlineUserGroup },
  { to: "/doctor/schedule", label: "Lịch làm việc", icon: HiOutlineClock },
  { to: "/doctor/profile", label: "Hồ sơ cá nhân", icon: HiOutlineUser },
];

export default function DoctorLayout() {
  return <DashboardShell navItems={navItems} roleLabel="Không gian Bác sĩ" />;
}
