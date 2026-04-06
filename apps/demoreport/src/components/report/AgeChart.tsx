"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SuburbResponse } from "@/lib/types";

interface Props {
  data: SuburbResponse["demographics"]["ageDistribution"];
}

const AGE_LABELS: [keyof Props["data"], string][] = [
  ["0_4", "0–4"],
  ["5_14", "5–14"],
  ["15_24", "15–24"],
  ["25_34", "25–34"],
  ["35_44", "35–44"],
  ["45_54", "45–54"],
  ["55_64", "55–64"],
  ["65_74", "65–74"],
  ["75_plus", "75+"],
];

export default function AgeChart({ data }: Props) {
  const chartData = AGE_LABELS.map(([key, label]) => ({
    group: label,
    pct: data[key] != null ? parseFloat(((data[key] as number) * 100).toFixed(1)) : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="group" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit="%" />
        <Tooltip
          formatter={(value: number) => [`${value}%`, "Population share"]}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={i === 3 || i === 4 ? "#2563eb" : "#93c5fd"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
