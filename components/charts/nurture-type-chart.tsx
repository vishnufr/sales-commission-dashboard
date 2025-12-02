// components/charts/nurture-type-chart.tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

type Props = {
  data: { type: string; count: number }[];
};

function labelForNurture(type: string) {
  if (type === "redzone") return "Redzone (<=7d)";
  if (type === "short_term") return "Short (7–30d)";
  if (type === "long_term") return "Long (30+d)";
  return type;
}

export function NurtureTypeChart({ data }: Props) {
  const mapped = data.map(d => ({
    label: labelForNurture(d.type),
    count: d.count
  }));

  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={mapped}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "#020617",
              border: "1px solid #1e293b",
              borderRadius: "0.75rem",
              fontSize: 12,
              color: "#e5e7eb"
            }}
            labelStyle={{ color: "#e5e7eb" }}
            itemStyle={{ color: "#e5e7eb" }}
          />
          <Bar
            dataKey="count"
            fill="#a855f7"
            stroke="#9333ea"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
