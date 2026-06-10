"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { PullToRefreshIndicator } from "@/components/ui/pull-to-refresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { BudgetDonut } from "@/components/budgets/BudgetDonut";
import { GlowCard } from "@/components/ui/glow-card";
import {
  CreditCard,
  Banknote,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  PieChart,
} from "lucide-react";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";

interface DashboardBudgetItem {
  id: string;
  name: string;
  color: string;
  allocatedCents: number;
  spentCents: number;
  spentPercentage: number;
}

interface DashboardCardItem {
  id: string;
  name: string;
  totalCents: number;
}

interface DashboardUpcomingExpense {
  id: string;
  name: string;
  category: string;
  amountCents: number;
  dueDay: number;
  daysUntilDue: number;
  billingCycle: string;
}

interface DashboardClientProps {
  totalIncomeCents: number;
  totalFixedCents: number;
  essentialFixedCents: number;
  optionalFixedCents: number;
  discretionaryPoolCents: number;
  ccPaymentDueCents: number;
  finalPoolCents: number;
  budgets: DashboardBudgetItem[];
  cards: DashboardCardItem[];
  totalCccChargesCents: number;
  totalSpentCents: number;
  remainingCents: number;
  paymentSourceSpendingCents: number;
  realCashAvailableCents: number;
  upcomingExpenses: DashboardUpcomingExpense[];
  paidExpenseIds: string[];
  prevMonthName: string;
  currentMonthName: string;
  currentMonth: string;
}

function AnimatedAmount({ cents }: { cents: number }) {
  const animated = useAnimatedNumber(cents, 600);
  return <Amount value={animated} className="font-mono" />;
}

export function DashboardClient({
  totalIncomeCents,
  totalFixedCents,
  essentialFixedCents,
  optionalFixedCents,
  ccPaymentDueCents,
  finalPoolCents,
  budgets,
  cards,
  totalCccChargesCents,
  totalSpentCents,
  remainingCents,
  realCashAvailableCents,
  upcomingExpenses,
  paidExpenseIds,
  prevMonthName,
  currentMonthName,
  currentMonth,
}: DashboardClientProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set(paidExpenseIds));
  const [showPaid, setShowPaid] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { pullProgress } = usePullToRefresh(() => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  }, isRefreshing);

  const unpaidExpenses = upcomingExpenses.filter((exp) => !paidIds.has(exp.id));
  const paidExpenses = upcomingExpenses.filter((exp) => paidIds.has(exp.id));

  async function togglePaid(expenseId: string, markPaid: boolean) {
    if (togglingId === expenseId) return;
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
        toast.success("Marked as paid");
      } else {
        const res = await fetch(
          `/api/expenses/payments?fixed_expense_id=${expenseId}&paid_month=${currentMonth}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const result = await res.json();
          throw new Error(result.error || "Failed to unmark");
        }
        toast.success("Unmarked");
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

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PullToRefreshIndicator progress={pullProgress} isRefreshing={isRefreshing} />

      <div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500">Your monthly financial picture</p>
      </div>

      {/* Section 1 — Top grid (4 metric cards) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Monthly income */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 mb-1">
            Monthly income
          </p>
          <p className="text-xl font-bold text-white tabular-nums font-mono">
            <AnimatedAmount cents={totalIncomeCents} />
          </p>
          <p className="text-[10px] text-zinc-500 mt-1">Total monthly income</p>
        </div>

        {/* Fixed expenses */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 mb-1">
            Fixed expenses
          </p>
          <p className="text-xl font-bold text-rose-400 tabular-nums font-mono">
            <AnimatedAmount cents={-totalFixedCents} />
          </p>
          <div className="space-y-0.5 mt-1">
            <p className="text-[10px] text-zinc-500 font-mono">
              Essential: <Amount value={essentialFixedCents} className="font-mono" />
            </p>
            <p className="text-[10px] text-zinc-500 font-mono">
              Optional: <Amount value={optionalFixedCents} className="font-mono" />
            </p>
          </div>
        </div>

        {/* CC payment due */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              CC payment due
            </p>
            <Badge variant="outline" className="text-[9px] px-1 py-0 text-zinc-500 border-zinc-700">
              {prevMonthName}
            </Badge>
          </div>
          <p className="text-xl font-bold text-rose-400 tabular-nums font-mono">
            <AnimatedAmount cents={-ccPaymentDueCents} />
          </p>
          <p className="text-[10px] text-zinc-500 mt-1">Previous cycle payment</p>
        </div>

        {/* Discretionary pool */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 mb-1">
            Discretionary pool
          </p>
          <p className="text-xl font-bold text-white tabular-nums font-mono">
            <AnimatedAmount cents={finalPoolCents} />
          </p>
          <p className="text-[10px] text-zinc-500 mt-1">Available after obligations</p>
        </div>
      </div>

      {/* Section 2 — Spending this month (Donut charts) */}
      <div className="space-y-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Spending this month
          </h2>
          <p className="text-[10px] text-zinc-500">vs discretionary pool</p>
        </div>

        {budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 p-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
              <PieChart className="h-5 w-5 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">No budget categories yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {budgets.map((cat) => (
                <GlowCard key={cat.id} color="indigo">
                  <div className="p-4 flex flex-col items-center">
                    <BudgetDonut
                      spentPercentage={cat.spentPercentage}
                      color={cat.color}
                      name={cat.name}
                      spentCents={cat.spentCents}
                      allocatedCents={cat.allocatedCents}
                    />
                  </div>
                </GlowCard>
              ))}
            </div>

            {/* Summary row */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">Total spent</span>
                <span className="text-sm font-bold text-white tabular-nums font-mono">
                  <Amount value={totalSpentCents} className="font-mono" />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Remaining</span>
                <span
                  className={`text-sm font-bold tabular-nums font-mono ${
                    remainingCents >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  <Amount value={remainingCents} className="font-mono" />
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Due Soon section */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Due Soon
        </h2>
        {upcomingExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 p-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
              <CalendarDays className="h-5 w-5 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">
              No fixed expenses due in the next 7 days.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Unpaid items */}
            {unpaidExpenses.map((exp) => (
              <div
                key={exp.id}
                className="group flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
                    <CalendarDays className="h-4 w-4 text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{exp.name}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Badge variant="outline" className="text-[10px]">
                        {exp.category}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {exp.billingCycle === "monthly"
                          ? "Monthly"
                          : exp.billingCycle === "quarterly"
                            ? "Quarterly"
                            : "Annual"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex w-full items-center justify-between sm:w-auto sm:justify-start sm:gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-white tabular-nums font-mono">
                      <Amount value={exp.amountCents} className="font-mono" />
                    </p>
                    <p className="text-xs text-zinc-500 font-mono">
                      Due in {exp.daysUntilDue} day
                      {exp.daysUntilDue === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    onClick={() => togglePaid(exp.id, true)}
                    disabled={togglingId === exp.id}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
                    aria-label="Mark as paid"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Paid this month collapsible */}
            {paidExpenses.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                <button
                  onClick={() => setShowPaid((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-800/40 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="font-mono">{paidExpenses.length}</span> paid this month
                  </span>
                  {showPaid ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                {showPaid && (
                  <div className="space-y-1 px-4 pb-4">
                    {paidExpenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between rounded-lg bg-zinc-800 px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <Check className="h-4 w-4 text-emerald-400" />
                          <span className="text-sm text-zinc-400 line-through">
                            {exp.name}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {exp.category}
                          </Badge>
                        </div>
                        <div className="flex w-full items-center justify-between sm:w-auto sm:justify-start sm:gap-3">
                          <span className="text-xs text-zinc-500 font-mono line-through">
                            <Amount value={exp.amountCents} className="font-mono line-through" />
                          </span>
                          <button
                            onClick={() => togglePaid(exp.id, false)}
                            disabled={togglingId === exp.id}
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-rose-500/50 hover:text-rose-400 transition-colors"
                            aria-label="Unmark as paid"
                          >
                            <span className="text-xs">×</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 3 — Current CC charges */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Current CC charges
          </h2>
          <Badge variant="outline" className="text-[9px] px-1 py-0 text-zinc-500 border-zinc-700">
            {currentMonthName}
          </Badge>
        </div>

        {cards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">
            No credit cards yet.
          </div>
        ) : (
          <div className="space-y-2">
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-3"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm text-zinc-300">{card.name}</span>
                </div>
                <span className="text-sm font-semibold text-rose-400 tabular-nums font-mono">
                  <Amount value={-card.totalCents} className="font-mono" />
                </span>
              </div>
            ))}

            <div className="flex items-center justify-between border-t border-zinc-800 pt-3 px-1">
              <span className="text-sm font-medium text-zinc-400">Accumulating this cycle</span>
              <span className="text-sm font-bold text-white tabular-nums font-mono">
                <Amount value={totalCccChargesCents} className="font-mono" />
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 px-1">will be paid next month</p>
          </div>
        )}
      </div>

      {/* Section 4 — Real cash available */}
      <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/20 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-widest text-emerald-400">
              Real cash available
            </p>
            <p className="text-3xl font-bold text-emerald-300 tabular-nums font-mono">
              <AnimatedAmount cents={realCashAvailableCents} />
            </p>
            <p className="text-[10px] text-emerald-500/60">
              pool − debit & cash spending
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <Banknote className="h-5 w-5 text-emerald-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
