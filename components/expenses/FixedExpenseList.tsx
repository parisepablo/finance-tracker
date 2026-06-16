"use client";

import { useState } from "react";
import { FixedExpense, CreditCard } from "@/lib/types";
import { formatCurrency, getMonthlyEquivalent } from "@/lib/utils";
import { Amount } from "@/components/ui/amount";
import { GlowCard } from "@/components/ui/glow-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FixedExpenseForm } from "./FixedExpenseForm";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { toast } from "sonner";
import {
  Pencil,
  Trash2,
  Home,
  Tv,
  Car,
  HeartPulse,
  GraduationCap,
  CircleDot,
  Calendar,
  Receipt,
  Check,
} from "lucide-react";
import { haptics } from "@/lib/haptics";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import { SwipeableRowProvider } from "@/components/ui/swipeable-row-context";

interface FixedExpenseListProps {
  expenses: FixedExpense[];
  creditCards: CreditCard[];
  paidExpenseIds?: string[];
  currentMonth?: string;
  onRefresh: () => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  Housing: <Home className="h-4 w-4" />,
  Subscriptions: <Tv className="h-4 w-4" />,
  Transport: <Car className="h-4 w-4" />,
  Health: <HeartPulse className="h-4 w-4" />,
  Education: <GraduationCap className="h-4 w-4" />,
  Other: <CircleDot className="h-4 w-4" />,
};

const categoryOrder = [
  "Housing",
  "Subscriptions",
  "Transport",
  "Health",
  "Education",
  "Other",
];

export function FixedExpenseList({
  expenses,
  creditCards,
  paidExpenseIds = [],
  currentMonth,
  onRefresh,
}: FixedExpenseListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState<FixedExpense | null>(null);
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set(paidExpenseIds));
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<FixedExpense | null>(null);
  const [filter, setFilter] = useState<"all" | "essential" | "optional">("all");

  function openDeleteDialog(item: FixedExpense) {
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
      const res = await fetch(`/api/expenses/${confirmItem.id}`, { method: "DELETE" });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to delete fixed expense");
        toast.error(result.error || "Failed to delete fixed expense");
        setDeletingId(null);
        return;
      }

      toast.success(`Fixed expense "${confirmItem.name}" deleted`);
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

  async function togglePaid(expenseId: string, markPaid: boolean) {
    if (!currentMonth || togglingId === expenseId) return;
    setTogglingId(expenseId);

    setPaidIds((prev) => {
      const next = new Set(prev);
      if (markPaid) next.add(expenseId);
      else next.delete(expenseId);
      return next;
    });

    try {
      if (markPaid) {
        haptics.success();
        const res = await fetch("/api/expenses/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fixed_expense_id: expenseId, paid_month: currentMonth }),
        });
        if (!res.ok) {
          const result = await res.json();
          throw new Error(result.error || "Failed to mark as paid");
        }
      } else {
        const res = await fetch(
          `/api/expenses/payments?fixed_expense_id=${expenseId}&paid_month=${currentMonth}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const result = await res.json();
          throw new Error(result.error || "Failed to unmark");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setPaidIds((prev) => {
        const next = new Set(prev);
        if (markPaid) next.delete(expenseId);
        else next.add(expenseId);
        return next;
      });
    } finally {
      setTogglingId(null);
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#18122B] p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#18122B]">
          <Receipt className="h-6 w-6 text-zinc-600" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-zinc-300">No fixed expenses yet</p>
          <p className="text-sm text-zinc-500">
            Add your first fixed expense to get started.
          </p>
        </div>
        <FixedExpenseForm creditCards={creditCards} onSuccess={onRefresh} />
      </div>
    );
  }

  const grouped = expenses.reduce<Record<string, FixedExpense[]>>(
    (acc, expense) => {
      const cat = expense.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(expense);
      return acc;
    },
    {}
  );

  const filteredGrouped = categoryOrder.map((category) => {
    const items = grouped[category];
    if (!items) return null;
    const filtered =
      filter === "all"
        ? items
        : filter === "essential"
          ? items.filter((e) => e.is_essential)
          : items.filter((e) => !e.is_essential);
    if (filtered.length === 0) return null;
    return { category, items: filtered };
  }).filter(Boolean);

  return (
    <SwipeableRowProvider>
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "essential" | "optional")}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="essential">Essential</TabsTrigger>
            <TabsTrigger value="optional">Optional</TabsTrigger>
          </TabsList>
        </Tabs>

        {filteredGrouped.map((group) => {
          if (!group) return null;
          const { category, items } = group;

          return (
            <div key={category}>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-zinc-500">
                {categoryIcons[category] ?? <CircleDot className="h-4 w-4" />}
                <span>{category}</span>
              </div>
              <div className="space-y-2">
                {items.map((expense) => {
                const monthlyCents = getMonthlyEquivalent(
                  expense.amount_cents,
                  expense.billing_cycle
                );
                const cycleLabel =
                  expense.billing_cycle === "quarterly"
                    ? "Quarterly ÷3"
                    : expense.billing_cycle === "annual"
                      ? "Annual ÷12"
                      : "Monthly";
                const isPaid = paidIds.has(expense.id);

                return (
                  <SwipeableRow
                    key={expense.id}
                    rowId={expense.id}
                    onEdit={() => setEditingItem(expense)}
                    onDelete={() => openDeleteDialog(expense)}
                  >
                  <GlowCard
                    color="emerald"
                    className={!expense.is_active ? "opacity-60" : undefined}
                  >
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-zinc-600">
                          {categoryIcons[expense.category] ?? (
                            <CircleDot className="h-4 w-4" />
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-zinc-200">{expense.name}</span>
                            <Badge
                              variant={expense.is_essential ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {expense.is_essential ? "Essential" : "Optional"}
                            </Badge>
                            <Badge
                              variant={
                                expense.is_active ? "default" : "secondary"
                              }
                            >
                              {expense.is_active ? "Active" : "Paused"}
                            </Badge>
                            {isPaid && (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                                <Check className="mr-1 h-3 w-3" />
                                Paid
                              </Badge>
                            )}
                          </div>
                           <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                            {expense.due_day && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due day <span className="font-mono">{expense.due_day}</span>
                              </span>
                            )}
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {expense.month}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {cycleLabel}
                            </Badge>
                            {expense.payment_method === "credit_card" && (
                              <Badge variant="outline" className="text-[10px]">
                                Credit Card
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full justify-between sm:w-auto sm:justify-start">
                        <div className="hidden md:flex items-center gap-1">
                          <FixedExpenseForm
                            expense={expense}
                            creditCards={creditCards}
                            onSuccess={onRefresh}
                            open={editingItem?.id === expense.id}
                            onOpenChange={(open) => {
                              if (!open) setEditingItem(null);
                            }}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Edit"
                                className="min-h-[44px] min-w-[44px] text-zinc-500 hover:text-white hover:bg-[#18122B]"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            disabled={deletingId === expense.id}
                            onClick={() => openDeleteDialog(expense)}
                            className="min-h-[44px] min-w-[44px] text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-white tabular-nums font-mono">
                            {expense.is_estimated && (
                              <span className="text-zinc-500">~ </span>
                            )}
                            <Amount value={monthlyCents} className="font-mono" />
                            <span className="ml-1 text-sm font-normal text-zinc-500 font-sans">
                              / mo
                            </span>
                          </p>
                          <p className="text-xs text-zinc-600 font-mono">
                            <Amount value={expense.amount_cents} className="font-mono" />{" "}
                            {expense.billing_cycle === "monthly"
                              ? "/ mo"
                              : expense.billing_cycle === "quarterly"
                                ? "/ qtr"
                                : "/ yr"}
                          </p>
                        </div>
                        {currentMonth && (
                          <button
                            onClick={() => togglePaid(expense.id, !isPaid)}
                            disabled={togglingId === expense.id}
                            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border transition-colors ${
                              isPaid
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/50"
                                : "border-[#231c3d] bg-[#0f0c19] text-zinc-500 hover:border-emerald-500/50 hover:text-emerald-400"
                            }`}
                            aria-label={isPaid ? "Unmark as paid" : "Mark as paid"}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </GlowCard>
                  </SwipeableRow>
                );
              })}
            </div>
          </div>
        );
      })}

      <DeleteConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDelete}
        title="Delete Fixed Expense"
        description="This will permanently delete"
        itemName={confirmItem?.name ?? ""}
        isLoading={!!deletingId}
      />
    </div>
    </SwipeableRowProvider>
  );
}
