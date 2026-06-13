"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface MonthlyData {
  month: string;
  label: string;
  totalCents: number;
  creditCardCents: number;
  cashCents: number;
  incomeCents: number;
  fixedExpenseCents: number;
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
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="label"
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-[#18122B] border border-[#231c3d] rounded-lg p-2 shadow-lg">
                    <p className="text-xs text-zinc-400 mb-1">{label}</p>
                    {payload.map((entry, index) => (
                      <p
                        key={index}
                        className="text-sm font-mono"
                        style={{ color: entry.color }}
                      >
                        {entry.name}: {formatCurrency(entry.value as number)}
                      </p>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: "#71717a" }}
          />
          <Line
            type="monotone"
            dataKey="income"
            name="Income"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: "#10b981", strokeWidth: 0, r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="spending"
            name="Total Spending"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: "#10b981", strokeWidth: 0, r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="fixed"
            name="Fixed Expenses"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: "#f59e0b", strokeWidth: 0, r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
