"use client";

import { useState, useEffect, useCallback } from "react";
import { CreditCard, BudgetCategory, BillingCycle } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/glow-card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Receipt, Package, Zap } from "lucide-react";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import { SwipeableRowProvider } from "@/components/ui/swipeable-row-context";
import { toast } from "sonner";
import { EditChargeSheet } from "./EditChargeSheet";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { haptics } from "@/lib/haptics";
import { formatDateShort, toDateParam, getCycleRange } from "@/lib/billing-cycles";

interface MonthlySummaryItem {
  id: string;
  description: string;
  amount_cents: number;
  currency: "ARS" | "USD";
  type: "fixed" | "installment" | "single";
  date: string;
  purchase_date: string;
  current_installment?: number;
  total_installments?: number;
}

interface MonthlySummary {
  month: string;
  total_due_cents: number;
  breakdown: MonthlySummaryItem[];
}

interface CardDetailProps {
  card: CreditCard;
  budgetCategories: BudgetCategory[];
  cycles: BillingCycle[];
  refreshTrigger?: number;
}

function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function prevMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  const d = new Date(year, month - 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  const d = new Date(year, month);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}



export function CardDetail({ card, budgetCategories, cycles, refreshTrigger = 0 }: CardDetailProps) {
  const hasCycles = cycles.length > 0;
  const [month, setMonth] = useState(getCurrentMonth());
  const [cycleOffset, setCycleOffset] = useState(0);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editChargeId, setEditChargeId] = useState<string | null>(null);
  const [deleteChargeId, setDeleteChargeId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showCharges, setShowCharges] = useState(false);

  // Reset charges visibility when month or cycle changes
  useEffect(() => {
    setShowCharges(false);
  }, [month, cycleOffset]);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url: string;
      if (hasCycles) {
        const range = getCycleRange(cycles, cycleOffset);
        if (range) {
          url = `/api/cards/${card.id}?start=${range.start}&end=${range.end}`;
        } else {
          url = `/api/cards/${card.id}?month=${month}`;
        }
      } else {
        url = `/api/cards/${card.id}?month=${month}`;
      }
      const res = await fetch(url);
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Failed to load summary");
        setSummary(null);
      } else {
        setSummary(result);
      }
    } catch {
      setError("Network error. Please try again.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [card.id, cycles, hasCycles, month, cycleOffset]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, refreshTrigger]);

  async function handleDeleteConfirm() {
    if (!deleteChargeId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/cards/${card.id}/charges/${deleteChargeId}`,
        {
          method: "DELETE",
        }
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
      setSummary((prev) => {
        if (!prev) return prev;
        const removed = prev.breakdown.find((item) => item.id === deleteChargeId);
        return {
          ...prev,
          breakdown: prev.breakdown.filter((item) => item.id !== deleteChargeId),
          total_due_cents:
            prev.total_due_cents - (removed?.amount_cents ?? 0),
        };
      });
    } catch {
      toast.error("Network error. Please try again.");
      setDeleteLoading(false);
    }
  }

  const cycleRange = hasCycles ? getCycleRange(cycles, cycleOffset) : null;
  const maxOffset = cycles.length > 0 ? cycles.length - 1 : 0;

  return (
    <SwipeableRowProvider>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (hasCycles) {
                setCycleOffset((o) => Math.min(maxOffset, o + 1));
              } else {
                setMonth((m) => prevMonth(m));
              }
            }}
            className="min-h-[44px] min-w-[44px] text-zinc-500 hover:text-white hover:bg-[#18122B]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col items-center min-w-[140px]">
            {hasCycles ? (
              <>
                <span className="text-center text-sm font-medium capitalize text-zinc-200 font-mono">
                  {cycleRange?.label ?? "—"}
                </span>
                {cycleOffset === 0 && (
                  <span className="text-[10px] text-emerald-400">Current</span>
                )}
              </>
            ) : (
              <span className="text-center text-sm font-medium capitalize text-zinc-200 font-mono">
                {formatMonthLabel(month)}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (hasCycles) {
                setCycleOffset((o) => Math.max(0, o - 1));
              } else {
                setMonth((m) => nextMonth(m));
              }
            }}
            disabled={hasCycles ? cycleOffset === 0 : false}
            className="min-h-[44px] min-w-[44px] text-zinc-500 hover:text-white hover:bg-[#18122B] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-zinc-500">Loading...</div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {summary && (
        <>
          <GlowCard color="emerald">
            <div className="p-5 space-y-2">
              <span className="text-xs font-medium uppercase tracking-widest text-emerald-400">
                Total Due — {formatMonthLabel(month)}
              </span>
              <div className="text-3xl font-bold text-white tabular-nums font-mono">
                <Amount value={summary.total_due_cents} className="font-mono" />
              </div>
            </div>
          </GlowCard>

          {summary.breakdown.length > 0 && (
            <button
              type="button"
              onClick={() => setShowCharges((s) => !s)}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-[#18122B] bg-[#0f0c19] px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-[#18122B] transition-colors"
            >
              {showCharges ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide charges
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show {summary.breakdown.length} charge
                  {summary.breakdown.length === 1 ? "" : "s"}
                </>
              )}
            </button>
          )}

          {summary.breakdown.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#18122B] p-6 text-center text-sm text-zinc-500">
              No charges for this month.
            </div>
          )}

          {showCharges && summary.breakdown.length > 0 && (
            <div className="space-y-2 animate-in fade-in duration-300">
              {summary.breakdown.map((item) => (
              <SwipeableRow
                key={item.id}
                rowId={item.id}
                onEdit={() => setEditChargeId(item.id)}
                onDelete={() => {
                  haptics.medium();
                  setDeleteChargeId(item.id);
                }}
              >
                <div className="group flex flex-col gap-1 rounded-xl border border-[#18122B] bg-[#0f0c19] p-3 hover:bg-[#0f0c19]/70 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-0.5 bg-emerald-500/50 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />
                  {/* Title line */}
                  <div className="flex items-center gap-2 pl-1">
                    {item.type === "fixed" && (
                      <Receipt className="h-4 w-4 shrink-0 text-zinc-500" />
                    )}
                    {item.type === "installment" && (
                      <Package className="h-4 w-4 shrink-0 text-zinc-500" />
                    )}
                    {item.type === "single" && (
                      <Zap className="h-4 w-4 shrink-0 text-zinc-500" />
                    )}
                    <p className="text-sm font-medium text-zinc-200 break-words">
                      {item.type === "fixed"
                        ? `Fixed — ${item.description}`
                        : item.description}
                    </p>
                  </div>
                  {/* Metadata + amount line */}
                  <div className="flex items-center justify-between pl-1">
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${item.type === "installment" ? "hidden sm:inline-flex" : ""}`}
                      >
                        {item.type === "fixed"
                          ? "Fixed Expense"
                          : item.type === "installment"
                            ? "Installment"
                            : "One-time"}
                      </Badge>
                      {item.type === "installment" &&
                        item.current_installment !== undefined &&
                        item.total_installments !== undefined && (
                          <span className="text-xs text-zinc-500 font-mono">
                            {item.current_installment} of{" "}
                            {item.total_installments}
                          </span>
                        )}
                    </div>
                    <span className="shrink-0 ml-2 text-right font-semibold text-white tabular-nums font-mono">
                      <Amount value={item.amount_cents} currency={item.currency} className="font-mono" />
                    </span>
                  </div>
                </div>
              </SwipeableRow>
            ))}
          </div>
        )}
      </>
    )}
      <EditChargeSheet
        open={!!editChargeId}
        onOpenChange={(open) => {
          if (!open) setEditChargeId(null);
        }}
        cardId={card.id}
        chargeId={editChargeId}
        budgetCategories={budgetCategories}
        onSuccess={() => {
          setEditChargeId(null);
          fetchSummary();
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
    </SwipeableRowProvider>
  );
}
