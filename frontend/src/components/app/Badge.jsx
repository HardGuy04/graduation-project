import { cn } from "@/lib/utils";
import { APPOINTMENT_STATUS_LABEL, INVOICE_STATUS_LABEL } from "../../utils/constants";

const TONES = {
  solid: "bg-primary text-primary-foreground border-primary",
  outline: "bg-card text-foreground border-foreground/20",
  tile: "bg-tile text-foreground border-transparent",
  mint: "bg-accent-soft text-accent border-accent/15",
  sky: "bg-sky text-lavender-ink border-lavender/40",
  muted: "bg-tile text-muted-foreground border-transparent",
  danger: "bg-destructive-soft text-destructive border-destructive/20",
  new: "bg-primary text-primary-foreground border-primary uppercase tracking-[0.08em] text-[10px]",
};

export function Badge({ tone = "tile", dot = false, className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold leading-none",
        TONES[tone],
        className
      )}
    >
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const APPOINTMENT_TONE = {
  pending: "sky",
  confirmed: "mint",
  in_progress: "solid",
  completed: "tile",
  cancelled: "muted",
  rejected: "danger",
  no_show: "danger",
};

export function AppointmentBadge({ status, className }) {
  return (
    <Badge tone={APPOINTMENT_TONE[status] || "muted"} dot className={className}>
      {APPOINTMENT_STATUS_LABEL[status] || status}
    </Badge>
  );
}

export function InvoiceBadge({ status, className }) {
  return (
    <Badge tone={status === "paid" ? "tile" : "outline"} dot className={className}>
      {INVOICE_STATUS_LABEL[status] || status}
    </Badge>
  );
}
