"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SuburbResponse } from "@/lib/types";

interface Props {
  housing: SuburbResponse["housing"];
}

const COLORS = ["#2563eb", "#60a5fa", "#bfdbfe"];

export default function HousingChart({ housing }: Props) {
  const owner = housing.ownerOccupied ?? 0;
  const renting = housing.renting ?? 0;
  const social = housing.socialHousing ?? 0;
  const other = Math.max(0, 1 - owner - renting - social);

  const data = [
    { name: "Owner-occupied", value: parseFloat((owner * 100).toFixed(1)) },
    { name: "Renting", value: parseFloat((renting * 100).toFixed(1)) },
    { name: "Social housing", value: parseFloat((social * 100).toFixed(1)) },
    ...(other > 0.005 ? [{ name: "Other/N.S.", value: parseFloat((other * 100).toFixed(1)) }] : []),
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Housing data not available</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          outerRadius={75}
          innerRadius={40}
          dataKey="value"
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => [`${v}%`]} contentStyle={{ fontSize: 12 }} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
