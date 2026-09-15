import { useEffect, useState } from "react";
import Card, { CardHeader } from "../../components/ui/Card";
import TrendAreaChart from "../../components/charts/TrendAreaChart";
import SimpleBarChart from "../../components/charts/SimpleBarChart";
import DonutChart from "../../components/charts/DonutChart";
import { Spinner } from "../../components/ui/Feedback";
import { adminService } from "../../services/adminService";
import { commonService } from "../../services/commonService";
import { formatCurrency } from "../../utils/formatters";

export default function AdminStatistics() {
  const [loading, setLoading] = useState(true);
  const [appointmentsTrend, setAppointmentsTrend] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [byDoctor, setByDoctor] = useState([]);
  const [specialties, setSpecialties] = useState([]);

  useEffect(() => {
    (async () => {
      const [a, r, d, s] = await Promise.all([
        adminService.getStatsAppointments(),
        adminService.getStatsRevenue(),
        adminService.getStatsByDoctor(),
        commonService.getSpecialties(),
      ]);
      setAppointmentsTrend(a.data);
      setRevenueTrend(r.data);
      setByDoctor(d.data.map((x) => ({ name: x.doctorName.replace(/^(BS\.?\s?(CKI|CKII)?\.?)/i, "").trim(), value: x.totalAppointments })));
      setSpecialties(s.data.map((x) => ({ name: x.name, value: x.doctorCount || 1 })));
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner label="Đang tổng hợp số liệu thống kê…" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Số lượt khám theo ngày" subtitle="Tổng số lịch hẹn ghi nhận" />
          <TrendAreaChart data={appointmentsTrend} dataKey="total" color="#0F5C56" />
        </Card>
        <Card>
          <CardHeader title="Doanh thu theo ngày" subtitle="Tổng tiền đã thanh toán" />
          <TrendAreaChart data={revenueTrend} dataKey="revenue" color="#D9A441" valueFormatter={formatCurrency} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Số lượt khám theo bác sĩ" subtitle="Tổng số lịch hẹn mỗi bác sĩ đã tiếp nhận" />
          <SimpleBarChart data={byDoctor} dataKey="value" xKey="name" />
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Phân bổ bác sĩ theo chuyên khoa" />
          <DonutChart data={specialties} />
        </Card>
      </div>
    </div>
  );
}
