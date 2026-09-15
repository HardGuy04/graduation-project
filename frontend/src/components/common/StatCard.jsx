import clsx from "clsx";
import Card from "../ui/Card";

export default function StatCard({ icon: Icon, label, value, trend, trendLabel, tone = "teal" }) {
  const toneStyle = {
    teal: "bg-teal-50 text-teal-600",
    gold: "bg-gold-50 text-gold-600",
    leaf: "bg-leaf-50 text-leaf-600",
    clay: "bg-clay-50 text-clay-500",
  }[tone];

  return (
    <Card className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-ink-faint">{label}</p>
        <p className="mt-2 text-3xl font-extrabold font-display text-ink">{value}</p>
        {trend != null && (
          <p className={clsx("mt-2 text-xs font-semibold flex items-center gap-1", trend >= 0 ? "text-leaf-600" : "text-clay-500")}>
            <span>{trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%</span>
            <span className="text-ink-faint font-normal">{trendLabel}</span>
          </p>
        )}
      </div>
      {Icon && (
        <div className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl2", toneStyle)}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </Card>
  );
}
