"use client";

import { useRouter } from "next/navigation";
import { FixedExpense, IncomeSource, CreditCard } from "@/lib/types";
import {
  formatCurrency,
  sumIncomeSources,
  sumFixedExpenses,
  getDiscretionaryPool,
} from "@/lib/utils";
import { Amount } from "@/components/ui/amount";
import { FixedExpenseList } from "@/components/expenses/FixedExpenseList";
import { FixedExpenseForm } from "@/components/expenses/FixedExpenseForm";
import { GlowCard } from "@/components/ui/glow-card";
import { AlertTriangle, Wallet, Percent, PiggyBank } from "lucide-react";

interface FixedExpensesPageClientProps {
  expenses: FixedExpense[];
  incomeSources: IncomeSource[];
  creditCards: CreditCard[];
  error: string | null;
}

export function FixedExpensesPageClient({
  expenses,
  incomeSources,
  creditCards,
  error,
}: FixedExpensesPageClientProps) {
  const router = useRouter();

  const totalIncome = sumIncomeSources(incomeSources);
  const totalFixed = sumFixedExpenses(expenses);
  const discretionaryPool = getDiscretionaryPool(totalIncome, totalFixed);
  const fixedPercentage =
    totalIncome > 0 ? Math.round((totalFixed / totalIncome) * 100) : 0;
  const overThreshold = totalIncome > 0 && fixedPercentage > 70;

  function handleRefresh() {
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Fixed Expenses</h1>
          <p className="text-sm text-zinc-500">
            Manage your recurring costs
          </p>
        </div>
        <FixedExpenseForm
          creditCards={creditCards}
          onSuccess={handleRefresh}
        />
      </div>

      {overThreshold && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Warning: Your fixed expenses consume <span className="font-mono">{fixedPercentage}%</span> of your
            income. Consider reviewing your recurring costs.
          </span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <GlowCard color="indigo">
          <div className="p-5 space-y-2">
            <div className="flex flex-row items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Total Fixed / Month
              </span>
              <Wallet className="h-4 w-4 text-zinc-600" />
            </div>
            <div className="text-2xl font-bold text-white tabular-nums font-mono">
              <Amount value={totalFixed} className="font-mono" />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Monthly equivalent of all active expenses
            </p>
          </div>
        </GlowCard>

        <GlowCard color="indigo">
          <div className="p-5 space-y-2">
            <div className="flex flex-row items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                % of Income
              </span>
              <Percent className="h-4 w-4 text-zinc-600" />
            </div>
            <div className="text-2xl font-bold text-white tabular-nums font-mono">
              {fixedPercentage}%
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Of total monthly income
            </p>
          </div>
        </GlowCard>

        <GlowCard color="indigo" hoverIntensity="strong">
          <div className="p-5 space-y-2">
            <div className="flex flex-row items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-widest text-indigo-400">
                Discretionary Pool
              </span>
              <PiggyBank className="h-4 w-4 text-indigo-500/70" />
            </div>
            <div className="text-2xl font-bold text-white tabular-nums font-mono">
              <Amount value={discretionaryPool} className="font-mono" />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Income left after fixed expenses
            </p>
          </div>
        </GlowCard>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          Error loading expenses: {error}
        </div>
      ) : (
        <FixedExpenseList
          expenses={expenses}
          creditCards={creditCards}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
