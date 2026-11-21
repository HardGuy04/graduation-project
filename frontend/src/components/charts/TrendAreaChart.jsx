import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatDate } from "../../utils/formatters";
import { CHART_GRID, CHART_PRIMARY, CHART_TICK, CHART_TOOLTIP } from "./theme";

export default function TrendAreaChart({ data, dataKey = "value", color = CHART_PRIMARY, valueFormatter, xKey = "date" }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
        <XAxis
          dataKey={xKey}
          tickFormatter={(v) => formatDate(v, { day: "2-digit", month: "2-digit" })}
          tick={{ fontSize: 12, fill: CHART_TICK }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 12, fill: CHART_TICK }} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          labelFormatter={(v) => formatDate(v, { day: "2-digit", month: "2-digit", year: "numeric" })}
          formatter={(v) => [valueFormatter ? valueFormatter(v) : v, ""]}
          contentStyle={CHART_TOOLTIP}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#grad-${dataKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
