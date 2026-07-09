"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { CHART_COLORS } from "./chart-utils";

interface MonthlyData {
  month: string;
  label: string;
  totalCents: number;
  creditCardCents: number;
  cashCents: number;
  incomeCents: number;
  fixedExpenseCents: number;
  savingsCents: number;
  savingsRate: number | null;
}

interface SpendingVsIncomeChartProps {
  data: MonthlyData[];
}

export function SpendingVsIncomeChart({ data }: SpendingVsIncomeChartProps) {
  const chartData = data.map((d) => ({
    label: d.label,
    income: d.incomeCents / 100,
    spending: d.totalCents / 100,
    fixed: d.fixedExpenseCents / 100,
    savings: d.savingsCents / 100,
  }));

  const hasData = data.some((d) => d.incomeCents > 0 || d.totalCents > 0);

  if (!hasData) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-zinc-500">
        No income or spending data yet
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis dataKey="label" stroke={CHART_COLORS.tick} fontSize={12} tickLine={false} />
          <YAxis
            stroke={CHART_COLORS.tick}
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-[#18122B] border border-[#231c3d] rounded-lg p-2 shadow-lg min-w-[180px]">
                    <p className="text-xs text-zinc-400 mb-1">{label}</p>
                    {payload.map((entry, index) => {
                      if (entry.value === undefined || entry.value === 0) return null;
                      return (
                        <p key={index} className="text-sm font-mono" style={{ color: entry.color }}>
                          {entry.name}: {formatCurrency(entry.value as number)}
                        </p>
                      );
                    })}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px", color: CHART_COLORS.tick }} />
          <Bar dataKey="spending" name="Total Spending" fill={CHART_COLORS.spending} radius={[4, 4, 0, 0]} />
          <Bar dataKey="fixed" name="Fixed Expenses" fill={CHART_COLORS.fixed} radius={[4, 4, 0, 0]} />
          <Line
            type="monotone"
            dataKey="income"
            name="Income"
            stroke={CHART_COLORS.income}
            strokeWidth={3}
            dot={{ fill: CHART_COLORS.income, strokeWidth: 0, r: 4 }}
          />
          <Area
            type="monotone"
            dataKey="savings"
            name="Savings / Deficit"
            stroke={CHART_COLORS.savings}
            fill={CHART_COLORS.savings}
            fillOpacity={0.15}
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
