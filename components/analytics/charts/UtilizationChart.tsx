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
import { CHART_COLORS, getColor } from "./chart-utils";

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
  const months = Array.from(new Set(data.map((d) => d.month))).sort();

  const chartData = months.map((month) => {
    const monthData: Record<string, number | string> = {
      label: new Date(`${month}-01`).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    };

    creditCards.forEach((card) => {
      const cardData = data.find((d) => d.month === month && d.cardId === card.id);
      monthData[card.id] = cardData?.percentage ?? 0;
    });

    return monthData;
  });

  const hasData = data.some((d) => d.spentCents > 0);

  if (!hasData) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-zinc-500">
        No credit card spending data yet
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis dataKey="label" stroke={CHART_COLORS.tick} fontSize={12} tickLine={false} />
          <YAxis
            stroke={CHART_COLORS.tick}
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
            domain={[0, "auto"]}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-[#18122B] border border-[#231c3d] rounded-lg p-2 shadow-lg min-w-[160px]">
                    <p className="text-xs text-zinc-400 mb-1">{label}</p>
                    {payload.map((entry, index) => {
                      if (entry.value === 0) return null;
                      const dataKey = typeof entry.dataKey === "string" ? entry.dataKey : String(entry.dataKey);
                      const card = creditCards.find((c) => c.id === dataKey);
                      return (
                        <p key={index} className="text-sm font-mono" style={{ color: entry.color }}>
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
          <Legend wrapperStyle={{ fontSize: "12px", color: CHART_COLORS.tick }} />
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
              stroke={getColor(index)}
              strokeWidth={2}
              dot={{ fill: getColor(index), strokeWidth: 0, r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
