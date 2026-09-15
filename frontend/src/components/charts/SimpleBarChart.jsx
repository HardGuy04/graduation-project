import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const PALETTE = ["#0F5C56", "#3F9683", "#D9A441", "#4EAE83", "#C4483D", "#8B978F"];

export default function SimpleBarChart({ data, dataKey = "value", xKey = "name", height = 260, radius = 8 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5EAE8" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: "#6B7A75" }} axisLine={false} tickLine={false} interval={0} angle={-10} dy={10} height={50} />
        <YAxis tick={{ fontSize: 12, fill: "#6B7A75" }} axisLine={false} tickLine={false} width={40} />
        <Tooltip cursor={{ fill: "#F4F7F5" }} contentStyle={{ borderRadius: 12, border: "1px solid #E5EAE8", fontSize: 13 }} />
        <Bar dataKey={dataKey} radius={[radius, radius, 0, 0]} maxBarSize={40}>
          {data?.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
