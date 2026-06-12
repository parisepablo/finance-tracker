"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { CreditCard } from "@/lib/types";

interface CardUtilizationData {
  month: string;
  cardId: string;
  cardName: string;
  limitCents: number | null;
  spentCents: number;
  percentage: number;
}

interface UtilizationChartProps {
  data: CardUtilizationData[];
  creditCards: CreditCard[];
}

export function UtilizationChart({ data, creditCards }: UtilizationChartProps) {
  // Get all months
  const months = Array.from(new Set(data.map((d) => d.month))).sort();
  
  // Build chart data
  const chartData = months.map((month) => {
    const monthData: Record<string, number | string> = {
      label: new Date(`${month}-01`).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    };

    creditCards.forEach((card) => {
      const cardData = data.find(
        (d) => d.month === month && d.cardId === card.id
      );
      monthData[card.id] = cardData?.percentage ?? 0;
    });

    return monthData;
  });

  // Colors for cards
  const cardColors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

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
            tickFormatter={(value) => `${value}%`}
            domain={[0, "auto"]}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 shadow-lg">
                    <p className="text-xs text-zinc-400 mb-1">{label}</p>
                    {payload.map((entry, index) => {
                      if (entry.value === 0) return null;
                      const dataKey = typeof entry.dataKey === "string" ? entry.dataKey : String(entry.dataKey);
                      const card = creditCards.find((c) => c.id === dataKey);
                      return (
                        <p
                          key={index}
                          className="text-sm font-mono"
                          style={{ color: entry.color }}
                        >
                          {card?.name ?? dataKey}: {entry.value}%
                        </p>
                      );
                    })}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: "#71717a" }}
          />
          <ReferenceLine
            y={100}
            stroke="#f43f5e"
            strokeDasharray="3 3"
            label={{
              value: "Limit",
              position: "insideTopRight",
              fill: "#f43f5e",
              fontSize: 10,
            }}
          />
          {creditCards.map((card, index) => (
            <Line
              key={card.id}
              type="monotone"
              dataKey={card.id}
              name={card.name}
              stroke={cardColors[index % cardColors.length]}
              strokeWidth={2}
              dot={{ fill: cardColors[index % cardColors.length], strokeWidth: 0, r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
