import { HiOutlineViewGrid, HiOutlineCalendar, HiOutlineUserGroup, HiOutlineClock, HiOutlineUser } from "react-icons/hi";
import AppShell from "./AppShell";

const navItems = [
  { value: "overview", href: "/doctor", end: true, label: "Tổng quan", icon: HiOutlineViewGrid },
  { value: "appointments", href: "/doctor/appointments", label: "Lịch hẹn", icon: HiOutlineCalendar },
  { value: "patients", href: "/doctor/patients", label: "Bệnh nhân", icon: HiOutlineUserGroup },
  { value: "schedule", href: "/doctor/schedule", label: "Lịch làm việc", icon: HiOutlineClock },
  { value: "profile", href: "/doctor/profile", label: "Hồ sơ", icon: HiOutlineUser },
];

export default function DoctorLayout() {
  return <AppShell navItems={navItems} roleLabel="Bác sĩ" profileHref="/doctor/profile" />;
}
