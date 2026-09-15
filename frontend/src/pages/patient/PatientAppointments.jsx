import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { HiOutlinePlusCircle, HiOutlineBan } from "react-icons/hi";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";
import { AppointmentStatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useAuth } from "../../context/AuthContext";
import { patientService } from "../../services/patientService";
import { formatDateLong } from "../../utils/formatters";

const TABS = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

export default function PatientAppointments() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);

  async function load() {
    setLoading(true);
    const res = await patientService.getMyAppointments(user.id, { status: status || undefined });
    setList(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [status]); // eslint-disable-line

  async function handleCancel() {
    try {
      await patientService.cancelAppointment(cancelTarget.id);
      toast.success("Đã hủy lịch hẹn");
      setCancelTarget(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs tabs={TABS} active={status} onChange={setStatus} />
        <Link to="/patient/book"><Button size="sm"><HiOutlinePlusCircle className="h-4 w-4" /> Đặt lịch mới</Button></Link>
      </div>

      {loading ? (
        <Spinner label="Đang tải lịch hẹn của bạn…" />
      ) : list.length === 0 ? (
        <EmptyState title="Chưa có lịch hẹn nào" description="Đặt lịch khám để bắt đầu theo dõi sức khỏe của bạn." />
      ) : (
        <div className="grid gap-3">
          {list.map((a) => (
            <Card key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-ink">{a.doctorName}</p>
                <p className="text-sm text-ink-faint">{a.doctorSpecialty}</p>
                <p className="text-sm text-ink-soft mt-1.5">{formatDateLong(a.date)} lúc {a.startTime}{a.roomName ? ` · ${a.roomName}` : ""}</p>
                {a.reason && <p className="text-xs text-ink-faint mt-1">Lý do: {a.reason}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <AppointmentStatusBadge status={a.status} />
                {["pending", "confirmed"].includes(a.status) && (
                  <Button size="sm" variant="secondary" onClick={() => setCancelTarget(a)}>
                    <HiOutlineBan className="h-4 w-4" /> Hủy lịch
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        danger
        title="Hủy lịch hẹn"
        description={`Bạn có chắc chắn muốn hủy lịch khám với ${cancelTarget?.doctorName} vào ${cancelTarget ? formatDateLong(cancelTarget.date) : ""}?`}
        confirmLabel="Hủy lịch hẹn"
      />
    </div>
  );
}
