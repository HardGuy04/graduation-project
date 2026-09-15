import { HiOutlineMenuAlt2 } from "react-icons/hi";
import Avatar from "../ui/Avatar";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../../context/AuthContext";

export default function Topbar({ title, subtitle, onOpenMobile }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-100 bg-paper/90 backdrop-blur px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onOpenMobile} className="lg:hidden text-ink-soft p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100">
          <HiOutlineMenuAlt2 className="h-6 w-6" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold font-display text-ink truncate">{title}</h1>
          {subtitle && <p className="text-sm text-ink-faint mt-0.5 hidden sm:block">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {user?.role === "patient" && <NotificationBell />}
        <Avatar name={user?.fullName} size="sm" color={user?.avatarColor || "#0F5C56"} src={user?.avatarUrl} />
      </div>
    </header>
  );
}
