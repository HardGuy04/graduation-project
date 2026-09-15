import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatDate } from "../../utils/formatters";

export default function TrendAreaChart({ data, dataKey = "value", color = "#0F5C56", valueFormatter, xKey = "date" }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5EAE8" vertical={false} />
        <XAxis
          dataKey={xKey}
          tickFormatter={(v) => formatDate(v, { day: "2-digit", month: "2-digit" })}
          tick={{ fontSize: 12, fill: "#6B7A75" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 12, fill: "#6B7A75" }} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          labelFormatter={(v) => formatDate(v, { day: "2-digit", month: "2-digit", year: "numeric" })}
          formatter={(v) => [valueFormatter ? valueFormatter(v) : v, ""]}
          contentStyle={{ borderRadius: 12, border: "1px solid #E5EAE8", fontSize: 13 }}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#grad-${dataKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
