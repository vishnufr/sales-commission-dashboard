// components/charts/day-of-week-chart.tsx
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
  data: { dayKey: string; dayLabel: string; count: number }[];
};

export function DayOfWeekChart({ data }: Props) {
  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis
            dataKey="dayLabel"
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
            fill="#38bdf8"
            stroke="#0ea5e9"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
