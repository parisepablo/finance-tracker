"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

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
      color: "#10b981",
    },
    {
      name: "Installments",
      value: data.installmentAmount / 100,
      count: data.installmentCount,
      color: "#10b981",
    },
  ];

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="h-48 w-48">
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
                  const data = entry.payload as (typeof chartData)[0];
                  return (
                    <div className="bg-[#18122B] border border-[#231c3d] rounded-lg p-2 shadow-lg">
                      <p className="text-sm font-medium" style={{ color: data.color }}>
                        {data.name}
                      </p>
                      <p className="text-xs text-zinc-400 font-mono">
                        {formatCurrency(data.value)} ({data.count} transactions)
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

      <div className="flex flex-wrap gap-4 justify-center">
        {chartData.map((entry, index) => {
          const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0";
          return (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <div className="flex flex-col">
                <span className="text-xs text-zinc-400">{entry.name}</span>
                <span className="text-sm text-white font-mono">
                  {formatCurrency(entry.value)} ({percentage}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
