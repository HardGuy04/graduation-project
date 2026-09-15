import { HiOutlineViewGrid, HiOutlineCalendar, HiOutlinePlusCircle, HiOutlineDocumentText, HiOutlineCreditCard, HiOutlineUser } from "react-icons/hi";
import DashboardShell from "./DashboardShell";

const navItems = [
  { to: "/patient", end: true, label: "Tổng quan", icon: HiOutlineViewGrid },
  { to: "/patient/book", label: "Đặt lịch khám", icon: HiOutlinePlusCircle },
  { to: "/patient/appointments", label: "Lịch hẹn của tôi", icon: HiOutlineCalendar },
  { to: "/patient/records", label: "Lịch sử khám bệnh", icon: HiOutlineDocumentText },
  { to: "/patient/invoices", label: "Hóa đơn", icon: HiOutlineCreditCard },
  { to: "/patient/profile", label: "Hồ sơ cá nhân", icon: HiOutlineUser },
];

export default function PatientLayout() {
  return <DashboardShell navItems={navItems} roleLabel="Không gian Bệnh nhân" />;
}
