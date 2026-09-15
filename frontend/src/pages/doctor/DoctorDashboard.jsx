import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineCalendar, HiOutlineClipboardCheck, HiOutlineClock, HiOutlineArrowRight } from "react-icons/hi";
import Card, { CardHeader } from "../../components/ui/Card";
import StatCard from "../../components/common/StatCard";
import { AppointmentStatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import { useAuth } from "../../context/AuthContext";
import { doctorService } from "../../services/doctorService";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState([]);
  const [all, setAll] = useState([]);

  useEffect(() => {
    (async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const [t, a] = await Promise.all([
        doctorService.getMyAppointments(user.id, { date: todayStr }),
        doctorService.getMyAppointments(user.id),
      ]);
      setToday(t.data);
      setAll(a.data);
      setLoading(false);
    })();
  }, [user.id]);

  if (loading) return <Spinner label="Đang tải lịch làm việc…" />;

  const pending = all.filter((a) => a.status === "pending").length;
  const completed = all.filter((a) => a.status === "completed").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={HiOutlineCalendar} tone="teal" label="Lịch hẹn hôm nay" value={today.length} />
        <StatCard icon={HiOutlineClock} tone="gold" label="Đang chờ xác nhận" value={pending} />
        <StatCard icon={HiOutlineClipboardCheck} tone="leaf" label="Đã hoàn thành khám" value={completed} />
      </div>

      <Card padded={false}>
        <div className="flex items-center justify-between px-6 pt-6 mb-1">
          <h3 className="text-lg font-bold text-ink font-display">Lịch hẹn hôm nay</h3>
          <Link to="/doctor/appointments" className="flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700">
            Xem tất cả <HiOutlineArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {today.length === 0 ? (
          <div className="p-6"><EmptyState title="Hôm nay bạn chưa có lịch hẹn nào" /></div>
        ) : (
          <div className="divide-y divide-slate-100 px-2 pb-2 mt-3">
            {today.map((a) => (
              <Link to={`/doctor/appointments/${a.id}`} key={a.id} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-slate-50 rounded-lg transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl2 bg-teal-50 text-teal-700">
                    <span className="text-sm font-bold leading-none">{a.startTime}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{a.patientName}</p>
                    <p className="text-xs text-ink-faint truncate">{a.reason}</p>
                  </div>
                </div>
                <AppointmentStatusBadge status={a.status} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
