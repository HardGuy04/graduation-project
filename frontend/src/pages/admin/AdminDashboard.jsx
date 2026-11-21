import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineCalendar, HiOutlineUserGroup, HiOutlineCurrencyDollar, HiOutlineClipboardList, HiOutlineArrowRight } from "react-icons/hi";
import Card, { CardHeader } from "../../components/ui/Card";
import StatCard from "../../components/common/StatCard";
import TrendAreaChart from "../../components/charts/TrendAreaChart";
import { AppointmentStatusBadge } from "../../components/ui/StatusBadge";
import { Spinner } from "../../components/ui/Feedback";
import { Button } from "@/components/kit/button";
import { TimeChip } from "../../components/app/Surface";
import { useAuth } from "../../context/AuthContext";
import { adminService } from "../../services/adminService";
import { formatCurrency, formatDate, formatDateLong } from "../../utils/formatters";

export default function AdminDashboard() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(" ").slice(-1)[0] || "bạn";
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    (async () => {
      const [ov, tr, apps] = await Promise.all([
        adminService.getStatsOverview(),
        adminService.getStatsAppointments(),
        adminService.getAppointments(),
      ]);
      setOverview(ov.data);
      setTrend(tr.data);
      setRecent(apps.data.slice(0, 6));
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner label="Đang tải dữ liệu tổng quan…" />;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-card bg-banner px-6 py-9 text-tertiary sm:px-9 sm:py-10">
        <div aria-hidden className="pointer-events-none absolute -left-20 -top-28 h-72 w-72 rounded-full bg-white/25" />
        <div aria-hidden className="pointer-events-none absolute -bottom-44 -right-24 h-96 w-96 rounded-full border border-white/60" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -right-8 h-64 w-64 rounded-full border border-white/40" />
        <div className="relative">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold leading-none">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
            {formatDateLong(new Date().toISOString())}
          </span>
          <h1 className="max-w-2xl text-[2rem] font-semibold leading-[1.15] tracking-[-0.02em] sm:text-[2.5rem]">
            Chào {firstName}.<br />
            Toàn cảnh phòng khám hôm nay.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            {overview.pendingCount > 0
              ? `Có ${overview.pendingCount} lịch hẹn đang chờ xác nhận và ${overview.unpaidCount} hóa đơn chưa thu.`
              : "Không có lịch hẹn nào đang chờ xác nhận."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-tertiary hover:bg-tertiary/90">
              <Link to="/admin/appointments">Xử lý lịch hẹn</Link>
            </Button>
            <Button asChild variant="frost" size="lg">
              <Link to="/admin/invoices">Xem hóa đơn</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={HiOutlineCalendar} tone="teal" label="Lượt khám hôm nay" value={overview.totalVisitsToday} />
        <StatCard icon={HiOutlineUserGroup} tone="gold" label="Tổng bệnh nhân" value={overview.totalPatients} />
        <StatCard icon={HiOutlineCurrencyDollar} tone="leaf" label="Doanh thu đã thu" value={formatCurrency(overview.revenue)} />
        <StatCard icon={HiOutlineClipboardList} tone="clay" label="Lịch chờ xác nhận" value={overview.pendingCount} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Lượt khám theo ngày" subtitle="Số lịch hẹn ghi nhận trong hệ thống gần đây" />
          <TrendAreaChart data={trend} dataKey="total" />
        </Card>

        <Card>
          <CardHeader title="Cần xử lý" subtitle="Việc lễ tân nên ưu tiên" />
          <ul className="space-y-2.5">
            {[
              { label: "Lịch chờ xác nhận", hint: "Bệnh nhân đặt online", value: overview.pendingCount, href: "/admin/appointments", tone: "bg-sky text-lavender-ink" },
              { label: "Hóa đơn chưa thu", hint: "Cần đối soát thanh toán", value: overview.unpaidCount, href: "/admin/invoices", tone: "bg-destructive-soft text-destructive" },
              { label: "Bác sĩ đang hoạt động", hint: "Sẵn sàng tiếp nhận lịch", value: overview.totalDoctors, href: "/admin/doctors", tone: "bg-accent-soft text-accent" },
            ].map((row) => (
              <li key={row.label}>
                <Link
                  to={row.href}
                  className="flex items-center justify-between gap-3 rounded-tile bg-tile/60 px-4 py-3 transition-colors hover:bg-tile focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span>
                    <span className="block text-sm font-semibold">{row.label}</span>
                    <span className="block text-xs text-muted-foreground">{row.hint}</span>
                  </span>
                  <span className={`flex h-10 min-w-10 items-center justify-center rounded-field px-2 text-lg font-bold tabular-nums ${row.tone}`}>{row.value}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Lịch hẹn gần đây"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/appointments">Xem tất cả <HiOutlineArrowRight /></Link>
            </Button>
          }
        />
        <ul className="space-y-2">
          {recent.map((a) => (
            <li key={a.id} className="flex items-center gap-4 rounded-tile border border-border p-3 transition-colors hover:border-accent/50">
              <TimeChip time={a.startTime} date={formatDate(a.date, { day: "2-digit", month: "2-digit" })} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{a.patientName}</p>
                <p className="truncate text-sm text-muted-foreground">{a.doctorName} · {a.doctorSpecialty}</p>
              </div>
              <AppointmentStatusBadge status={a.status} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
