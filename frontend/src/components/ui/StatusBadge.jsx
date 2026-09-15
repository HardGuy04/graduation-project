import clsx from "clsx";
import {
  APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_STYLE,
  INVOICE_STATUS_LABEL, ROOM_STATUS_LABEL, ROOM_STATUS_STYLE,
} from "../../utils/constants";

export function AppointmentStatusBadge({ status, className }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        APPOINTMENT_STATUS_STYLE[status] || "bg-slate-100 text-slate-500 border-slate-200",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {APPOINTMENT_STATUS_LABEL[status] || status}
    </span>
  );
}

export function InvoiceStatusBadge({ status, className }) {
  const style = status === "paid"
    ? "bg-leaf-50 text-leaf-600 border-leaf-400/30"
    : "bg-gold-50 text-gold-600 border-gold-200";
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", style, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {INVOICE_STATUS_LABEL[status] || status}
    </span>
  );
}

export function RoomStatusBadge({ status, className }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", ROOM_STATUS_STYLE[status], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {ROOM_STATUS_LABEL[status] || status}
    </span>
  );
}

export function AccountStatusBadge({ status, className }) {
  const active = status === "active";
  return (
    <span className={clsx(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
      active ? "bg-leaf-50 text-leaf-600 border-leaf-400/30" : "bg-clay-50 text-clay-500 border-clay-400/30",
      className
    )}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {active ? "Đang hoạt động" : "Đã khóa"}
    </span>
  );
}
