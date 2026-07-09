"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { BudgetCategory } from "@/lib/types";
import { CHART_COLORS } from "./chart-utils";

interface CategoryMonthlyData {
  month: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalCents: number;
  creditCardCents: number;
  cashCents: number;
}

interface CategoryStackedChartProps {
  data: CategoryMonthlyData[];
  filter: "all" | "credit" | "cash";
  budgetCategories: BudgetCategory[];
}

export function CategoryStackedChart({
  data,
  filter,
  budgetCategories,
}: CategoryStackedChartProps) {
  const months = Array.from(new Set(data.map((d) => d.month))).sort();
  const categories = Array.from(new Set(data.map((d) => d.categoryId)));

  const chartData = months.map((month) => {
    const monthData: Record<string, number | string> = {
      label: new Date(`${month}-01`).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    };

    categories.forEach((catId) => {
      const catData = data.find((d) => d.month === month && d.categoryId === catId);
      if (catData) {
        const value =
          filter === "credit"
            ? catData.creditCardCents
            : filter === "cash"
            ? catData.cashCents
            : catData.totalCents;
        monthData[catId] = value / 100;
      } else {
        monthData[catId] = 0;
      }
    });

    return monthData;
  });

  const categoryMap = new Map<string, { name: string; color: string }>();
  budgetCategories.forEach((cat) => {
    categoryMap.set(cat.id, { name: cat.name, color: cat.color });
  });
  categoryMap.set("uncategorized", { name: "Uncategorized", color: "#71717a" });

  const hasData = data.some((d) =>
    filter === "credit" ? d.creditCardCents > 0 : filter === "cash" ? d.cashCents > 0 : d.totalCents > 0
  );

  if (!hasData) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-zinc-500">
        No category data for this filter
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
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
                const total = payload.reduce((sum, entry) => sum + (entry.value as number), 0);
                return (
                  <div className="bg-[#18122B] border border-[#231c3d] rounded-lg p-2 shadow-lg min-w-[180px]">
                    <p className="text-xs text-zinc-400 mb-1">{label}</p>
                    <p className="text-sm text-white font-mono mb-1">Total: {formatCurrency(total)}</p>
                    {payload.map((entry, index) => {
                      if (entry.value === 0) return null;
                      const dataKey = typeof entry.dataKey === "string" ? entry.dataKey : String(entry.dataKey);
                      const catInfo = categoryMap.get(dataKey);
                      return (
                        <p key={index} className="text-sm font-mono" style={{ color: entry.color }}>
                          {catInfo?.name ?? dataKey}: {formatCurrency(entry.value as number)}
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
            wrapperStyle={{ fontSize: "12px", color: CHART_COLORS.tick }}
            formatter={(value) => categoryMap.get(value)?.name ?? value}
          />
          {categories.map((catId) => {
            const catInfo = categoryMap.get(catId);
            return (
              <Area
                key={catId}
                type="monotone"
                dataKey={catId}
                name={catId}
                stackId="1"
                stroke={catInfo?.color ?? CHART_COLORS.palette[0]}
                fill={catInfo?.color ?? CHART_COLORS.palette[0]}
                fillOpacity={0.6}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
