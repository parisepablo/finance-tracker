"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { CHART_COLORS } from "./chart-utils";

interface BudgetVsActualData {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  allocatedCents: number;
  spentCents: number;
}

interface BudgetVsActualChartProps {
  data: BudgetVsActualData[];
}

export function BudgetVsActualChart({ data }: BudgetVsActualChartProps) {
  const chartData = data
    .filter((d) => d.allocatedCents > 0 || d.spentCents > 0)
    .map((d) => ({
      name: d.categoryName,
      allocated: d.allocatedCents / 100,
      spent: d.spentCents / 100,
      color: d.categoryColor,
    }))
    .sort((a, b) => b.spent - a.spent);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-zinc-500">
        No budget or spending data yet
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
          <XAxis
            type="number"
            stroke={CHART_COLORS.tick}
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke={CHART_COLORS.tick}
            fontSize={11}
            tickLine={false}
            width={100}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-[#18122B] border border-[#231c3d] rounded-lg p-2 shadow-lg min-w-[180px]">
                    <p className="text-xs text-zinc-400 mb-1">{label}</p>
                    {payload.map((entry, index) => (
                      <p key={index} className="text-sm font-mono" style={{ color: entry.color }}>
                        {entry.name}: {formatCurrency(entry.value as number)}
                      </p>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px", color: CHART_COLORS.tick }} />
          <ReferenceLine x={0} stroke={CHART_COLORS.grid} />
          <Bar dataKey="allocated" name="Allocated" fill={CHART_COLORS.income} radius={[0, 4, 4, 0]} />
          <Bar dataKey="spent" name="Spent" fill={CHART_COLORS.spending} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
