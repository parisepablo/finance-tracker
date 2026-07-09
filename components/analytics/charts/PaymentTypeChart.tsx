"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { CHART_COLORS } from "./chart-utils";

interface PaymentTypeData {
  singleCount: number;
  singleAmount: number;
  installmentCount: number;
  installmentAmount: number;
}

interface PaymentTypeChartProps {
  data: PaymentTypeData;
}

export function PaymentTypeChart({ data }: PaymentTypeChartProps) {
  const chartData = [
    {
      name: "Single Payments",
      value: data.singleAmount / 100,
      count: data.singleCount,
      color: CHART_COLORS.single,
    },
    {
      name: "Installments",
      value: data.installmentAmount / 100,
      count: data.installmentCount,
      color: CHART_COLORS.installment,
    },
  ];

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-zinc-500">
        No payment data yet
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const entry = payload[0];
                  const item = entry.payload as (typeof chartData)[0];
                  return (
                    <div className="bg-[#18122B] border border-[#231c3d] rounded-lg p-2 shadow-lg">
                      <p className="text-sm font-medium" style={{ color: item.color }}>
                        {item.name}
                      </p>
                      <p className="text-xs text-zinc-400 font-mono">
                        {formatCurrency(item.value)} ({item.count} transactions)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col gap-3 w-full sm:w-auto">
        {chartData.map((entry, index) => {
          const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0";
          return (
            <div key={index} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <div className="flex flex-col">
                <span className="text-xs text-zinc-400">{entry.name}</span>
                <span className="text-sm text-white font-mono">
                  {formatCurrency(entry.value)} ({percentage}%)
                </span>
                <span className="text-[10px] text-zinc-500">{entry.count} transactions</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
