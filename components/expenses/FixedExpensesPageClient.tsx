"use client";

import { useRouter } from "next/navigation";
import { FixedExpense, IncomeSource, CreditCard } from "@/lib/types";
import {
  formatCurrency,
  sumIncomeSources,
  sumFixedExpenses,
  getDiscretionaryPool,
} from "@/lib/utils";
import { FixedExpenseList } from "@/components/expenses/FixedExpenseList";
import { FixedExpenseForm } from "@/components/expenses/FixedExpenseForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <h1 className="text-2xl font-semibold">Fixed Expenses</h1>
        <FixedExpenseForm
          creditCards={creditCards}
          onSuccess={handleRefresh}
        />
      </div>

      {overThreshold && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Warning: Your fixed expenses consume {fixedPercentage}% of your
            income. Consider reviewing your recurring costs to improve your
            financial health.
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Fixed / Month
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalFixed)}
            </div>
            <p className="text-xs text-muted-foreground">
              Monthly equivalent of all active expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">% of Income</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fixedPercentage}%</div>
            <p className="text-xs text-muted-foreground">
              Of total monthly income
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Discretionary Pool
            </CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(discretionaryPool)}
            </div>
            <p className="text-xs text-muted-foreground">
              Income left after fixed expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
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
