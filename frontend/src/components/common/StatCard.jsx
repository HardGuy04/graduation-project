import { cn } from "@/lib/utils";
import { StatTile } from "../app/StatTile";

/** API cũ (icon, label, value, trend, trendLabel) hiển thị bằng StatTile; prop `tone` cũ được bỏ qua. */
export default function StatCard({ icon, label, value, trend, trendLabel }) {
  const hint = trend != null && (
    <span className="flex items-center gap-1">
      <span className={cn("font-semibold", trend >= 0 ? "text-accent" : "text-destructive")}>
        {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
      </span>
      {trendLabel}
    </span>
  );
  return <StatTile className="h-full" icon={icon} label={label} value={value} hint={hint || undefined} />;
}
