import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineCalendar, HiOutlineCreditCard, HiOutlineDocumentText, HiOutlinePlusCircle, HiOutlineArrowRight } from "react-icons/hi";
import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { AppointmentStatusBadge, InvoiceStatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import { useAuth } from "../../context/AuthContext";
import { patientService } from "../../services/patientService";
import { formatCurrency, formatDate } from "../../utils/formatters";

export default function PatientDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    (async () => {
      const [a, i] = await Promise.all([patientService.getMyAppointments(user.id), patientService.getInvoices(user.id)]);
      setAppointments(a.data);
      setInvoices(i.data);
      setLoading(false);
    })();
  }, [user.id]);

  if (loading) return <Spinner label="Đang tải thông tin của bạn…" />;

  const upcoming = appointments.filter((a) => ["pending", "confirmed"].includes(a.status)).slice(0, 3);
  const unpaid = invoices.filter((i) => i.status === "unpaid");

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="bg-teal-700 border-none text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold font-display">Xin chào, {user.fullName.split(" ").slice(-1)[0]}! 👋</h2>
          <p className="text-teal-100 text-sm mt-1">Bạn có {upcoming.length} lịch hẹn sắp tới và {unpaid.length} hóa đơn chưa thanh toán.</p>
        </div>
        <Link to="/patient/book">
          <Button variant="gold" size="lg"><HiOutlinePlusCircle className="h-5 w-5" /> Đặt lịch khám mới</Button>
        </Link>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padded={false}>
          <div className="flex items-center justify-between px-6 pt-6 mb-3">
            <h3 className="text-lg font-bold text-ink font-display">Lịch hẹn sắp tới</h3>
            <Link to="/patient/appointments" className="flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700">
              Xem tất cả <HiOutlineArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="px-6 pb-6"><EmptyState icon={HiOutlineCalendar} title="Chưa có lịch hẹn nào" description="Đặt lịch khám ngay để được bác sĩ tư vấn." /></div>
          ) : (
            <div className="divide-y divide-slate-100 px-2 pb-2">
              {upcoming.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{a.doctorName}</p>
                    <p className="text-xs text-ink-faint truncate">{a.doctorSpecialty} · {formatDate(a.date)} lúc {a.startTime}</p>
                  </div>
                  <AppointmentStatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padded={false}>
          <div className="flex items-center justify-between px-6 pt-6 mb-3">
            <h3 className="text-lg font-bold text-ink font-display">Hóa đơn chưa thanh toán</h3>
            <Link to="/patient/invoices" className="flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700">
              Xem tất cả <HiOutlineArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {unpaid.length === 0 ? (
            <div className="px-6 pb-6"><EmptyState icon={HiOutlineCreditCard} title="Không có hóa đơn nào cần thanh toán" /></div>
          ) : (
            <div className="divide-y divide-slate-100 px-2 pb-2">
              {unpaid.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div>
                    <p className="font-semibold text-ink">Hóa đơn #{inv.id}</p>
                    <p className="text-xs text-ink-faint">{formatDate(inv.createdAt)}</p>
                  </div>
                  <span className="font-bold text-gold-600">{formatCurrency(inv.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
