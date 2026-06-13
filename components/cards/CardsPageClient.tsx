"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, BudgetCategory, PaymentSource, BillingCycle } from "@/lib/types";
import { Amount } from "@/components/ui/amount";
import { CardList } from "@/components/cards/CardList";
import { CardDetail } from "@/components/cards/CardDetail";
import { CreditCardForm } from "@/components/cards/CreditCardForm";
import { AddChargeForm } from "@/components/cards/AddChargeForm";
import { PaymentSourceList } from "@/components/cards/PaymentSourceList";
import { PaymentSourceForm } from "@/components/cards/PaymentSourceForm";
import { AmbientGlow } from "@/components/ui/ambient-glow";
import { PullToRefreshIndicator } from "@/components/ui/pull-to-refresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Button } from "@/components/ui/button";
import { Wifi, CreditCardIcon, Pencil, Smartphone, Banknote } from "lucide-react";
import { formatDateShort, getCycleRange } from "@/lib/billing-cycles";

interface CardsPageClientProps {
  cards: CreditCard[];
  paymentSources: PaymentSource[];
  budgetCategories: BudgetCategory[];
  cycles: BillingCycle[];
  error: string | null;
}

export function CardsPageClient({
  cards,
  paymentSources,
  budgetCategories,
  cycles,
  error,
}: CardsPageClientProps) {
  const router = useRouter();
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { pullProgress } = usePullToRefresh(() => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  }, isRefreshing);

  function handleRefresh() {
    router.refresh();
  }

  const hasCards = cards.length > 0;
  const hasPaymentSources = paymentSources.length > 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 relative">
      <PullToRefreshIndicator progress={pullProgress} isRefreshing={isRefreshing} />
      <AmbientGlow color="emerald" position="bottom-left" />

      <div className="relative z-10">
        <h1 className="text-2xl font-semibold text-white">Cards &amp; Wallets</h1>
        <p className="text-sm text-zinc-500">
          Track cards, wallets and charges
        </p>
      </div>

      {error && (
        <div className="relative z-10 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* Credit Cards section */}
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Credit Cards
          </h2>
          <CreditCardForm onSuccess={handleRefresh} />
        </div>
        {hasCards ? (
          cards.length === 1 ? (
        <SingleCardView
            card={cards[0]}
            budgetCategories={budgetCategories}
            detailRefreshKey={detailRefreshKey}
            cycles={cycles}
            onRefresh={handleRefresh}
            onDetailRefresh={() => setDetailRefreshKey((k) => k + 1)}
          />
          ) : (
          <CardList
            cards={cards}
            budgetCategories={budgetCategories}
            cycles={cycles}
            onRefresh={handleRefresh}
          />
          )
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#18122B] p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#18122B]">
              <CreditCardIcon className="h-6 w-6 text-zinc-600" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-zinc-300">No cards yet</p>
              <p className="text-sm text-zinc-500">
                Add your first card to track charges.
              </p>
            </div>
            <CreditCardForm onSuccess={handleRefresh} />
          </div>
        )}
      </div>

      {/* Payment Sources section */}
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Other payment methods
          </h2>
          <PaymentSourceForm onSuccess={handleRefresh} />
        </div>
        {hasPaymentSources ? (
          <PaymentSourceList
            paymentSources={paymentSources}
            budgetCategories={budgetCategories}
            onRefresh={handleRefresh}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#18122B] p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#18122B]">
              <Smartphone className="h-6 w-6 text-zinc-600" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-zinc-300">No payment sources yet</p>
              <p className="text-sm text-zinc-500">
                Add a digital wallet or cash source to track spending.
              </p>
            </div>
            <PaymentSourceForm onSuccess={handleRefresh} />
          </div>
        )}
      </div>
    </div>
  );
}

function SingleCardView({
  card,
  budgetCategories,
  detailRefreshKey,
  cycles,
  onRefresh,
  onDetailRefresh,
}: {
  card: CreditCard;
  budgetCategories: BudgetCategory[];
  detailRefreshKey: number;
  cycles: BillingCycle[];
  onRefresh: () => void;
  onDetailRefresh: () => void;
}) {
  const cardCycles = cycles.filter((c) => c.credit_card_id === card.id);
  const openCycle = cardCycles.find((c) => c.status === "open");
  const cycleRange = getCycleRange(cardCycles, 0);

  return (
    <div className="space-y-4 relative z-10">
      {/* Card visual */}
      <div className="space-y-0 md:max-w-sm md:mx-auto">
        <div
          className="shine-card relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-900 via-violet-900 to-zinc-900 border border-[#18122B]"
          style={{
            boxShadow:
              "0 0 40px rgba(16, 185, 129,0.09), 0 20px 40px rgba(0,0,0,0.4)",
          }}
        >
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-white/60 rotate-90" />
              </div>
              <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
                {card.name}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-8 w-10 items-center justify-center rounded-md bg-amber-400/20 border border-amber-400/30">
                <div className="h-4 w-6 rounded-sm bg-gradient-to-r from-amber-300/40 to-amber-500/40" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-lg font-medium tracking-widest text-white/90 tabular-nums font-mono">
                •••• •••• •••• {card.last_four || "****"}
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Limit</p>
                <p className="text-sm font-semibold text-white tabular-nums font-mono">
                  {card.credit_limit_cents !== null
                    ? <Amount value={card.credit_limit_cents} className="font-mono" />
                    : "—"}
                </p>
              </div>
              {cycleRange && (
                <div className="flex flex-col items-end gap-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Cycle</p>
                  <p className="text-xs font-medium text-white/70 font-mono">
                    {cycleRange.label}
                  </p>
                  {openCycle && (
                    <p className="text-[10px] text-white/50">
                      Due {formatDateShort(openCycle.due_date)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card actions */}
        <div className="flex items-center gap-1 px-1 pt-2">
          <AddChargeForm
            card={card}
            budgetCategories={budgetCategories}
            onSuccess={() => {
              onDetailRefresh();
              onRefresh();
            }}
            trigger={
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-[#18122B]">
                + Charge
              </Button>
            }
          />
          <CreditCardForm
            card={card}
            cycles={cardCycles}
            onSuccess={onRefresh}
            trigger={
              <Button variant="ghost" size="icon" aria-label="Edit" className="min-h-[44px] min-w-[44px] text-zinc-500 hover:text-white hover:bg-[#18122B]">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      </div>

      {/* Auto-opened detail */}
      <div className="rounded-xl border border-[#18122B] bg-[#0f0c19] p-4">
        <CardDetail card={card} budgetCategories={budgetCategories} cycles={cardCycles} refreshTrigger={detailRefreshKey} />
      </div>
    </div>
  );
}
