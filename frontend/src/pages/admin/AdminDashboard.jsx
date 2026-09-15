import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineCalendar, HiOutlineUserGroup, HiOutlineCurrencyDollar, HiOutlineClipboardList, HiOutlineArrowRight } from "react-icons/hi";
import Card, { CardHeader } from "../../components/ui/Card";
import StatCard from "../../components/common/StatCard";
import TrendAreaChart from "../../components/charts/TrendAreaChart";
import { AppointmentStatusBadge } from "../../components/ui/StatusBadge";
import { Spinner } from "../../components/ui/Feedback";
import { adminService } from "../../services/adminService";
import { formatCurrency, formatDate } from "../../utils/formatters";

export default function AdminDashboard() {
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
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={HiOutlineCalendar} tone="teal" label="Lượt khám hôm nay" value={overview.totalVisitsToday} />
        <StatCard icon={HiOutlineUserGroup} tone="gold" label="Tổng bệnh nhân" value={overview.totalPatients} />
        <StatCard icon={HiOutlineCurrencyDollar} tone="leaf" label="Doanh thu đã thu" value={formatCurrency(overview.revenue)} />
        <StatCard icon={HiOutlineClipboardList} tone="clay" label="Lịch chờ xác nhận" value={overview.pendingCount} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Lượt khám theo ngày" subtitle="Số lịch hẹn ghi nhận trong hệ thống gần đây" />
          <TrendAreaChart data={trend} dataKey="total" color="#0F5C56" />
        </Card>

        <Card>
          <CardHeader
            title="Cần xử lý"
            subtitle="Việc lễ tân nên ưu tiên"
          />
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-gold-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">Lịch chờ xác nhận</p>
                <p className="text-xs text-ink-faint">Bệnh nhân đặt online</p>
              </div>
              <span className="text-xl font-extrabold text-gold-600">{overview.pendingCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-clay-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">Hóa đơn chưa thu</p>
                <p className="text-xs text-ink-faint">Cần đối soát thanh toán</p>
              </div>
              <span className="text-xl font-extrabold text-clay-500">{overview.unpaidCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-teal-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">Bác sĩ đang hoạt động</p>
                <p className="text-xs text-ink-faint">Sẵn sàng tiếp nhận lịch</p>
              </div>
              <span className="text-xl font-extrabold text-teal-600">{overview.totalDoctors}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card padded={false}>
        <div className="flex items-center justify-between px-6 pt-6">
          <CardHeader title="Lịch hẹn gần đây" className="mb-4" />
          <Link to="/admin/appointments" className="flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700 mb-4">
            Xem tất cả <HiOutlineArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="divide-y divide-slate-100 px-2 pb-2">
          {recent.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div className="min-w-0">
                <p className="font-semibold text-ink truncate">{a.patientName}</p>
                <p className="text-xs text-ink-faint truncate">
                  {a.doctorName} · {a.doctorSpecialty} · {formatDate(a.date)} {a.startTime}
                </p>
              </div>
              <AppointmentStatusBadge status={a.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
