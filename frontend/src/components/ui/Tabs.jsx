import { VercelTabs } from "@/components/kit/vercel-tabs";

// Radix Tabs không nhận value rỗng, nên tab "Tất cả" (value "") được đổi qua khóa nội bộ.
const ALL = "__all";
const toKey = (v) => (v === "" || v == null ? ALL : String(v));
const fromKey = (k) => (k === ALL ? "" : k);

/** API cũ ({ tabs, active, onChange }) trên nền JolyUI Vercel Tabs. */
export default function Tabs({ tabs, active, onChange, className, ariaLabel = "Bộ lọc" }) {
  return (
    <VercelTabs
      tabs={tabs.map((t) => ({ ...t, value: toKey(t.value) }))}
      value={toKey(active)}
      onValueChange={(k) => onChange(fromKey(k))}
      className={className}
      ariaLabel={ariaLabel}
    />
  );
}
