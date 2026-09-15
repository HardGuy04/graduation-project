import { HiOutlineInboxIn } from "react-icons/hi";

export function Spinner({ className = "h-6 w-6", label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-ink-faint">
      <svg className={`animate-spin text-teal-500 ${className}`} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon = HiOutlineInboxIn, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl2 border border-dashed border-slate-200 bg-slate-50/60 py-14 px-6 text-center">
      <Icon className="h-9 w-9 text-slate-300 mb-1" />
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="text-sm text-ink-faint max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div className="rounded-xl2 border border-clay-400/30 bg-clay-50 px-5 py-4 text-sm font-medium text-clay-600">
      {message || "Đã có lỗi xảy ra. Vui lòng thử lại."}
    </div>
  );
}
