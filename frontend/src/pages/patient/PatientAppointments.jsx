import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { HiOutlineBan, HiOutlineCalendar, HiOutlineLocationMarker } from "react-icons/hi";
import { Button } from "@/components/kit/button";
import { Card, TimeChip } from "../../components/app/Surface";
import { AppointmentBadge } from "../../components/app/Badge";
import { Empty, SkeletonList } from "../../components/app/Feedback";
import { ConfirmDialog } from "../../components/app/Dialog";
import { useAuth } from "../../context/AuthContext";
import { patientService } from "../../services/patientService";
import { formatDate, formatDateLong } from "../../utils/formatters";

const FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

/** Panel "Lịch hẹn" trong trang Lịch khám. */
export default function PatientAppointments() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  async function load() {
    setLoading(true);
    const res = await patientService.getMyAppointments(user.id, { status: status || undefined });
    setList(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [status]); // eslint-disable-line

  async function handleCancel() {
    setCancelling(true);
    try {
      await patientService.cancelAppointment(cancelTarget.id);
      toast.success("Đã hủy lịch hẹn");
      setCancelTarget(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="-mx-1 flex gap-2 overflow-x-auto scrollbar-none px-1 pb-1" role="group" aria-label="Lọc theo trạng thái">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={status === f.value ? "default" : "outline"}
            aria-pressed={status === f.value}
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <SkeletonList rows={3} />
      ) : list.length === 0 ? (
        <Empty
          icon={HiOutlineCalendar}
          title="Chưa có lịch hẹn nào"
          description="Đặt lịch khám để bắt đầu theo dõi sức khỏe của bạn."
          action={<Button asChild><Link to="/patient/book">Đặt lịch khám</Link></Button>}
        />
      ) : (
        <ul className="grid gap-3">
            {list.map((a, i) => (
              <li key={a.id}>
                <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <TimeChip time={a.startTime} date={formatDate(a.date, { day: "2-digit", month: "2-digit" })} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{a.doctorName}</p>
                      <AppointmentBadge status={a.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{a.doctorSpecialty}</p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span>{formatDateLong(a.date)} · {a.startTime}</span>
                      {a.roomName && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <HiOutlineLocationMarker aria-hidden className="h-4 w-4" /> {a.roomName}
                        </span>
                      )}
                    </p>
                    {a.reason && <p className="mt-1 text-sm text-muted-foreground">Lý do: {a.reason}</p>}
                  </div>
                  {["pending", "confirmed"].includes(a.status) && (
                    <Button variant="outline" size="sm" className="shrink-0 text-destructive hover:border-destructive" onClick={() => setCancelTarget(a)}>
                      <HiOutlineBan /> Hủy lịch
                    </Button>
                  )}
                </Card>
              </li>
            ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        loading={cancelling}
        danger
        title="Hủy lịch hẹn"
        description={`Bạn có chắc chắn muốn hủy lịch khám với ${cancelTarget?.doctorName} vào ${cancelTarget ? formatDateLong(cancelTarget.date) : ""}?`}
        confirmLabel="Hủy lịch hẹn"
      />
    </div>
  );
}
