"use client";

import { useState } from "react";
import { CreditCard, BudgetCategory, BillingCycle } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { CreditCardForm } from "./CreditCardForm";
import { AddChargeForm } from "./AddChargeForm";
import { CardDetail } from "./CardDetail";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { toast } from "sonner";
import { CreditCardIcon, Pencil, Trash2, Eye, Wifi } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { formatDateShort, getCycleRange } from "@/lib/billing-cycles";

interface CardListProps {
  cards: CreditCard[];
  budgetCategories: BudgetCategory[];
  cycles: BillingCycle[];
  onRefresh: () => void;
}

export function CardList({ cards, budgetCategories, cycles, onRefresh }: CardListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState<CreditCard | null>(null);

  function openDeleteDialog(item: CreditCard) {
    setConfirmItem(item);
    setConfirmOpen(true);
    setError(null);
    haptics.medium();
  }

  async function handleDelete() {
    if (!confirmItem) return;

    setDeletingId(confirmItem.id);
    setError(null);

    try {
      const res = await fetch(`/api/cards/${confirmItem.id}`, { method: "DELETE" });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to delete credit card");
        toast.error(result.error || "Failed to delete credit card");
        setDeletingId(null);
        return;
      }

      toast.success(`Credit card "${confirmItem.name}" deleted`);
      haptics.light();
      setConfirmOpen(false);
      setConfirmItem(null);
      onRefresh();
    } catch {
      setError("Network error. Please try again.");
      toast.error("Network error. Please try again.");
      setDeletingId(null);
    }
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-800 p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
          <CreditCardIcon className="h-6 w-6 text-zinc-600" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-zinc-300">No credit cards yet</p>
          <p className="text-sm text-zinc-500">
            Add your first credit card to track charges.
          </p>
        </div>
        <CreditCardForm onSuccess={onRefresh} />
      </div>
    );
  }

  return (
    <div className="space-y-4 relative z-10">
      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {cards.map((card) => {
        const cardCycles = cycles.filter((c) => c.credit_card_id === card.id);
        const openCycle = cardCycles.find((c) => c.status === "open");
        const cycleRange = getCycleRange(cardCycles, 0);

        return (
        <div key={card.id} className="space-y-0 md:max-w-sm md:mx-auto">
          {/* Credit card visual */}
          <div className="shine-card relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-indigo-900 via-violet-900 to-zinc-900 border border-zinc-800 shadow-xl shadow-black/40" style={{ boxShadow: '0 0 40px rgba(99,102,241,0.09), 0 20px 40px rgba(0,0,0,0.4)' }}>
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

          {/* Card actions row */}
          <div className="flex items-center gap-1 px-1 pt-2">
            <AddChargeForm
              card={card}
              budgetCategories={budgetCategories}
              onSuccess={() => {
                setExpandedId(card.id);
                setDetailRefreshKey((k) => k + 1);
                onRefresh();
              }}
              trigger={
                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                  + Charge
                </Button>
              }
            />
            <CreditCardForm
              card={card}
              cycles={cardCycles}
              onSuccess={onRefresh}
              trigger={
                <Button variant="ghost" size="icon" aria-label="Edit" className="min-h-[44px] min-w-[44px] text-zinc-500 hover:text-white hover:bg-zinc-800">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete"
              disabled={deletingId === card.id}
              onClick={() => openDeleteDialog(card)}
              className="min-h-[44px] min-w-[44px] text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="View detail"
              onClick={() =>
                setExpandedId(expandedId === card.id ? null : card.id)
              }
              className="min-h-[44px] min-w-[44px] text-zinc-500 hover:text-white hover:bg-zinc-800"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>

          {expandedId === card.id && (
            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <CardDetail card={card} budgetCategories={budgetCategories} cycles={cardCycles} refreshTrigger={detailRefreshKey} />
            </div>
          )}
        </div>
      );
      })}

      <DeleteConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDelete}
        title="Delete Credit Card"
        description="This will permanently delete"
        itemName={confirmItem?.name ?? ""}
        isLoading={!!deletingId}
      />
    </div>
  );
}
