import { HiOutlineViewGrid, HiOutlineCalendar, HiOutlinePlusCircle, HiOutlineCreditCard, HiOutlineUser } from "react-icons/hi";
import AppShell from "./AppShell";

const navItems = [
  { value: "overview", href: "/patient", end: true, label: "Tổng quan", icon: HiOutlineViewGrid },
  { value: "book", href: "/patient/book", label: "Đặt lịch", icon: HiOutlinePlusCircle },
  { value: "visits", href: "/patient/visits", label: "Lịch khám", icon: HiOutlineCalendar },
  { value: "invoices", href: "/patient/invoices", label: "Hóa đơn", icon: HiOutlineCreditCard },
  { value: "profile", href: "/patient/profile", label: "Hồ sơ", icon: HiOutlineUser },
];

export default function PatientLayout() {
  return <AppShell navItems={navItems} roleLabel="Bệnh nhân" profileHref="/patient/profile" />;
}
