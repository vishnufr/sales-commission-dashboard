// components/charts/time-of-day-close-chart.tsx
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
import { CloseBucketStats } from "@/lib/analytics";

type Props = {
  data: CloseBucketStats[];
};

export function TimeOfDayCloseChart({ data }: Props) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
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
            formatter={(value: any, name: any, props: any) => {
              const d = props?.payload as CloseBucketStats;
              if (name === "dealsWon") {
                const rate = d.total
                  ? ((d.dealsWon / d.total) * 100).toFixed(1)
                  : "0.0";
                return [`${value} deals won (${rate}%)`, "Closed won"];
              }
              return value;
            }}
          />
          <Bar
            dataKey="dealsWon"
            fill="#22c55e"
            stroke="#16a34a"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
