"use client";

import { useState } from "react";
import { CreditCard, BudgetCategory } from "@/lib/types";
import { MonthlySpendingChart } from "./charts/MonthlySpendingChart";
import { CategoryStackedChart } from "./charts/CategoryStackedChart";
import { PaymentTypeChart } from "./charts/PaymentTypeChart";
import { UtilizationChart } from "./charts/UtilizationChart";
import { SpendingVsIncomeChart } from "./charts/SpendingVsIncomeChart";
import { AmbientGlow } from "@/components/ui/ambient-glow";
import { BarChart3 } from "lucide-react";

interface MonthlyData {
  month: string;
  label: string;
  totalCents: number;
  creditCardCents: number;
  cashCents: number;
  incomeCents: number;
  fixedExpenseCents: number;
}

interface CategoryMonthlyData {
  month: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalCents: number;
  creditCardCents: number;
  cashCents: number;
}

interface CardUtilizationData {
  month: string;
  cardId: string;
  cardName: string;
  limitCents: number | null;
  spentCents: number;
  percentage: number;
}

interface PaymentTypeData {
  singleCount: number;
  singleAmount: number;
  installmentCount: number;
  installmentAmount: number;
}

interface AnalyticsPageClientProps {
  monthlyData: MonthlyData[];
  categoryData: CategoryMonthlyData[];
  paymentTypeData: PaymentTypeData;
  utilizationData: CardUtilizationData[];
  budgetCategories: BudgetCategory[];
  creditCards: CreditCard[];
}

export function AnalyticsPageClient({
  monthlyData,
  categoryData,
  paymentTypeData,
  utilizationData,
  budgetCategories,
  creditCards,
}: AnalyticsPageClientProps) {
  const [categoryFilter, setCategoryFilter] = useState<"all" | "credit" | "cash">("all");

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 relative">
      <AmbientGlow color="emerald" position="bottom-left" />

      <div className="relative z-10">
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="text-sm text-zinc-500">
          Track your spending patterns over time
        </p>
      </div>

      {/* Monthly Spending Trend */}
      <div className="relative z-10 rounded-xl border border-[#18122B] bg-[#0f0c19] p-4">
        <h2 className="text-sm font-medium text-zinc-200 mb-4">Monthly Spending Trend</h2>
        <MonthlySpendingChart data={monthlyData} />
      </div>

      {/* Spending vs Income */}
      <div className="relative z-10 rounded-xl border border-[#18122B] bg-[#0f0c19] p-4">
        <h2 className="text-sm font-medium text-zinc-200 mb-4">Spending vs Income</h2>
        <SpendingVsIncomeChart data={monthlyData} />
      </div>

      {/* Spending by Category */}
      <div className="relative z-10 rounded-xl border border-[#18122B] bg-[#0f0c19] p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-zinc-200">Spending by Category</h2>
          <div className="flex items-center gap-1 bg-[#18122B] rounded-lg p-1">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                categoryFilter === "all"
                  ? "bg-[#231c3d] text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCategoryFilter("credit")}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                categoryFilter === "credit"
                  ? "bg-[#231c3d] text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Credit Cards
            </button>
            <button
              onClick={() => setCategoryFilter("cash")}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                categoryFilter === "cash"
                  ? "bg-[#231c3d] text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Cash
            </button>
          </div>
        </div>
        <CategoryStackedChart
          data={categoryData}
          filter={categoryFilter}
          budgetCategories={budgetCategories}
        />
      </div>

      {/* Payment Type Distribution */}
      <div className="relative z-10 rounded-xl border border-[#18122B] bg-[#0f0c19] p-4">
        <h2 className="text-sm font-medium text-zinc-200 mb-4">Payment Type Distribution</h2>
        <PaymentTypeChart data={paymentTypeData} />
      </div>

      {/* Credit Card Utilization */}
      <div className="relative z-10 rounded-xl border border-[#18122B] bg-[#0f0c19] p-4">
        <h2 className="text-sm font-medium text-zinc-200 mb-4">Credit Card Utilization</h2>
        <UtilizationChart data={utilizationData} creditCards={creditCards} />
      </div>
    </div>
  );
}
