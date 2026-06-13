"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

interface MonthlySpendingChartProps {
  data: MonthlyData[];
}

export function MonthlySpendingChart({ data }: MonthlySpendingChartProps) {
  const chartData = data.map((d) => ({
    label: d.label,
    total: d.totalCents / 100,
    creditCards: d.creditCardCents / 100,
    cash: d.cashCents / 100,
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
                    <p className="text-sm text-white font-mono">
                      {formatCurrency(payload[0].value as number)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: "#10b981", strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: "#34d399" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
