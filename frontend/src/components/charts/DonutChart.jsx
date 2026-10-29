import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { CHART_PALETTE, CHART_TOOLTIP } from "./theme";

export default function DonutChart({ data, dataKey = "value", nameKey = "name", height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey={dataKey} nameKey={nameKey} innerRadius={62} outerRadius={92} paddingAngle={3}>
          {data?.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} stroke="none" />)}
        </Pie>
        <Tooltip contentStyle={CHART_TOOLTIP} />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "#384841" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
