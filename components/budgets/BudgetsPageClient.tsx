"use client";

import { useRouter } from "next/navigation";
import { BudgetCategoryWithStats } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Amount } from "@/components/ui/amount";
import { BudgetCategoryList } from "@/components/budgets/BudgetCategoryList";
import { BudgetCategoryForm } from "@/components/budgets/BudgetCategoryForm";
import { AllocationBar } from "@/components/budgets/AllocationBar";
import { GlowCard } from "@/components/ui/glow-card";
import { AmbientGlow } from "@/components/ui/ambient-glow";
import { AlertTriangle, Info, Wallet } from "lucide-react";

interface BudgetsPageClientProps {
  categories: BudgetCategoryWithStats[];
  discretionaryPoolCents: number;
  error: string | null;
}

export function BudgetsPageClient({
  categories,
  discretionaryPoolCents,
  error,
}: BudgetsPageClientProps) {
  const router = useRouter();

  const totalPercentage = categories.reduce(
    (sum, cat) => sum + cat.percentage,
    0
  );

  const overAllocated = totalPercentage > 100;
  const underAllocated = totalPercentage > 0 && totalPercentage < 95;

  function handleRefresh() {
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 relative">
      <AmbientGlow color="indigo" position="top-right" />

      <div className="flex items-center justify-between relative z-10">
        <div>
          <h1 className="text-2xl font-semibold text-white">Variable Budgets</h1>
          <p className="text-sm text-zinc-500">
            Allocate your discretionary pool
          </p>
        </div>
        <BudgetCategoryForm
          discretionaryPoolCents={discretionaryPoolCents}
          existingTotalPercentage={totalPercentage}
          onSuccess={handleRefresh}
        />
      </div>

      {overAllocated && (
        <div className="relative z-10 flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Warning: You have allocated <span className="font-mono">{totalPercentage}%</span> of your discretionary
            pool. Categories exceeding 100% will overspend your budget.
          </span>
        </div>
      )}

      {!overAllocated && underAllocated && (
        <div className="relative z-10 flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-400">
          <Info className="h-4 w-4 shrink-0" />
          <span>
            You have allocated <span className="font-mono">{totalPercentage}%</span> of your discretionary pool.
            Consider allocating the remaining <span className="font-mono">{100 - totalPercentage}%</span> to cover
            all your variable spending.
          </span>
        </div>
      )}

      <GlowCard color="indigo" hoverIntensity="strong" className="relative z-10">
        <div className="p-5 space-y-2">
          <div className="flex flex-row items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-widest text-indigo-400">
              Discretionary Pool
            </span>
            <Wallet className="h-4 w-4 text-indigo-500/70" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums font-mono">
            <Amount value={discretionaryPoolCents} className="font-mono" />
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Income left after fixed expenses
          </p>
        </div>
      </GlowCard>

      <div className="space-y-2 relative z-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Allocation (<span className="font-mono">{totalPercentage}%</span>)
        </h2>
        <AllocationBar categories={categories} />
      </div>

      {error ? (
        <div className="relative z-10 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          Error loading budgets: {error}
        </div>
      ) : (
        <BudgetCategoryList
          categories={categories}
          discretionaryPoolCents={discretionaryPoolCents}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
