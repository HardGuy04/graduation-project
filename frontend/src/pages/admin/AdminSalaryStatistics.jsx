import { useEffect, useMemo, useState } from "react";
import { HiOutlineCurrencyDollar, HiOutlineUserGroup, HiOutlineTrendingUp } from "react-icons/hi";
import Card, { CardHeader } from "../../components/ui/Card";
import StatCard from "../../components/common/StatCard";
import TrendAreaChart from "../../components/charts/TrendAreaChart";
import SimpleBarChart from "../../components/charts/SimpleBarChart";
import { Select } from "../../components/ui/Field";
import { TableShell, Th, Td, Tr } from "../../components/ui/Table";
import { Spinner, EmptyState } from "../../components/ui/Feedback";
import Avatar from "../../components/ui/Avatar";
import { adminService } from "../../services/adminService";
import { formatCurrency } from "../../utils/formatters";

function monthLabel(m) {
  const [y, mo] = m.split("-");
  return `Tháng ${mo}/${y}`;
}

export default function AdminSalaryStatistics() {
  const [loading, setLoading] = useState(true);
  const [incomes, setIncomes] = useState([]);
  const [month, setMonth] = useState("");

  useEffect(() => {
    (async () => {
      const res = await adminService.getSalaryStats();
      setIncomes(res.data);
      const months = res.data[0]?.monthly?.map((m) => m.month) || [];
      setMonth(months[months.length - 1] || "");
      setLoading(false);
    })();
  }, []);

  const months = incomes[0]?.monthly?.map((m) => m.month) || [];

  const rowsForMonth = useMemo(() => {
    return incomes
      .map((inc) => {
        const m = inc.monthly.find((x) => x.month === month);
        return m ? { doctorId: inc.doctorId, doctorName: inc.doctorName, ...m } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.received - a.received);
  }, [incomes, month]);

  const payrollTrend = useMemo(() => {
    return months.map((m) => ({
      date: m,
      received: incomes.reduce((sum, inc) => sum + (inc.monthly.find((x) => x.month === m)?.received || 0), 0),
    }));
  }, [incomes, months]);

  if (loading) return <Spinner label="Đang tổng hợp dữ liệu lương…" />;
  if (incomes.length === 0) return <EmptyState title="Chưa có dữ liệu lương" />;

  const totalThisMonth = rowsForMonth.reduce((s, r) => s + r.received, 0);
  const avgThisMonth = rowsForMonth.length ? Math.round(totalThisMonth / rowsForMonth.length) : 0;
  const totalDayoffThisMonth = rowsForMonth.reduce((s, r) => s + r.dayoff, 0);
  const prevIdx = months.indexOf(month) - 1;
  const totalPrevMonth = prevIdx >= 0
    ? incomes.reduce((sum, inc) => sum + (inc.monthly.find((x) => x.month === months[prevIdx])?.received || 0), 0)
    : null;
  const growth = totalPrevMonth ? Math.round(((totalThisMonth - totalPrevMonth) / totalPrevMonth) * 100) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-faint">
          Dữ liệu tổng hợp từ bảng lương (income) · ngày nghỉ (dayoff) được tính lại theo từng tháng, tự động về 0 khi sang tháng mới
        </p>
        <Select className="max-w-[190px] shrink-0" value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={HiOutlineCurrencyDollar} tone="teal" label={`Tổng chi lương — ${monthLabel(month)}`} value={formatCurrency(totalThisMonth)} trend={growth} trendLabel="so với tháng trước" />
        <StatCard icon={HiOutlineUserGroup} tone="gold" label="Lương trung bình / bác sĩ" value={formatCurrency(avgThisMonth)} />
        <StatCard icon={HiOutlineTrendingUp} tone="clay" label="Tổng ngày nghỉ trong tháng" value={`${totalDayoffThisMonth} ngày`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Xu hướng tổng quỹ lương" subtitle="Tổng thực nhận toàn bộ bác sĩ theo từng tháng" />
          <TrendAreaChart data={payrollTrend} dataKey="received" color="#D9A441" valueFormatter={formatCurrency} xKey="date" />
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Lương theo bác sĩ" subtitle={monthLabel(month)} />
          <SimpleBarChart
            data={rowsForMonth.map((r) => ({ name: r.doctorName.replace(/^(BS\.?\s?(CKI|CKII)?\.?)/i, "").trim(), value: r.received }))}
          />
        </Card>
      </div>

      <Card padded={false}>
        <div className="px-6 pt-6"><CardHeader title="Bảng chi tiết lương" subtitle={`${monthLabel(month)} · lương cơ bản quy đổi theo ${26} ngày công chuẩn`} /></div>
        <div className="px-2 pb-2">
          <TableShell>
            <thead>
              <tr>
                <Th>Bác sĩ</Th><Th>Lương cơ bản</Th><Th>Ngày công</Th><Th>Ngày nghỉ</Th><Th>Thưởng</Th><Th>Thực nhận</Th>
              </tr>
            </thead>
            <tbody>
              {rowsForMonth.map((r) => (
                <Tr key={r.doctorId}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={r.doctorName} size="sm" />
                      <span className="font-semibold">{r.doctorName}</span>
                    </div>
                  </Td>
                  <Td>{formatCurrency(r.baseSalary)}</Td>
                  <Td>{r.dayon}/26</Td>
                  <Td className={r.dayoff > 0 ? "text-clay-500 font-semibold" : "text-ink-faint"}>{r.dayoff}</Td>
                  <Td className="text-leaf-600 font-medium">+{formatCurrency(r.bonus)}</Td>
                  <Td className="font-bold text-ink">{formatCurrency(r.received)}</Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
        </div>
      </Card>
    </div>
  );
}
