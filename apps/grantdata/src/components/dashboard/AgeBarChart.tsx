"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SuburbData } from "@/lib/types";

interface Props {
  data: SuburbData;
}

export default function AgeBarChart({ data }: Props) {
  const ag = data.demographics.ageDistribution;

  const chartData = [
    { label: "0–4", value: ag["0_4"] },
    { label: "5–14", value: ag["5_14"] },
    { label: "15–24", value: ag["15_24"] },
    { label: "25–34", value: ag["25_34"] },
    { label: "35–44", value: ag["35_44"] },
    { label: "45–54", value: ag["45_54"] },
    { label: "55–64", value: ag["55_64"] },
    { label: "65–74", value: ag["65_74"] },
    { label: "75+", value: ag["75_plus"] },
  ].filter((d) => d.value != null);

  if (chartData.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">No age distribution data available</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} unit="%" />
        <Tooltip
          formatter={(v: number) => [`${v.toFixed(1)}%`, "Population share"]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
        />
        <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
