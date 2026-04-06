"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SuburbData } from "@/lib/types";

interface Props {
  data: SuburbData;
}

const COLORS = ["#2563eb", "#60a5fa", "#93c5fd", "#bfdbfe"];

export default function HousingPieChart({ data }: Props) {
  const h = data.housing;

  const raw = [
    { name: "Owner Occupied", value: h.ownerOccupied },
    { name: "Renting", value: h.renting },
    { name: "Social Housing", value: h.socialHousing },
  ].filter((d) => d.value != null && d.value > 0) as { name: string; value: number }[];

  const total = raw.reduce((s, d) => s + d.value, 0);
  const other = 100 - total;
  const chartData = other > 0.5 ? [...raw, { name: "Other", value: parseFloat(other.toFixed(1)) }] : raw;

  if (chartData.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">No housing tenure data available</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => [`${v.toFixed(1)}%`]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
