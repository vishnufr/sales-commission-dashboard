// components/charts/status-breakdown-chart.tsx
"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";

type Props = {
  data: { stage: string; value: number }[];
};

const COLORS = ["#22c55e", "#ef4444", "#eab308", "#64748b"];

export function StatusBreakdownChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="stage"
            innerRadius={30}
            outerRadius={60}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
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
            formatter={(value: any, name: any) =>
              `${String(name).replace("_", " ")}: ${value} (${(
                (Number(value) / total) *
                100
              ).toFixed(1)}%)`
            }
          />
          <Legend
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{
              fontSize: 10,
              color: "#e5e7eb"
            }}
            formatter={(value: any) =>
              String(value).replace("_", " ")
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
