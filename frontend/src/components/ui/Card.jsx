import clsx from "clsx";

export default function Card({ className, children, padded = true, ...props }) {
  return (
    <div
      className={clsx(
        "bg-paper-raised border border-slate-100 rounded-xl2",
        padded && "p-5 sm:p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={clsx("flex items-start justify-between gap-4 mb-5", className)}>
      <div>
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        {subtitle && <p className="text-sm text-ink-faint mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
