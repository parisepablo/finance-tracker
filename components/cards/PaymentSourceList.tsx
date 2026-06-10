"use client";

import { useState, useEffect } from "react";
import { PaymentSource, BudgetCategory } from "@/lib/types";
import { PaymentSourceForm } from "./PaymentSourceForm";
import { PaymentSourceDetail } from "./PaymentSourceDetail";
import { AddPaymentSourceChargeForm } from "./AddPaymentSourceChargeForm";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SwipeableRowProvider } from "@/components/ui/swipeable-row-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Smartphone, Banknote, Pencil, Trash2, Eye } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface PaymentSourceListProps {
  paymentSources: PaymentSource[];
  budgetCategories: BudgetCategory[];
  currentMonth: string;
  onRefresh: () => void;
}

export function PaymentSourceList({
  paymentSources,
  budgetCategories,
  currentMonth,
  onRefresh,
}: PaymentSourceListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detailSource, setDetailSource] = useState<PaymentSource | null>(null);
  const [detailKey, setDetailKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  function openDeleteDialog(source: PaymentSource) {
    setDeletingId(source.id);
    setDeletingName(source.name);
    setConfirmOpen(true);
    haptics.medium();
  }

  async function handleDeleteConfirm() {
    if (!deletingId) return;

    try {
      const { deletePaymentSource } = await import("@/lib/actions/payment-sources");
      const result = await deletePaymentSource(deletingId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(`Payment source "${deletingName}" deleted`);
      haptics.light();
      setConfirmOpen(false);
      setDeletingId(null);
      onRefresh();
    } catch {
      toast.error("Network error. Please try again.");
    }
  }

  if (paymentSources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-800 p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
          <Smartphone className="h-6 w-6 text-zinc-600" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-zinc-300">No payment sources yet</p>
          <p className="text-sm text-zinc-500">
            Add a digital wallet or cash source to track spending.
          </p>
        </div>
        <PaymentSourceForm onSuccess={onRefresh} />
      </div>
    );
  }

  return (
    <SwipeableRowProvider>
      <div className="space-y-4 relative z-10">
        {paymentSources.map((source) => {
          const isCash = source.type === "cash";
          const Icon = isCash ? Banknote : Smartphone;
          return (
            <div key={source.id} className="space-y-0 md:max-w-sm md:mx-auto">
              {/* Payment source visual */}
              {isCash ? (
                <div
                  className="relative overflow-hidden rounded-2xl p-5 border border-emerald-800/60"
                  style={{
                    background: `linear-gradient(135deg, #2D6A4F, #1B4332)`,
                    boxShadow: `0 0 40px rgba(45,106,79,0.15), 0 20px 40px rgba(0,0,0,0.4)`,
                  }}
                >
                  {/* Decorative bill border */}
                  <div className="absolute inset-2 rounded-xl border border-dashed border-emerald-400/30 pointer-events-none" />
                  <div className="absolute inset-3 rounded-lg border border-emerald-300/20 pointer-events-none" />
                  {/* Watermark */}
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl font-bold text-emerald-100/10 pointer-events-none select-none">
                    $
                  </span>
                  <div className="relative z-10 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-emerald-200/80" />
                      </div>
                      <span className="text-xs font-medium text-emerald-200/60 uppercase tracking-wider">
                        Cash
                      </span>
                    </div>
                    <div>
                      <span className="text-lg font-semibold text-white">
                        {source.name}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="relative overflow-hidden rounded-2xl p-5 border border-zinc-800"
                  style={{
                    background: `linear-gradient(135deg, ${source.color}22, ${source.color}11)`,
                    boxShadow: `0 0 40px ${source.color}15, 0 20px 40px rgba(0,0,0,0.4)`,
                  }}
                >
                  <div className="relative z-10 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-white/70" />
                      </div>
                      <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
                        Digital wallet
                      </span>
                    </div>
                    <div>
                      <span className="text-lg font-semibold text-white">
                        {source.name}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions row */}
              <div className="flex items-center gap-1 px-1 pt-2">
                <AddPaymentSourceChargeForm
                  source={source}
                  budgetCategories={budgetCategories}
                  onSuccess={onRefresh}
                  trigger={
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                      + Charge
                    </Button>
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDetailSource(source);
                    setDetailKey((k) => k + 1);
                  }}
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  History
                </Button>
                <PaymentSourceForm
                  source={source}
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
                  onClick={() => openDeleteDialog(source)}
                  className="min-h-[44px] min-w-[44px] text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}

        <DeleteConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onConfirm={handleDeleteConfirm}
          title="Delete Payment Source"
          description="This will permanently delete"
          itemName={deletingName}
        />

        <Sheet
          open={!!detailSource}
          onOpenChange={(open) => {
            if (!open) setDetailSource(null);
          }}
        >
          <SheetContent
            side={isMobile ? "bottom" : "right"}
            className={cn(
              "bg-zinc-900",
              isMobile
                ? "h-auto max-h-[85vh] rounded-t-2xl border-t border-zinc-800"
                : "w-full max-w-sm border-l border-zinc-800"
            )}
          >
            {detailSource && (
              <>
                <SheetHeader className="pb-2">
                  <SheetTitle>{detailSource.name}</SheetTitle>
                  <SheetDescription>
                    Transaction history for this payment source
                  </SheetDescription>
                </SheetHeader>
                <PaymentSourceDetail
                  open={!!detailSource}
                  onOpenChange={(open) => {
                    if (!open) setDetailSource(null);
                  }}
                  source={detailSource}
                  budgetCategories={budgetCategories}
                  currentMonth={currentMonth}
                  refreshTrigger={detailKey}
                  onSuccess={onRefresh}
                />
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </SwipeableRowProvider>
  );
}
