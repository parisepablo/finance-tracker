"use client";

import { PieChart, Pie, Cell } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface BudgetDonutProps {
  spentPercentage: number;
  color: string;
  name: string;
  spentCents: number;
  allocatedCents: number;
}

export function BudgetDonut({
  spentPercentage,
  color,
  name,
  spentCents,
  allocatedCents,
}: BudgetDonutProps) {
  const clampedPct = Math.min(spentPercentage, 100);
  const remainingPct = 100 - clampedPct;

  let activeColor = color;
  if (spentPercentage >= 100) activeColor = "#f43f5e";
  else if (spentPercentage >= 80) activeColor = "#f59e0b";

  const data = [
    { name: "spent", value: clampedPct },
    { name: "remaining", value: remainingPct },
  ];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: 80, height: 80 }}>
        <PieChart width={80} height={80}>
          <Pie
            data={data}
            cx={40}
            cy={40}
            innerRadius={28}
            outerRadius={36}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            dataKey="value"
          >
            <Cell fill={activeColor} />
            <Cell fill="#27272a" />
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm text-white font-mono">{spentPercentage}%</span>
        </div>
      </div>
      <span className="text-xs text-zinc-400 text-center">{name}</span>
      <span className="text-xs text-zinc-500 font-mono">
        {formatCurrency(spentCents)} / {formatCurrency(allocatedCents)}
      </span>
    </div>
  );
}
