import { useEffect, useState } from "react";
import { HiOutlineOfficeBuilding } from "react-icons/hi";
import Card from "../../components/ui/Card";
import { RoomStatusBadge } from "../../components/ui/StatusBadge";
import { Spinner } from "../../components/ui/Feedback";
import { adminService } from "../../services/adminService";

export default function AdminRooms() {
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    (async () => {
      const res = await adminService.getRooms();
      setRooms(res.data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner label="Đang tải danh sách phòng khám…" />;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
      {rooms.map((r) => (
        <Card key={r.id} className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl2 bg-teal-50 text-teal-600">
            <HiOutlineOfficeBuilding className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-ink">{r.name}</p>
            <p className="text-sm text-ink-faint">{r.floor}</p>
            <div className="mt-3"><RoomStatusBadge status={r.status} /></div>
          </div>
        </Card>
      ))}
    </div>
  );
}
