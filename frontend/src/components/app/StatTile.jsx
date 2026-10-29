import { CountingNumber } from "@animate-ui/react/primitives/texts/counting-number";
import { cn } from "@/lib/utils";

export function StatTile({ icon: Icon, label, value, hint, inverted = false, className }) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-6 rounded-card border p-5 sm:p-6",
        inverted ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={cn("text-sm font-medium", inverted ? "text-primary-foreground/75" : "text-muted-foreground")}>{label}</p>
        {Icon && (
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", inverted ? "bg-white/10" : "rounded-field bg-accent-soft text-accent")}>
            <Icon aria-hidden className="h-5 w-5" />
          </span>
        )}
      </div>
      <div>
        <p className="text-display-md tabular-nums">
          {typeof value === "number" ? <CountingNumber number={value} /> : value}
        </p>
        {hint && <p className={cn("mt-1 text-xs", inverted ? "text-primary-foreground/70" : "text-muted-foreground")}>{hint}</p>}
      </div>
    </div>
  );
}
