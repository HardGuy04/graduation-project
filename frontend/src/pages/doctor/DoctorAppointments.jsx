import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineArrowRight } from "react-icons/hi";
import Card from "../../components/ui/Card";
import Tabs from "../../components/ui/Tabs";
import { AppointmentStatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import { Input } from "../../components/ui/Field";
import { useAuth } from "../../context/AuthContext";
import { doctorService } from "../../services/doctorService";
import { formatDate } from "../../utils/formatters";

const TABS = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "completed", label: "Hoàn thành" },
];

export default function DoctorAppointments() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await doctorService.getMyAppointments(user.id, { status: status || undefined, date: date || undefined });
      setList(res.data);
      setLoading(false);
    })();
  }, [user.id, status, date]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs tabs={TABS} active={status} onChange={setStatus} />
        <Input type="date" className="max-w-[170px]" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {loading ? (
        <Spinner label="Đang tải lịch hẹn…" />
      ) : list.length === 0 ? (
        <EmptyState title="Không có lịch hẹn nào" />
      ) : (
        <div className="grid gap-3">
          {list.map((a) => (
            <Link to={`/doctor/appointments/${a.id}`} key={a.id}>
              <Card className="flex items-center justify-between gap-4 hover:border-teal-200 transition">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl2 bg-teal-50 text-teal-700">
                    <span className="text-sm font-bold leading-none">{a.startTime}</span>
                    <span className="text-[10px] mt-0.5 text-teal-500">{formatDate(a.date, { day: "2-digit", month: "2-digit" })}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{a.patientName}</p>
                    <p className="text-sm text-ink-faint truncate">{a.reason}</p>
                    <p className="text-xs text-ink-faint mt-0.5">SĐT: {a.patientPhone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <AppointmentStatusBadge status={a.status} />
                  <HiOutlineArrowRight className="h-4 w-4 text-slate-300" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
