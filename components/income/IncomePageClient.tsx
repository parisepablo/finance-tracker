"use client";

import { useRouter } from "next/navigation";
import { IncomeSource } from "@/lib/types";
import { formatCurrency, sumIncomeSources } from "@/lib/utils";
import { IncomeList } from "@/components/income/IncomeList";
import { IncomeForm } from "@/components/income/IncomeForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

interface IncomePageClientProps {
  incomeSources: IncomeSource[];
  error: string | null;
}

export function IncomePageClient({ incomeSources, error }: IncomePageClientProps) {
  const router = useRouter();
  const totalCents = sumIncomeSources(incomeSources);
  const activeCount = incomeSources.filter((s) => s.is_active).length;

  function handleRefresh() {
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Income</h1>
        <IncomeForm onSuccess={handleRefresh} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            Total Monthly Income
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalCents)}</div>
          <p className="text-xs text-muted-foreground">
            From {activeCount} active source
            {activeCount === 1 ? "" : "s"}
          </p>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          Error loading income sources: {error}
        </div>
      ) : (
        <IncomeList incomeSources={incomeSources} onRefresh={handleRefresh} />
      )}
    </div>
  );
}
