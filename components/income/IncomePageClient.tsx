"use client";

import { useRouter } from "next/navigation";
import { IncomeSource } from "@/lib/types";
import { formatCurrency, sumIncomeSources } from "@/lib/utils";
import { IncomeList } from "@/components/income/IncomeList";
import { IncomeForm } from "@/components/income/IncomeForm";
import { GlowCard } from "@/components/ui/glow-card";
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
        <div>
          <h1 className="text-2xl font-semibold text-white">Income</h1>
          <p className="text-sm text-zinc-500">
            Track your monthly income sources
          </p>
        </div>
        <IncomeForm onSuccess={handleRefresh} />
      </div>

      <GlowCard color="indigo">
        <div className="p-5 space-y-2">
          <div className="flex flex-row items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Total Monthly Income
            </span>
            <DollarSign className="h-4 w-4 text-zinc-600" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums font-mono">
            {formatCurrency(totalCents)}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            From <span className="font-mono">{activeCount}</span> active source
            {activeCount === 1 ? "" : "s"}
          </p>
        </div>
      </GlowCard>

      {error ? (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          Error loading income sources: {error}
        </div>
      ) : (
        <IncomeList incomeSources={incomeSources} onRefresh={handleRefresh} />
      )}
    </div>
  );
}
