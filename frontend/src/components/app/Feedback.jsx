import { HiOutlineInbox, HiOutlineExclamationCircle } from "react-icons/hi";
import { Fade } from "@animate-ui/react/primitives/effects/fade";
import { cn } from "@/lib/utils";

export function Loading({ label = "Đang tải…", className }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground", className)}>
      <svg className="h-6 w-6 animate-spin text-foreground" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle className="opacity-15" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
      </svg>
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Khung xương chờ dữ liệu cho danh sách thẻ. */
export function SkeletonList({ rows = 3, className }) {
  return (
    <div role="status" aria-label="Đang tải" className={cn("grid gap-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-[88px] animate-pulse rounded-card bg-tile motion-reduce:animate-none" />
      ))}
    </div>
  );
}

export function Empty({ icon: Icon = HiOutlineInbox, title, description, action, className }) {
  return (
    <Fade className={cn("flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-input bg-card px-6 py-14 text-center", className)}>
      <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-tile">
        <Icon aria-hidden className="h-6 w-6 text-foreground" />
      </span>
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </Fade>
  );
}

export function ErrorNote({ children, className }) {
  return (
    <div role="alert" className={cn("flex items-start gap-2 rounded-field border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm font-medium text-destructive", className)}>
      <HiOutlineExclamationCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
