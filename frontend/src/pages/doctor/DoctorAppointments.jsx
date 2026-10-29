import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineChevronRight, HiOutlineCalendar, HiOutlineX, HiOutlinePhone } from "react-icons/hi";
import { Button } from "@/components/kit/button";
import { VercelTabs } from "@/components/kit/vercel-tabs";
import { TimeChip } from "../../components/app/Surface";
import { AppointmentBadge } from "../../components/app/Badge";
import { Empty, SkeletonList } from "../../components/app/Feedback";
import { DateField } from "../../components/app/DateField";
import { PageHeader } from "../../components/app/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { doctorService } from "../../services/doctorService";
import { formatDateLong } from "../../utils/formatters";

const TABS = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "in_progress", label: "Đang khám" },
  { value: "completed", label: "Hoàn thành" },
];

export default function DoctorAppointments() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [tab, setTab] = useState("all");
  const [date, setDate] = useState("");
  const status = tab === "all" ? "" : tab;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await doctorService.getMyAppointments(user.id, { status: status || undefined, date: date || undefined });
      setList(res.data);
      setLoading(false);
    })();
  }, [user.id, status, date]);

  const groups = useMemo(() => {
    const map = new Map();
    list.forEach((a) => {
      if (!map.has(a.date)) map.set(a.date, []);
      map.get(a.date).push(a);
    });
    return [...map.entries()];
  }, [list]);

  return (
    <div>
      <PageHeader eyebrow="Lịch hẹn" title="Lịch hẹn của tôi" description="Theo dõi và mở hồ sơ khám cho từng lịch hẹn." />

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="-mx-1 overflow-x-auto scrollbar-none px-1 pb-2">
          <VercelTabs ariaLabel="Lọc theo trạng thái" tabs={TABS} value={tab} onValueChange={setTab} />
        </div>
        <div className="flex items-center gap-2">
          <DateField id="appt-date" aria-label="Lọc theo ngày" className="w-[240px]" value={date} onChange={setDate} placeholder="Lọc theo ngày" />
          {date && (
            <Button variant="tile" size="icon" aria-label="Bỏ lọc ngày" onClick={() => setDate("")}>
              <HiOutlineX />
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonList rows={4} />
      ) : list.length === 0 ? (
        <Empty icon={HiOutlineCalendar} title="Không có lịch hẹn nào" description={date ? "Thử chọn ngày khác hoặc bỏ lọc ngày." : undefined} />
      ) : (
        <div className="space-y-8">
          {groups.map(([day, items]) => (
            <section key={day} aria-labelledby={`day-${day}`}>
              <h2 id={`day-${day}`} className="mb-3 text-sm font-semibold capitalize text-muted-foreground">
                {formatDateLong(day)} <span className="font-normal">· {items.length} lịch</span>
              </h2>
              <ul className="overflow-hidden rounded-card border border-border bg-card">
                {items.map((a) => (
                  <li key={a.id} className="border-b border-border last:border-b-0">
                      <Link
                        to={`/doctor/appointments/${a.id}`}
                        className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-tile sm:px-5"
                      >
                        <TimeChip time={a.startTime} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{a.patientName}</p>
                          <p className="truncate text-sm text-muted-foreground">{a.reason || "Chưa ghi lý do khám"}</p>
                          {a.patientPhone && (
                            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <HiOutlinePhone aria-hidden className="h-3.5 w-3.5" /> {a.patientPhone}
                            </p>
                          )}
                          <div className="mt-2 sm:hidden"><AppointmentBadge status={a.status} /></div>
                        </div>
                        <AppointmentBadge status={a.status} className="hidden sm:inline-flex" />
                        <HiOutlineChevronRight aria-hidden className="h-5 w-5 shrink-0 text-subtle" />
                      </Link>
                    </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
