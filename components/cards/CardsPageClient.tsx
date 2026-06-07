"use client";

import { useRouter } from "next/navigation";
import { CreditCard, BudgetCategory } from "@/lib/types";
import { CardList } from "@/components/cards/CardList";
import { CreditCardForm } from "@/components/cards/CreditCardForm";
import { AmbientGlow } from "@/components/ui/ambient-glow";

interface CardsPageClientProps {
  cards: CreditCard[];
  budgetCategories: BudgetCategory[];
  error: string | null;
}

export function CardsPageClient({
  cards,
  budgetCategories,
  error,
}: CardsPageClientProps) {
  const router = useRouter();

  function handleRefresh() {
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 relative">
      <AmbientGlow color="emerald" position="bottom-left" />

      <div className="flex items-center justify-between relative z-10">
        <div>
          <h1 className="text-2xl font-semibold text-white">Credit Cards</h1>
          <p className="text-sm text-zinc-500">
            Track charges and installments
          </p>
        </div>
        <CreditCardForm onSuccess={handleRefresh} />
      </div>

      {error ? (
        <div className="relative z-10 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          Error loading credit cards: {error}
        </div>
      ) : (
        <CardList
          cards={cards}
          budgetCategories={budgetCategories}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
