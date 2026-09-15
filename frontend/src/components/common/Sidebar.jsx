import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { HiOutlineLogout, HiOutlineX } from "react-icons/hi";
import Avatar from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar({ items, roleLabel, mobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth();

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={clsx(
          "fixed z-50 inset-y-0 left-0 w-64 shrink-0 bg-teal-800 text-teal-50 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl2 bg-teal-50 text-teal-700 font-display font-extrabold text-lg">
              M
            </div>
            <div className="leading-tight">
              <p className="font-display font-bold text-white text-[15px]">MediCare Hub</p>
              <p className="text-[11px] text-teal-200">{roleLabel}</p>
            </div>
          </div>
          <button onClick={onCloseMobile} className="lg:hidden text-teal-200 hover:text-white">
            <HiOutlineX className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-0.5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white text-teal-700 shadow-soft font-semibold"
                    : "text-teal-100/85 hover:bg-teal-700/60 hover:text-white"
                )
              }
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-teal-700/70 p-4">
          <div className="flex items-center gap-3">
            <Avatar name={user?.fullName} src={user?.avatarUrl} color={user?.avatarColor || "#3F9683"} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.fullName}</p>
              <p className="truncate text-xs text-teal-200">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Đăng xuất"
              className="text-teal-200 hover:text-white transition p-1.5 rounded-lg hover:bg-teal-700/60"
            >
              <HiOutlineLogout className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
