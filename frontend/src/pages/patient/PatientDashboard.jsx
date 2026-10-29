import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineCalendar, HiOutlineCreditCard, HiOutlinePlus, HiOutlineArrowRight, HiOutlineClipboardList } from "react-icons/hi";
import { Button } from "@/components/kit/button";
import { Card, CardHeader, TimeChip } from "../../components/app/Surface";
import { AppointmentBadge, Badge } from "../../components/app/Badge";
import { StatTile } from "../../components/app/StatTile";
import { Empty, Loading } from "../../components/app/Feedback";
import { useAuth } from "../../context/AuthContext";
import { patientService } from "../../services/patientService";
import { formatCurrency, formatDate } from "../../utils/formatters";

const weekday = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("vi-VN", { weekday: "long" });

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

  if (loading) return <Loading label="Đang tải thông tin của bạn…" />;

  const upcoming = appointments
    .filter((a) => ["pending", "confirmed"].includes(a.status))
    .sort((x, y) => `${x.date} ${x.startTime}`.localeCompare(`${y.date} ${y.startTime}`))
    .slice(0, 3);
  const next = upcoming[0];
  const unpaid = invoices.filter((i) => i.status === "unpaid");
  const unpaidTotal = unpaid.reduce((s, i) => s + i.amount, 0);
  const completed = appointments.filter((a) => a.status === "completed").length;
  const firstName = user.fullName?.split(" ").slice(-1)[0];

  return (
    <div className="space-y-8">
      <section className="relative grid gap-8 overflow-hidden rounded-card bg-banner px-6 py-9 text-tertiary sm:px-9 sm:py-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center lg:gap-12">
        <div aria-hidden className="pointer-events-none absolute -left-20 -top-28 h-72 w-72 rounded-full bg-white/25" />
        <div aria-hidden className="pointer-events-none absolute -bottom-44 -right-24 h-96 w-96 rounded-full border border-white/60" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -right-8 h-64 w-64 rounded-full border border-white/40" />

        <div className="relative">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold leading-none">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
            {upcoming.length > 0 ? `${upcoming.length} lịch hẹn sắp tới` : "Chưa có lịch hẹn"}
          </span>
          <h1 className="max-w-xl text-[2rem] font-semibold leading-[1.15] tracking-[-0.02em] sm:text-[2.5rem]">
            Xin chào, {firstName}.<br />
            Sức khỏe của bạn, gọn trong một nơi.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Theo dõi lịch khám, hồ sơ bệnh án và hóa đơn của bạn ở một nơi.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-tertiary hover:bg-tertiary/90">
              <Link to="/patient/book"><HiOutlinePlus /> Đặt lịch khám mới</Link>
            </Button>
            <Button asChild variant="frost" size="lg">
              <Link to="/patient/visits">Xem lịch khám</Link>
            </Button>
          </div>
        </div>

        {next && (
          <div className="relative rounded-card bg-card p-5 shadow-[0_16px_40px_-20px_rgba(78,99,90,0.35)]">
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Lịch khám kế tiếp</p>
              <AppointmentBadge status={next.status} />
            </div>
            <div className="flex items-center gap-3">
              <TimeChip time={next.startTime} date={formatDate(next.date, { day: "2-digit", month: "2-digit" })} className="bg-tertiary" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{next.doctorName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {next.doctorSpecialty} · <span className="capitalize">{weekday(next.date)}</span>
                </p>
              </div>
            </div>
            {next.reason && (
              <p className="mt-4 rounded-field bg-tile px-3.5 py-3 text-sm text-muted-foreground">Lý do: {next.reason}</p>
            )}
            <Button asChild variant="accent" className="mt-4 w-full">
              <Link to="/patient/visits?tab=appointments">Xem chi tiết</Link>
            </Button>
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile className="h-full" icon={HiOutlineCalendar} label="Lịch hẹn sắp tới" value={upcoming.length} />
        <StatTile className="h-full" icon={HiOutlineClipboardList} label="Lần khám đã hoàn thành" value={completed} />
        <StatTile className="h-full" icon={HiOutlineCreditCard} label="Cần thanh toán" value={formatCurrency(unpaidTotal)} hint={`${unpaid.length} hóa đơn`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Lịch hẹn sắp tới"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/patient/visits?tab=appointments">Xem tất cả <HiOutlineArrowRight /></Link>
              </Button>
            }
          />
          {upcoming.length === 0 ? (
            <Empty icon={HiOutlineCalendar} title="Chưa có lịch hẹn nào" description="Đặt lịch khám để được bác sĩ tư vấn." />
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((a) => (
                <li key={a.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                  <TimeChip time={a.startTime} date={formatDate(a.date, { day: "2-digit", month: "2-digit" })} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.doctorName}</p>
                    <p className="truncate text-sm text-muted-foreground">{a.doctorSpecialty}</p>
                  </div>
                  <AppointmentBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Hóa đơn chưa thanh toán"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/patient/invoices">Xem tất cả <HiOutlineArrowRight /></Link>
              </Button>
            }
          />
          {unpaid.length === 0 ? (
            <Empty icon={HiOutlineCreditCard} title="Không có hóa đơn nào cần thanh toán" />
          ) : (
            <ul className="divide-y divide-border">
              {unpaid.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-semibold">Hóa đơn #{inv.id}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(inv.createdAt)}</p>
                  </div>
                  <span className="font-bold tabular-nums">{formatCurrency(inv.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
