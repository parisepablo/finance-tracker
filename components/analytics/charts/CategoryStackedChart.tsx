"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { BudgetCategory } from "@/lib/types";

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
  // Get all unique months
  const months = Array.from(new Set(data.map((d) => d.month))).sort();
  const categories = Array.from(new Set(data.map((d) => d.categoryId)));

  // Build chart data
  const chartData = months.map((month) => {
    const monthData: Record<string, number | string> = {
      label: new Date(`${month}-01`).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    };

    categories.forEach((catId) => {
      const catData = data.find(
        (d) => d.month === month && d.categoryId === catId
      );
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

  // Get category colors
  const categoryMap = new Map<string, { name: string; color: string }>();
  budgetCategories.forEach((cat) => {
    categoryMap.set(cat.id, { name: cat.name, color: cat.color });
  });
  categoryMap.set("uncategorized", { name: "Uncategorized", color: "#71717a" });

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
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
                      {payload.map((entry, index) => {
                      if (entry.value === 0) return null;
                      const dataKey = typeof entry.dataKey === "string" ? entry.dataKey : String(entry.dataKey);
                      const catInfo = categoryMap.get(dataKey);
                      return (
                        <p
                          key={index}
                          className="text-sm font-mono"
                          style={{ color: entry.color }}
                        >
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
          {categories.map((catId) => {
            const catInfo = categoryMap.get(catId);
            return (
              <Area
                key={catId}
                type="monotone"
                dataKey={catId}
                name={catInfo?.name ?? catId}
                stackId="1"
                stroke={catInfo?.color ?? "#10b981"}
                fill={catInfo?.color ?? "#10b981"}
                fillOpacity={0.6}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
