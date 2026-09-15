import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const PALETTE = ["#0F5C56", "#3F9683", "#D9A441", "#4EAE83", "#C4483D", "#8B978F", "#A3CFC6"];

export default function DonutChart({ data, dataKey = "value", nameKey = "name", height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey={dataKey} nameKey={nameKey} innerRadius={62} outerRadius={92} paddingAngle={3}>
          {data?.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="none" />)}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5EAE8", fontSize: 13 }} />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "#3A4A45" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
