import { useEffect, useRef, useState } from "react";
import { HiOutlineBell, HiCheckCircle, HiXCircle, HiOutlineBan, HiOutlineInbox } from "react-icons/hi";
import clsx from "clsx";
import { useAuth } from "../../context/AuthContext";
import { patientService } from "../../services/patientService";
import { timeAgo } from "../../utils/formatters";

// Chỉ dùng cho vai trò Bệnh nhân — Admin/Doctor không hiện chuông này (xem Topbar.jsx)
const ICON_BY_TYPE = {
  appointment_confirmed: { icon: HiCheckCircle, color: "text-leaf-500" },
  appointment_rejected: { icon: HiXCircle, color: "text-clay-500" },
  appointment_cancelled: { icon: HiOutlineBan, color: "text-clay-500" },
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const unreadCount = list.filter((n) => !n.isRead).length;

  async function load() {
    setLoading(true);
    const res = await patientService.getNotifications(user.id);
    setList(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user.id]); // eslint-disable-line

  useEffect(() => {
    function onClickOutside(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

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
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-slate-100 text-ink-soft"
        aria-label="Thông báo"
      >
        <HiOutlineBell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clay-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-clay-500 ring-2 ring-paper" />
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 z-50 w-[340px] max-h-[420px] overflow-y-auto scrollbar-thin rounded-xl2 border border-slate-100 bg-white shadow-pop animate-slide-up"
        >
          <div className="sticky top-0 flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-4 py-3">
            <p className="font-bold text-ink text-sm">Thông báo</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-ink-faint">Đang tải…</div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
              <HiOutlineInbox className="h-7 w-7 text-slate-300" />
              <p className="text-xs text-ink-faint">Bạn chưa có thông báo nào.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {list.map((n) => {
                const meta = ICON_BY_TYPE[n.type] || { icon: HiOutlineBell, color: "text-teal-500" };
                const Icon = meta.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={clsx(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50",
                      !n.isRead && "bg-teal-50/50"
                    )}
                  >
                    <Icon className={clsx("h-5 w-5 shrink-0 mt-0.5", meta.color)} />
                    <div className="min-w-0 flex-1">
                      <p className={clsx("text-sm leading-snug", n.isRead ? "text-ink-soft" : "font-semibold text-ink")}>
                        {n.text}
                      </p>
                      <p className="text-[11px] text-ink-faint mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-teal-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
