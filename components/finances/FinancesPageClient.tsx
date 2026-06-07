"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IncomeSource, FixedExpense, CreditCard, BudgetCategoryWithStats } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { IncomeList } from "@/components/income/IncomeList";
import { IncomeForm } from "@/components/income/IncomeForm";
import { FixedExpenseList } from "@/components/expenses/FixedExpenseList";
import { FixedExpenseForm } from "@/components/expenses/FixedExpenseForm";
import { BudgetCategoryList } from "@/components/budgets/BudgetCategoryList";
import { BudgetCategoryForm } from "@/components/budgets/BudgetCategoryForm";
import { BudgetDonut } from "@/components/budgets/BudgetDonut";
import { AllocationBar } from "@/components/budgets/AllocationBar";
import { GlowCard } from "@/components/ui/glow-card";
import { PullToRefreshIndicator } from "@/components/ui/pull-to-refresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertTriangle, Minus, Equal, Wallet, Banknote, Receipt, PieChart } from "lucide-react";

interface FinancesPageClientProps {
  incomeSources: IncomeSource[];
  expenses: FixedExpense[];
  creditCards: CreditCard[];
  categories: BudgetCategoryWithStats[];
  discretionaryPoolCents: number;
  totalIncomeCents: number;
  totalFixedCents: number;
  fixedPercentage: number;
  paidExpenseIds: string[];
  currentMonth: string;
  error: string | null;
}

export function FinancesPageClient({
  incomeSources,
  expenses,
  creditCards,
  categories,
  discretionaryPoolCents,
  totalIncomeCents,
  totalFixedCents,
  fixedPercentage,
  paidExpenseIds,
  currentMonth,
  error,
}: FinancesPageClientProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { pullProgress } = usePullToRefresh(() => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  }, isRefreshing);

  function handleRefresh() {
    router.refresh();
  }

  const totalPercentage = categories.reduce((sum, cat) => sum + cat.percentage, 0);
  const overAllocated = totalPercentage > 100;
  const underAllocated = totalPercentage > 0 && totalPercentage < 95;
  const overThreshold = totalIncomeCents > 0 && fixedPercentage > 70;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PullToRefreshIndicator progress={pullProgress} isRefreshing={isRefreshing} />
      <div>
        <h1 className="text-2xl font-semibold text-white">Finances</h1>
        <p className="text-sm text-zinc-500">
          Manage your income, fixed expenses, and budget allocation
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          Error loading data: {error}
        </div>
      )}

      {/* Summary flow bar */}
      <GlowCard color="indigo">
        <div className="p-5">
          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
            {/* Total Income */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Banknote className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                  Total Income
                </p>
                <p className="text-xl font-bold text-white tabular-nums font-mono">
                  {formatCurrency(totalIncomeCents)}
                </p>
              </div>
            </div>

            {/* Arrow: minus */}
            <div className="flex items-center gap-2 text-zinc-600 md:flex-col">
              <Minus className="h-5 w-5" />
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-600 md:hidden">
                minus
              </span>
            </div>

            {/* Fixed Expenses */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10">
                <Receipt className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                  Fixed Expenses
                </p>
                <p className="text-xl font-bold text-white tabular-nums font-mono">
                  {formatCurrency(totalFixedCents)}
                </p>
                {totalIncomeCents > 0 && (
                  <p className="text-xs text-zinc-500 font-mono">{fixedPercentage}% of income</p>
                )}
              </div>
            </div>

            {/* Arrow: equals */}
            <div className="flex items-center gap-2 text-zinc-600 md:flex-col">
              <Equal className="h-5 w-5" />
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-600 md:hidden">
                equals
              </span>
            </div>

            {/* Discretionary Pool */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                <Wallet className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-indigo-400">
                  Discretionary Pool
                </p>
                <p className="text-xl font-bold text-white tabular-nums font-mono">
                  {formatCurrency(discretionaryPoolCents)}
                </p>
              </div>
            </div>
          </div>

          {overThreshold && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>
                Your fixed expenses consume <span className="font-mono">{fixedPercentage}%</span> of your income.
              </span>
            </div>
          )}
        </div>
      </GlowCard>

      {/* Accordion sections */}
      <Accordion
        type="multiple"
        defaultValue={["income", "expenses", "budgets"]}
        className="space-y-4"
      >
        {/* Income Sources */}
        <AccordionItem value="income">
          <AccordionTrigger>
            <div className="flex items-center gap-3">
              <Banknote className="h-4 w-4 text-emerald-400" />
              <span className="text-zinc-200">Income Sources</span>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 font-mono">
                {incomeSources.length}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="flex justify-end">
                <IncomeForm onSuccess={handleRefresh} />
              </div>
              <IncomeList incomeSources={incomeSources} onRefresh={handleRefresh} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Fixed Expenses */}
        <AccordionItem value="expenses">
          <AccordionTrigger>
            <div className="flex items-center gap-3">
              <Receipt className="h-4 w-4 text-rose-400" />
              <span className="text-zinc-200">Fixed Expenses</span>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 font-mono">
                {expenses.length}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="flex justify-end">
                <FixedExpenseForm creditCards={creditCards} onSuccess={handleRefresh} />
              </div>
              <FixedExpenseList
                expenses={expenses}
                creditCards={creditCards}
                paidExpenseIds={paidExpenseIds}
                currentMonth={currentMonth}
                onRefresh={handleRefresh}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Budget Categories */}
        <AccordionItem value="budgets">
          <AccordionTrigger>
            <div className="flex items-center gap-3">
              <PieChart className="h-4 w-4 text-indigo-400" />
              <span className="text-zinc-200">Budget Categories</span>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 font-mono">
                {categories.length}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Allocation (<span className="font-mono">{totalPercentage}%</span>)
                  </h3>
                  <AllocationBar categories={categories} />
                </div>
                <BudgetCategoryForm
                  discretionaryPoolCents={discretionaryPoolCents}
                  existingTotalPercentage={totalPercentage}
                  onSuccess={handleRefresh}
                />
              </div>

              {overAllocated && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Warning: You have allocated <span className="font-mono">{totalPercentage}%</span> of your discretionary pool.
                  </span>
                </div>
              )}

              {!overAllocated && underAllocated && (
                <div className="flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-400">
                  <span>
                    You have allocated <span className="font-mono">{totalPercentage}%</span> of your pool. Consider allocating the remaining <span className="font-mono">{100 - totalPercentage}%</span>.
                  </span>
                </div>
              )}

              {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 p-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                    <PieChart className="h-5 w-5 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-500">
                    No budget categories yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {categories.map((cat) => (
                    <GlowCard key={cat.id} color="indigo">
                      <div className="p-4 flex flex-col items-center">
                        <BudgetDonut
                          spentPercentage={cat.spent_percentage}
                          color={cat.color}
                          name={cat.name}
                          spentCents={cat.spent_cents}
                          allocatedCents={cat.allocated_cents}
                        />
                      </div>
                    </GlowCard>
                  ))}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
