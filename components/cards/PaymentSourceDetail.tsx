"use client";

import { useState, useEffect, useCallback } from "react";
import { PaymentSource, BudgetCategory } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import { SwipeableRowProvider } from "@/components/ui/swipeable-row-context";
import { PaymentSourceChargeSheet } from "./PaymentSourceChargeSheet";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { Receipt, Package, Zap } from "lucide-react";

interface PaymentSourceDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: PaymentSource;
  budgetCategories: BudgetCategory[];
  refreshTrigger: number;
  onSuccess: () => void;
}

interface TransactionItem {
  id: string;
  description: string;
  amount_cents: number;
  date: string;
  budget_category_id: string | null;
  is_installment: boolean;
  total_installments: number | null;
  current_installment: number | null;
}

export function PaymentSourceDetail({
  open,
  onOpenChange,
  source,
  budgetCategories,
  refreshTrigger,
  onSuccess,
}: PaymentSourceDetailProps) {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editChargeId, setEditChargeId] = useState<string | null>(null);
  const [deleteChargeId, setDeleteChargeId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, amount_cents, date, budget_category_id, is_installment, total_installments, current_installment")
        .eq("payment_source_id", source.id)
        .eq("user_id", source.user_id)
        .order("date", { ascending: false });

      if (error) {
        toast.error("Failed to load transactions");
        setTransactions([]);
      } else {
        setTransactions((data ?? []) as TransactionItem[]);
      }
    } catch {
      toast.error("Network error. Please try again.");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [open, source.id, source.user_id]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, refreshTrigger]);

  async function handleDeleteConfirm() {
    if (!deleteChargeId) return;
    setDeleteLoading(true);
    try {
      // Use a dummy card ID since the backend ignores it for payment source charges
      const res = await fetch(
        `/api/cards/00000000-0000-0000-0000-000000000000/charges/${deleteChargeId}`,
        { method: "DELETE" }
      );
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Failed to delete charge");
        setDeleteLoading(false);
        return;
      }
      toast.success("Charge deleted successfully");
      haptics.success();
      setDeleteChargeId(null);
      setTransactions((prev) => prev.filter((t) => t.id !== deleteChargeId));
      onSuccess();
    } catch {
      toast.error("Network error. Please try again.");
      setDeleteLoading(false);
    }
  }

  const totalSpent = transactions.reduce((sum, t) => sum + t.amount_cents, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">{source.name}</h2>
        <span className="text-sm font-mono text-zinc-400">
          Total: <Amount value={totalSpent} className="font-mono" />
        </span>
      </div>

      {loading && (
        <div className="text-sm text-zinc-500">Loading...</div>
      )}

      {transactions.length === 0 && !loading && (
        <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">
          No charges for this payment source yet.
        </div>
      )}

      <SwipeableRowProvider>
        <div className="space-y-2">
          {transactions.map((item) => {
            const isInstallment = item.is_installment && item.total_installments && item.current_installment;
            return (
              <SwipeableRow
                key={item.id}
                rowId={item.id}
                onEdit={() => setEditChargeId(item.id)}
                onDelete={() => {
                  haptics.medium();
                  setDeleteChargeId(item.id);
                }}
              >
                <div className="group flex flex-col gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-3 hover:bg-zinc-900/70 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-0.5 bg-indigo-500/50 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />
                  {/* Title line */}
                  <div className="flex items-center gap-2 pl-1">
                    {isInstallment ? (
                      <Package className="h-4 w-4 shrink-0 text-zinc-500" />
                    ) : (
                      <Zap className="h-4 w-4 shrink-0 text-zinc-500" />
                    )}
                    <p className="text-sm font-medium text-zinc-200 break-words">
                      {item.description}
                    </p>
                  </div>
                  {/* Metadata + amount line */}
                  <div className="flex items-center justify-between pl-1">
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                      >
                        {isInstallment ? "Installment" : "One-time"}
                      </Badge>
                      {isInstallment && (
                        <span className="text-xs text-zinc-500 font-mono">
                          {item.current_installment} of {item.total_installments}
                        </span>
                      )}
                      {item.budget_category_id && (
                        <span className="text-xs text-zinc-500">
                          {budgetCategories.find((c) => c.id === item.budget_category_id)?.name ?? ""}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 ml-2 text-right font-semibold text-white tabular-nums font-mono">
                      <Amount value={item.amount_cents} className="font-mono" />
                    </span>
                  </div>
                </div>
              </SwipeableRow>
            );
          })}
        </div>
      </SwipeableRowProvider>

      <PaymentSourceChargeSheet
        open={!!editChargeId}
        onOpenChange={(open) => {
          if (!open) setEditChargeId(null);
        }}
        chargeId={editChargeId}
        budgetCategories={budgetCategories}
        onSuccess={() => {
          setEditChargeId(null);
          fetchTransactions();
          onSuccess();
        }}
      />

      <DeleteConfirmDialog
        open={!!deleteChargeId}
        onOpenChange={(open) => {
          if (!open) setDeleteChargeId(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete charge"
        description="Are you sure you want to delete this charge?"
        itemName=""
        isLoading={deleteLoading}
      />
    </div>
  );
}
