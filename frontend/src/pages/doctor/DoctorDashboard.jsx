import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineCalendar, HiOutlineClipboardCheck, HiOutlineClock, HiOutlineArrowRight, HiOutlineChevronRight } from "react-icons/hi";
import { Button } from "@/components/kit/button";
import { Card, CardHeader, TimeChip } from "../../components/app/Surface";
import { AppointmentBadge } from "../../components/app/Badge";
import { StatTile } from "../../components/app/StatTile";
import { Empty, Loading } from "../../components/app/Feedback";
import { useAuth } from "../../context/AuthContext";
import { doctorService } from "../../services/doctorService";
import { formatDateLong } from "../../utils/formatters";

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

  if (loading) return <Loading label="Đang tải lịch làm việc…" />;

  const pending = all.filter((a) => a.status === "pending").length;
  const completed = all.filter((a) => a.status === "completed").length;
  const next = today.find((a) => ["confirmed", "in_progress", "pending"].includes(a.status));

  return (
    <div className="space-y-8">
      <section className="relative grid gap-8 overflow-hidden rounded-card bg-banner p-6 text-foreground sm:p-10 lg:grid-cols-[1fr_340px] lg:items-center">
        <div aria-hidden className="pointer-events-none absolute -bottom-40 right-24 h-80 w-80 rounded-full border border-accent/15" />
        <div className="relative">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{formatDateLong(new Date().toISOString())}</p>
          <h1 className="text-display-md sm:text-display-lg">Chào bác sĩ {user.fullName?.split(" ").slice(-1)[0]}.</h1>
          <p className="mt-3 max-w-lg text-[15px] text-muted-foreground">
            Hôm nay bạn có {today.length} lịch hẹn{pending ? `, ${pending} lịch đang chờ xác nhận` : ""}.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/doctor/appointments">Mở lịch hẹn</Link></Button>
            <Button asChild variant="frost" size="lg"><Link to="/doctor/schedule">Lịch làm việc</Link></Button>
          </div>
        </div>
        {next && (
            <div className="relative rounded-card bg-card p-5 shadow-[0_16px_40px_-20px_rgba(78,99,90,0.35)]">
              <div className="mb-4 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Bệnh nhân tiếp theo</p>
                <AppointmentBadge status={next.status} />
              </div>
              <div className="flex items-center gap-3.5">
                <TimeChip time={next.startTime} />
                <p className="min-w-0 truncate font-semibold">{next.patientName}</p>
              </div>
              <p className="mt-4 rounded-field bg-tile px-3.5 py-3 text-sm text-muted-foreground">Lý do: {next.reason || "Chưa ghi lý do"}</p>
              <Button asChild variant="accent" className="mt-4 w-full">
                <Link to={`/doctor/appointments/${next.id}`}>Mở hồ sơ <HiOutlineArrowRight /></Link>
              </Button>
            </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile className="h-full" icon={HiOutlineCalendar} label="Lịch hẹn hôm nay" value={today.length} />
          <StatTile className="h-full" icon={HiOutlineClock} label="Đang chờ xác nhận" value={pending} />
          <StatTile className="h-full" icon={HiOutlineClipboardCheck} label="Đã hoàn thành khám" value={completed} />
      </div>

      <Card>
        <CardHeader
          title="Lịch hẹn hôm nay"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/doctor/appointments">Xem tất cả <HiOutlineArrowRight /></Link>
            </Button>
          }
        />
        {today.length === 0 ? (
          <Empty icon={HiOutlineCalendar} title="Hôm nay bạn chưa có lịch hẹn nào" />
        ) : (
          <ul className="-mx-2 divide-y divide-border">
            {today.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/doctor/appointments/${a.id}`}
                  className="flex items-center gap-4 rounded-tile px-2 py-3 transition-colors hover:bg-tile"
                >
                  <TimeChip time={a.startTime} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.patientName}</p>
                    <p className="truncate text-sm text-muted-foreground">{a.reason || "—"}</p>
                  </div>
                  <AppointmentBadge status={a.status} />
                  <HiOutlineChevronRight aria-hidden className="h-5 w-5 shrink-0 text-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
