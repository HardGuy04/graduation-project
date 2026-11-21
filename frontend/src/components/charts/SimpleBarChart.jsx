import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { CHART_GRID, CHART_PALETTE, CHART_TICK, CHART_TOOLTIP } from "./theme";

export default function SimpleBarChart({ data, dataKey = "value", xKey = "name", height = 260, radius = 8 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: CHART_TICK }} axisLine={false} tickLine={false} interval={0} angle={-10} dy={10} height={50} />
        <YAxis tick={{ fontSize: 12, fill: CHART_TICK }} axisLine={false} tickLine={false} width={40} />
        <Tooltip cursor={{ fill: "#E4F3EC" }} contentStyle={CHART_TOOLTIP} />
        <Bar dataKey={dataKey} radius={[radius, radius, 0, 0]} maxBarSize={40}>
          {data?.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
