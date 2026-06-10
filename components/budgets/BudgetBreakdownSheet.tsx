"use client";

import { useState, useEffect, useMemo } from "react";
import { Transaction, CreditCard, PaymentSource, BudgetCategoryWithStats } from "@/lib/types";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Receipt } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BudgetBreakdownSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: BudgetCategoryWithStats | null;
  transactions: Transaction[];
  creditCards: CreditCard[];
  paymentSources: PaymentSource[];
  currentMonth: string;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function formatMonthYear(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

export function BudgetBreakdownSheet({
  open,
  onOpenChange,
  category,
  transactions,
  creditCards,
  paymentSources,
  currentMonth,
}: BudgetBreakdownSheetProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const filtered = useMemo(() => {
    if (!category) return [];
    return transactions
      .filter((tx) => tx.budget_category_id === category.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, category]);

  const totalSpent = filtered.reduce((sum, tx) => sum + tx.amount_cents, 0);

  function getPaymentMethod(tx: Transaction) {
    if (tx.credit_card_id) {
      const card = creditCards.find((c) => c.id === tx.credit_card_id);
      return { name: card?.name ?? "Tarjeta", color: card ? undefined : "#6366f1" };
    }
    if (tx.payment_source_id) {
      const source = paymentSources.find((s) => s.id === tx.payment_source_id);
      return { name: source?.name ?? "Otro", color: source?.color ?? "#6366f1" };
    }
    return { name: "Otro", color: "#6366f1" };
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "bg-zinc-900 flex flex-col",
          isMobile
            ? "h-auto max-h-[85vh] rounded-t-2xl border-t border-zinc-800"
            : "w-full max-w-sm border-l border-zinc-800"
        )}
      >
        <SheetHeader className="pb-2 shrink-0">
          <SheetTitle>
            {category?.name ?? "Desglose"}
          </SheetTitle>
          <SheetDescription>
            {formatMonthYear(currentMonth)}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                <Receipt className="h-5 w-5 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-500">
                No hay gastos este mes
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((tx) => {
                const method = getPaymentMethod(tx);
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {tx.description || "Sin descripción"}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-zinc-500">
                          {formatShortDate(tx.date)}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                          style={{
                            borderColor: method.color ? `${method.color}40` : undefined,
                            backgroundColor: method.color ? `${method.color}15` : undefined,
                            color: method.color ?? undefined,
                          }}
                        >
                          {method.name}
                        </Badge>
                      </div>
                    </div>
                    <span className="shrink-0 ml-3 text-sm font-semibold text-white tabular-nums font-mono">
                      <Amount value={tx.amount_cents} className="font-mono" />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-zinc-800 pt-3 pb-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Total gastado</span>
            <span className="text-lg font-bold text-white tabular-nums font-mono">
              <Amount value={totalSpent} className="font-mono" />
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
