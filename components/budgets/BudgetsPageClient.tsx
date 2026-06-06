"use client";

import { useRouter } from "next/navigation";
import { BudgetCategoryWithStats } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { BudgetCategoryList } from "@/components/budgets/BudgetCategoryList";
import { BudgetCategoryForm } from "@/components/budgets/BudgetCategoryForm";
import { AllocationBar } from "@/components/budgets/AllocationBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Variable Budgets</h1>
        <BudgetCategoryForm
          discretionaryPoolCents={discretionaryPoolCents}
          onSuccess={handleRefresh}
        />
      </div>

      {overAllocated && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Warning: You have allocated {totalPercentage}% of your discretionary
            pool. Categories exceeding 100% will overspend your budget.
          </span>
        </div>
      )}

      {!overAllocated && underAllocated && (
        <div className="flex items-center gap-2 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <Info className="h-4 w-4 shrink-0" />
          <span>
            You have allocated {totalPercentage}% of your discretionary pool.
            Consider allocating the remaining {100 - totalPercentage}% to cover
            all your variable spending.
          </span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            Discretionary Pool
          </CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(discretionaryPoolCents)}
          </div>
          <p className="text-xs text-muted-foreground">
            Income left after fixed expenses
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Allocation ({totalPercentage}%)
        </h2>
        <AllocationBar categories={categories} />
      </div>

      {error ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
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
