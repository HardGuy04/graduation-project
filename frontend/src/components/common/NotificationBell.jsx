import { useEffect, useState } from "react";
import { Popover } from "@animate-ui/react/primitives/radix-ui";
import { HiOutlineBell, HiCheckCircle, HiXCircle, HiOutlineBan, HiOutlineInbox } from "react-icons/hi";
import { Button } from "@/components/kit/button";
import { cn } from "@/lib/utils";
import { useAuth } from "../../context/AuthContext";
import { patientService } from "../../services/patientService";
import { timeAgo } from "../../utils/formatters";

// Chỉ dùng cho vai trò Bệnh nhân — Admin/Doctor không có API thông báo
const ICON_BY_TYPE = {
  appointment_confirmed: { icon: HiCheckCircle, color: "text-foreground" },
  appointment_rejected: { icon: HiXCircle, color: "text-destructive" },
  appointment_cancelled: { icon: HiOutlineBan, color: "text-destructive" },
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);

  const unreadCount = list.filter((n) => !n.isRead).length;

  async function load() {
    setLoading(true);
    const res = await patientService.getNotifications(user.id);
    setList(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user.id]); // eslint-disable-line

  async function handleItemClick(n) {
    if (!n.isRead) {
      setList((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      patientService.markNotificationRead(n.id);
    }
  }

  async function handleMarkAllRead() {
    setList((prev) => prev.map((x) => ({ ...x, isRead: true })));
    await patientService.markAllNotificationsRead(user.id);
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : "Thông báo"}
          className="relative overflow-visible"
        >
          <HiOutlineBell className="!size-5" />
          {unreadCount > 0 && (
            <span aria-hidden className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
          )}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          className="auralis z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-card border border-border bg-card shadow-float"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
            <p className="text-sm font-semibold">Thông báo</p>
            {unreadCount > 0 && (
              <Button variant="link" size="sm" onClick={handleMarkAllRead} className="text-xs">
                Đánh dấu tất cả đã đọc
              </Button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto scrollbar-thin p-2">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Đang tải…</p>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <HiOutlineInbox aria-hidden className="h-7 w-7 text-subtle" />
                <p className="text-xs text-muted-foreground">Bạn chưa có thông báo nào.</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {list.map((n) => {
                  const meta = ICON_BY_TYPE[n.type] || { icon: HiOutlineBell, color: "text-foreground" };
                  const Icon = meta.icon;
                  return (
                    <li key={n.id}>
                      <Button
                        variant="ghost"
                        onClick={() => handleItemClick(n)}
                        className={cn(
                          "h-auto w-full whitespace-normal rounded-tile px-3 py-3 text-left font-normal [&>span]:w-full [&>span]:items-start [&>span]:justify-start [&>span]:gap-3",
                          !n.isRead && "bg-tile"
                        )}
                      >
                        <Icon aria-hidden className={cn("mt-0.5 !size-5 shrink-0", meta.color)} />
                        <span className="min-w-0 flex-1">
                          <span className={cn("block text-sm leading-snug", n.isRead ? "text-muted-foreground" : "font-semibold text-foreground")}>
                            {n.text}
                          </span>
                          <span className="mt-1 block text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                        </span>
                        {!n.isRead && <span aria-label="Chưa đọc" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
