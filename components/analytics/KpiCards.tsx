"use client";

import { Amount } from "@/components/ui/amount";
import { GlowCard } from "@/components/ui/glow-card";
import { TrendingDown, TrendingUp, Wallet, Calendar, PieChart } from "lucide-react";

interface KpiData {
  currentMonth: string;
  currentMonthLabel: string;
  totalIncomeCents: number;
  totalSpentCents: number;
  savingsCents: number;
  savingsRate: number | null;
  avgDailySpendCents: number;
  topCategory: { name: string; color: string; spentCents: number } | null;
}

interface KpiCardsProps {
  data: KpiData;
}

export function KpiCards({ data }: KpiCardsProps) {
  const isPositive = data.savingsCents >= 0;

  return (
    <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <GlowCard color="emerald">
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">Total Spent</span>
            <Wallet className="h-4 w-4 text-emerald-500/70" />
          </div>
          <div className="text-xl font-bold text-white tabular-nums font-mono">
            <Amount value={data.totalSpentCents} className="font-mono" />
          </div>
          <p className="text-xs text-zinc-500">{data.currentMonthLabel}</p>
        </div>
      </GlowCard>

      <GlowCard color={isPositive ? "emerald" : "rose"}>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">Savings</span>
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-emerald-500/70" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-500/70" />
            )}
          </div>
          <div className="text-xl font-bold text-white tabular-nums font-mono">
            <Amount value={Math.abs(data.savingsCents)} className="font-mono" />
          </div>
          <p className="text-xs text-zinc-500">
            {data.savingsRate !== null ? `${data.savingsRate}% of income` : "No income recorded"}
          </p>
        </div>
      </GlowCard>

      <GlowCard color="emerald">
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">Avg Daily Spend</span>
            <Calendar className="h-4 w-4 text-emerald-500/70" />
          </div>
          <div className="text-xl font-bold text-white tabular-nums font-mono">
            <Amount value={data.avgDailySpendCents} className="font-mono" />
          </div>
          <p className="text-xs text-zinc-500">Per day in {data.currentMonthLabel}</p>
        </div>
      </GlowCard>

      <GlowCard color="emerald">
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">Top Category</span>
            <PieChart className="h-4 w-4 text-emerald-500/70" />
          </div>
          {data.topCategory ? (
            <>
              <div className="text-xl font-bold text-white truncate">{data.topCategory.name}</div>
              <p className="text-xs text-zinc-500 font-mono">
                <Amount value={data.topCategory.spentCents} className="font-mono" />
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">No spending yet</p>
          )}
        </div>
      </GlowCard>
    </div>
  );
}
