import clsx from "clsx";

export default function Tabs({ tabs, active, onChange, className }) {
  return (
    <div className={clsx("flex items-center gap-1 rounded-full bg-slate-100 p-1 w-fit", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={clsx(
            "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
            active === tab.value ? "bg-white text-teal-600 shadow-soft" : "text-ink-faint hover:text-ink"
          )}
        >
          {tab.label}
          {tab.count != null && (
            <span className={clsx("ml-1.5 text-xs", active === tab.value ? "text-teal-500" : "text-slate-400")}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
