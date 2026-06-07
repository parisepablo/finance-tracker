"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { GlowCard } from "@/components/ui/glow-card";
import { AmbientGlow } from "@/components/ui/ambient-glow";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { BudgetDonut } from "@/components/budgets/BudgetDonut";
import { Badge } from "@/components/ui/badge";
import { PullToRefreshIndicator } from "@/components/ui/pull-to-refresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  Wallet,
  Receipt,
  PiggyBank,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Info,
  CalendarDays,
  PieChart,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";

interface DashboardBudgetItem {
  id: string;
  name: string;
  color: string;
  allocatedCents: number;
  spentCents: number;
  remainingCents: number;
  spentPercentage: number;
}

interface DashboardCardItem {
  id: string;
  name: string;
  lastFour: string;
  dueDay: number | null;
  totalDueCents: number;
  exceeds30Percent: boolean;
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

type HealthStatus = "healthy" | "warning" | "danger";

interface DashboardClientProps {
  totalIncomeCents: number;
  totalFixedCents: number;
  fixedPercentage: number;
  discretionaryPoolCents: number;
  totalCardObligationsCents: number;
  budgets: DashboardBudgetItem[];
  cards: DashboardCardItem[];
  upcomingExpenses: DashboardUpcomingExpense[];
  paidExpenseIds: string[];
  currentMonth: string;
  healthStatus: HealthStatus;
}

function HealthBadge({ status }: { status: HealthStatus }) {
  if (status === "healthy") {
    return (
      <Badge variant="success" className="glow-emerald">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Healthy
      </Badge>
    );
  }
  if (status === "warning") {
    return (
      <Badge variant="warning" className="glow-amber">
        <Info className="mr-1 h-3 w-3" />
        Watch out
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="glow-rose">
      <AlertTriangle className="mr-1 h-3 w-3" />
      Over budget
    </Badge>
  );
}

function AnimatedCurrency({ cents, currency = "ARS" }: { cents: number; currency?: string }) {
  const animated = useAnimatedNumber(cents, 800);
  return <span className="font-mono">{formatCurrency(animated, currency)}</span>;
}

export function DashboardClient({
  totalIncomeCents,
  totalFixedCents,
  fixedPercentage,
  discretionaryPoolCents,
  totalCardObligationsCents,
  budgets,
  cards,
  upcomingExpenses,
  paidExpenseIds,
  currentMonth,
  healthStatus,
}: DashboardClientProps) {
  const animatedIncome = useAnimatedNumber(totalIncomeCents, 800);
  const animatedFixed = useAnimatedNumber(totalFixedCents, 800);
  const animatedPool = useAnimatedNumber(discretionaryPoolCents, 800);
  const animatedCards = useAnimatedNumber(totalCardObligationsCents, 800);

  const router = useRouter();
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set(paidExpenseIds));
  const [showPaid, setShowPaid] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

    // Optimistic update
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
      // Revert optimistic update
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
    <div className="flex flex-1 flex-col gap-6 p-6 relative">
      <PullToRefreshIndicator progress={pullProgress} isRefreshing={isRefreshing} />
      <AmbientGlow color="indigo" position="top-right" />

      <div className="flex items-center justify-between relative z-10">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-zinc-500">
            Your financial health at a glance
          </p>
        </div>
        <HealthBadge status={healthStatus} />
      </div>

      {/* Summary row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 relative z-10">
        <GlowCard color="indigo">
          <div className="p-5 space-y-2">
            <div className="flex flex-row items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Monthly Income
              </span>
              <Wallet className="h-4 w-4 text-zinc-600" />
            </div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {formatCurrency(animatedIncome)}
            </div>
          </div>
        </GlowCard>

        <GlowCard color="indigo">
          <div className="p-5 space-y-2">
            <div className="flex flex-row items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Fixed Expenses
              </span>
              <Receipt className="h-4 w-4 text-zinc-600" />
            </div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {formatCurrency(animatedFixed)}
            </div>
            <p className="text-xs text-zinc-500 mt-1 font-mono">
              {fixedPercentage}% of income
            </p>
          </div>
        </GlowCard>

        <GlowCard color="indigo">
          <div className="p-5 space-y-2">
            <div className="flex flex-row items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-widest text-indigo-400">
                Discretionary Pool
              </span>
              <PiggyBank className="h-4 w-4 text-indigo-500/70" />
            </div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {formatCurrency(animatedPool)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Income left after fixed expenses
            </p>
          </div>
        </GlowCard>

        <GlowCard color="violet">
          <div className="p-5 space-y-2">
            <div className="flex flex-row items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Card Obligations
              </span>
              <CreditCard className="h-4 w-4 text-zinc-600" />
            </div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {formatCurrency(animatedCards)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">This month</p>
          </div>
        </GlowCard>
      </div>

      {/* Budget health */}
      <div className="space-y-3 relative z-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Budget Health
        </h2>
        {budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 p-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/60">
              <PieChart className="h-5 w-5 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">
              No budget categories yet.
            </p>
          </div>
        ) : (
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
        )}
      </div>

      {/* Credit card overview */}
      <div className="space-y-3 relative z-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Credit Card Overview
        </h2>
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 p-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/60">
              <CreditCard className="h-5 w-5 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">
              No credit cards yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600/20 to-violet-600/20">
                    <CreditCard className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-200">{card.name}</span>
                      {card.lastFour && (
                        <span className="text-xs text-zinc-600 font-mono">
                          •••• {card.lastFour}
                        </span>
                      )}
                    </div>
                    {card.dueDay && (
                      <p className="text-xs text-zinc-500">
                        Due day <span className="font-mono">{card.dueDay}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white tabular-nums font-mono">
                    {formatCurrency(card.totalDueCents)}
                  </p>
                  {card.exceeds30Percent && (
                    <p className="text-xs text-amber-400">
                      Exceeds 30% of income
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed expenses due soon */}
      <div className="space-y-3 relative z-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Due Soon
        </h2>
        {upcomingExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 p-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/60">
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
                className="group flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800/60">
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
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-white tabular-nums font-mono">
                      {formatCurrency(exp.amountCents)}
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
              <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden">
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
                        className="flex items-center justify-between rounded-lg bg-zinc-800/40 px-3 py-2"
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
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-500 font-mono line-through">
                            {formatCurrency(exp.amountCents)}
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
    </div>
  );
}
