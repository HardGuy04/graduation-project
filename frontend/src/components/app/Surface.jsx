import { cn } from "@/lib/utils";

export function Card({ className, padded = true, as: Tag = "div", children, ...props }) {
  return (
    <Tag
      className={cn(
        "rounded-card border border-border bg-card shadow-hairline",
        padded && "p-5 sm:p-6",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ eyebrow, title, description, action, className }) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{eyebrow}</p>}
        <h2 className="text-title text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Ô nền xám ấm (#EFEDEB) cho thông tin phụ, khối tóm tắt. */
export function Tile({ className, children, ...props }) {
  return (
    <div className={cn("rounded-tile bg-tile p-4", className)} {...props}>
      {children}
    </div>
  );
}

export function DataItem({ label, children, className }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-foreground">{children}</dd>
    </div>
  );
}

/** Ô ngày/giờ đen dùng trong danh sách lịch hẹn. */
export function TimeChip({ time, date, className }) {
  return (
    <div className={cn("flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-tile bg-primary text-primary-foreground", className)}>
      <span className="text-sm font-bold leading-none tabular-nums">{time}</span>
      {date && <span className="mt-1 text-[10px] font-medium leading-none text-primary-foreground/70 tabular-nums">{date}</span>}
    </div>
  );
}
