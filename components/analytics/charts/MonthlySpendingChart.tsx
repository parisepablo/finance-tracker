"use client";

import { useState } from "react";
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

interface MonthlySpendingChartProps {
  data: MonthlyData[];
}

const seriesConfig = [
  { key: "total", name: "Total", color: CHART_COLORS.spending, showByDefault: true },
  { key: "creditCards", name: "Credit Cards", color: CHART_COLORS.creditCard, showByDefault: false },
  { key: "cash", name: "Cash", color: CHART_COLORS.cash, showByDefault: false },
];

export function MonthlySpendingChart({ data }: MonthlySpendingChartProps) {
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(seriesConfig.map((s) => [s.key, s.showByDefault]))
  );

  const chartData = data.map((d) => ({
    label: d.label,
    total: d.totalCents / 100,
    creditCards: d.creditCardCents / 100,
    cash: d.cashCents / 100,
  }));

  const hasData = data.some((d) => d.totalCents > 0 || d.creditCardCents > 0 || d.cashCents > 0);

  if (!hasData) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-zinc-500">
        No spending data yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {seriesConfig.map((s) => (
          <button
            key={s.key}
            onClick={() => setVisible((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: visible[s.key] ? s.color : "#3f3f46" }}
            />
            <span className={visible[s.key] ? "" : "line-through text-zinc-600"}>{s.name}</span>
          </button>
        ))}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
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
                    <div className="bg-[#18122B] border border-[#231c3d] rounded-lg p-2 shadow-lg min-w-[160px]">
                      <p className="text-xs text-zinc-400 mb-1">{label}</p>
                      {payload.map((entry, index) => {
                        if (!entry.value || entry.value === 0) return null;
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
            {seriesConfig.map(
              (s) =>
                visible[s.key] && (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.name}
                    stroke={s.color}
                    strokeWidth={s.key === "total" ? 3 : 2}
                    dot={{ fill: s.color, strokeWidth: 0, r: s.key === "total" ? 4 : 3 }}
                    activeDot={{ r: 5 }}
                  />
                )
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
