"use client";

import { useState } from "react";
import { IncomeSource, FixedExpense, CreditCard } from "@/lib/types";
import { getCurrentMonth, getMonthlyEquivalent } from "@/lib/utils";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/glow-card";
import { IncomeForm } from "@/components/income/IncomeForm";
import { FixedExpenseForm } from "@/components/expenses/FixedExpenseForm";
import { toast } from "sonner";
import {
  ArrowRight,
  Banknote,
  Check,
  CircleAlert,
  Pencil,
  Receipt,
  X,
} from "lucide-react";

interface MonthlyReviewProps {
  incomeSources: IncomeSource[];
  expenses: FixedExpense[];
  creditCards: CreditCard[];
  currentMonth: string;
  onRefresh: () => void;
}

type ReviewItem = {
  type: "income" | "expense";
  id: string;
};

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatShortMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function MonthlyReview({
  incomeSources,
  expenses,
  creditCards,
  currentMonth,
  onRefresh,
}: MonthlyReviewProps) {
  const carriedIncome = incomeSources.filter(
    (source) => source.effective_from_month < currentMonth
  );
  const carriedExpenses = expenses.filter(
    (expense) => expense.effective_from_month < currentMonth
  );
  const totalItems = carriedIncome.length + carriedExpenses.length;
  const [busyItem, setBusyItem] = useState<ReviewItem | null>(null);
  const [editingIncome, setEditingIncome] = useState<IncomeSource | null>(null);
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);

  if (currentMonth !== getCurrentMonth() || totalItems === 0) return null;

  async function updateItem(item: ReviewItem, keep: boolean) {
    setBusyItem(item);
    let itemName = "";
    let request:
      | { method: "PATCH"; url: string; body: Record<string, unknown> }
      | { method: "DELETE"; url: string; body: undefined };

    if (item.type === "income") {
      const source = carriedIncome.find((value) => value.id === item.id);
      if (!source) {
        setBusyItem(null);
        return;
      }
      itemName = source.name;
      request = keep
        ? {
            method: "PATCH",
            url: `/api/income/${item.id}`,
            body: {
              name: source.name,
              amount_cents: source.amount_cents,
              currency: source.currency,
              is_active: source.is_active,
              effective_from_month: currentMonth,
            },
          }
        : {
            method: "DELETE",
            url: `/api/income/${item.id}?from_month=${encodeURIComponent(currentMonth)}`,
            body: undefined,
          };
    } else {
      const source = carriedExpenses.find((value) => value.id === item.id);
      if (!source) {
        setBusyItem(null);
        return;
      }
      itemName = source.name;
      request = keep
        ? {
            method: "PATCH",
            url: `/api/expenses/${item.id}`,
            body: {
              name: source.name,
              category: source.category,
              amount_cents: source.amount_cents,
              is_estimated: source.is_estimated,
              billing_cycle: source.billing_cycle,
              payment_method: source.payment_method,
              credit_card_id: source.credit_card_id,
              due_day: source.due_day,
              is_essential: source.is_essential,
              is_active: source.is_active,
              effective_from_month: currentMonth,
            },
          }
        : {
            method: "DELETE",
            url: `/api/expenses/${item.id}?from_month=${encodeURIComponent(currentMonth)}`,
            body: undefined,
          };
    }

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.body ? { "Content-Type": "application/json" } : undefined,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to update this item");
      }

      toast.success(
        keep
          ? `${itemName} confirmed for ${formatMonth(currentMonth)}`
          : `${itemName} stopped from ${formatMonth(currentMonth)}`
      );
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update this item");
    } finally {
      setBusyItem(null);
    }
  }

  return (
    <>
      <GlowCard color="emerald">
        <div className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <CircleAlert className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-amber-400">
                  Monthly review
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  Review {formatMonth(currentMonth)}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  These recurring values were carried over. Confirm them, change them, or stop them for this month.
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              {totalItems} item{totalItems === 1 ? "" : "s"} to review
            </span>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {carriedIncome.map((source) => {
              const item = { type: "income" as const, id: source.id };
              const busy = busyItem?.type === item.type && busyItem.id === item.id;
              return (
                <div key={source.id} className="rounded-xl border border-[#2a2345] bg-[#0f0c19]/70 p-4">
                  <div className="flex items-start gap-3">
                    <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-zinc-200">{source.name}</span>
                        <span className="rounded-full bg-[#18122B] px-2 py-0.5 text-[10px] text-zinc-400">
                          Since {formatShortMonth(source.effective_from_month)}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-sm text-white">
                        <Amount value={source.amount_cents} currency={source.currency} />
                        <span className="ml-1 text-xs text-zinc-500">/ month</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => updateItem(item, false)} className="text-zinc-400 hover:text-rose-300">
                      <X className="mr-1.5 h-3.5 w-3.5" /> Stop
                    </Button>
                    <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setEditingIncome(source)} className="text-zinc-400 hover:text-white">
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Change
                    </Button>
                    <Button type="button" size="sm" disabled={busy} onClick={() => updateItem(item, true)}>
                      <Check className="mr-1.5 h-3.5 w-3.5" /> Keep
                    </Button>
                  </div>
                </div>
              );
            })}

            {carriedExpenses.map((expense) => {
              const item = { type: "expense" as const, id: expense.id };
              const busy = busyItem?.type === item.type && busyItem.id === item.id;
              return (
                <div key={expense.id} className="rounded-xl border border-[#2a2345] bg-[#0f0c19]/70 p-4">
                  <div className="flex items-start gap-3">
                    <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-zinc-200">{expense.name}</span>
                        <span className="rounded-full bg-[#18122B] px-2 py-0.5 text-[10px] text-zinc-400">
                          Since {formatShortMonth(expense.effective_from_month)}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-sm text-white">
                        <Amount value={getMonthlyEquivalent(expense.amount_cents, expense.billing_cycle)} />
                        <span className="ml-1 text-xs text-zinc-500">/ month</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => updateItem(item, false)} className="text-zinc-400 hover:text-rose-300">
                      <X className="mr-1.5 h-3.5 w-3.5" /> Stop
                    </Button>
                    <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setEditingExpense(expense)} className="text-zinc-400 hover:text-white">
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Change
                    </Button>
                    <Button type="button" size="sm" disabled={busy} onClick={() => updateItem(item, true)}>
                      <Check className="mr-1.5 h-3.5 w-3.5" /> Keep
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
            <ArrowRight className="h-3.5 w-3.5" />
            Keeping an item creates a current-month version without changing previous months.
          </div>
        </div>
      </GlowCard>

      {editingIncome && (
        <IncomeForm
          income={editingIncome}
          defaultMonth={currentMonth}
          onSuccess={() => {
            setEditingIncome(null);
            onRefresh();
          }}
          open
          onOpenChange={(open) => {
            if (!open) setEditingIncome(null);
          }}
          trigger={<span className="hidden" />}
        />
      )}
      {editingExpense && (
        <FixedExpenseForm
          expense={editingExpense}
          creditCards={creditCards}
          defaultMonth={currentMonth}
          onSuccess={() => {
            setEditingExpense(null);
            onRefresh();
          }}
          open
          onOpenChange={(open) => {
            if (!open) setEditingExpense(null);
          }}
          trigger={<span className="hidden" />}
        />
      )}
    </>
  );
}
