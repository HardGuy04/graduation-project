import { useEffect, useState } from "react";
import { HiOutlineCalendar } from "react-icons/hi";
import Card from "../../components/ui/Card";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import { useAuth } from "../../context/AuthContext";
import { doctorService } from "../../services/doctorService";
import { WEEKDAY_LABEL } from "../../utils/constants";
import { formatDateLong } from "../../utils/formatters";

export default function DoctorSchedule() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [leaves, setLeaves] = useState([]);

  useEffect(() => {
    (async () => {
      const [s, l] = await Promise.all([doctorService.getMySchedule(user.id), doctorService.getMyLeaves(user.id)]);
      setSchedules(s.data);
      setLeaves(l.data);
      setLoading(false);
    })();
  }, [user.id]);

  if (loading) return <Spinner label="Đang tải lịch làm việc…" />;

  const byDay = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
    day: d,
    slots: schedules.filter((s) => s.dayOfWeek === d),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {schedules.length === 0 ? (
        <EmptyState title="Bạn chưa được xếp lịch làm việc" description="Liên hệ quản trị viên để được sắp xếp lịch." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {byDay.map(({ day, slots }) => (
            <Card key={day} className={slots.length === 0 ? "opacity-50" : ""}>
              <p className="font-bold text-ink mb-3">{WEEKDAY_LABEL[day]}</p>
              {slots.length === 0 ? (
                <p className="text-sm text-ink-faint">Không có lịch khám</p>
              ) : (
                <div className="space-y-2.5">
                  {slots.map((s) => (
                    <div key={s.id} className="rounded-lg bg-teal-50 px-3 py-2.5">
                      <p className="text-sm font-semibold text-teal-700">{s.startTime} – {s.endTime}</p>
                      <p className="text-xs text-teal-600/80 mt-0.5">{s.room} · tối đa {s.maxPatients} bệnh nhân</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card>
        <p className="font-bold text-ink mb-1">Ngày nghỉ sắp tới</p>
        <p className="text-sm text-ink-faint mb-4">Do quản trị viên đánh dấu — hệ thống sẽ tự chặn bệnh nhân đặt lịch vào các ngày này.</p>
        {leaves.length === 0 ? (
          <EmptyState icon={HiOutlineCalendar} title="Không có ngày nghỉ nào sắp tới" />
        ) : (
          <div className="divide-y divide-slate-100">
            {leaves.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-4 py-3">
                <p className="font-semibold text-ink">{formatDateLong(l.date)}</p>
                <p className="text-sm text-ink-faint">{l.reason}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
