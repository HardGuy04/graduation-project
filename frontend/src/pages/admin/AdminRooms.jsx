import { useEffect, useState } from "react";
import { HiOutlineOfficeBuilding } from "react-icons/hi";
import { toast } from "react-toastify";
import Card from "../../components/ui/Card";
import { ComboboxField } from "../../components/app/ComboboxField";
import { RoomStatusBadge } from "../../components/ui/StatusBadge";
import { Spinner } from "../../components/ui/Feedback";
import { adminService } from "../../services/adminService";
import { ROOM_STATUS_OPTIONS } from "../../utils/constants";

export default function AdminRooms() {
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminService.getRooms();
        setRooms(res.data);
      } catch (err) {
        toast.error(err.message || "Không tải được danh sách phòng");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleStatusChange(room, nextUiStatus) {
    if (nextUiStatus === room.status) return;
    const opt = ROOM_STATUS_OPTIONS.find((o) => o.value === nextUiStatus);
    if (!opt) return;

    setUpdatingId(room.id);
    try {
      const res = await adminService.updateRoomStatus(room.id, opt.api);
      setRooms((list) => list.map((r) => (r.id === room.id ? res.data : r)));
      toast.success(`Đã cập nhật trạng thái «${room.name}»`);
    } catch (err) {
      toast.error(err.message || "Không cập nhật được trạng thái phòng");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <Spinner label="Đang tải danh sách phòng khám…" />;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((r) => (
        <Card key={r.id} className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-field bg-accent-soft text-accent">
            <HiOutlineOfficeBuilding aria-hidden className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-title">{r.name}</p>
            <div className="mt-2">
              <RoomStatusBadge status={r.status} />
            </div>
            <label htmlFor={`room-status-${r.id}`} className="mt-4 block text-xs font-semibold text-muted-foreground">
              Đổi trạng thái
            </label>
            <div className="mt-1.5">
              <ComboboxField
                id={`room-status-${r.id}`}
                options={ROOM_STATUS_OPTIONS}
                value={ROOM_STATUS_OPTIONS.some((o) => o.value === r.status) ? r.status : "available"}
                disabled={updatingId === r.id}
                onChange={(v) => handleStatusChange(r, v)}
                placeholder="Chọn trạng thái"
              />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
