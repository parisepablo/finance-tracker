"use client";

import { formatCurrency } from "@/lib/utils";
import { GlowCard } from "@/components/ui/glow-card";
import { AmbientGlow } from "@/components/ui/ambient-glow";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

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
  healthStatus,
}: DashboardClientProps) {
  const animatedIncome = useAnimatedNumber(totalIncomeCents, 800);
  const animatedFixed = useAnimatedNumber(totalFixedCents, 800);
  const animatedPool = useAnimatedNumber(discretionaryPoolCents, 800);
  const animatedCards = useAnimatedNumber(totalCardObligationsCents, 800);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 relative">
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

        <GlowCard color="indigo" hoverIntensity="strong">
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
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {budgets.map((cat) => {
              const barWidth = Math.min(cat.spentPercentage, 100);
              let barColor = cat.color || "#10b981";
              if (cat.spentPercentage >= 100) {
                barColor = "#f43f5e";
              } else if (cat.spentPercentage >= 80) {
                barColor = "#f59e0b";
              }

              return (
                <GlowCard key={cat.id} color="indigo">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: cat.color, boxShadow: `0 0 8px ${cat.color}40` }}
                        />
                        <span className="text-sm font-medium text-zinc-200">{cat.name}</span>
                      </div>
                      <span className="text-xs text-zinc-500 font-mono">
                        {cat.spentPercentage}% spent
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full progress-shimmer animate-progress"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: barColor,
                          boxShadow: `0 0 10px ${barColor}40`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span className="font-mono">
                        {formatCurrency(cat.spentCents)} /{" "}
                        {formatCurrency(cat.allocatedCents)}
                      </span>
                      <span
                        className={
                          cat.remainingCents < 0
                            ? "text-rose-400 font-mono"
                            : "font-mono"
                        }
                      >
                        {cat.remainingCents < 0 ? "Over: " : "Left: "}
                        <span className="font-mono">
                          {formatCurrency(
                            cat.remainingCents < 0
                              ? -cat.remainingCents
                              : cat.remainingCents
                          )}
                        </span>
                      </span>
                    </div>
                  </div>
                </GlowCard>
              );
            })}
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
                className="group flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-zinc-800/50 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-l-2 border-l-transparent hover:border-l-indigo-500/100"
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
            {upcomingExpenses.map((exp) => (
              <div
                key={exp.id}
                className="group flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-zinc-800/50 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-l-2 border-l-transparent hover:border-l-indigo-500/100"
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
                <div className="text-right">
                  <p className="font-semibold text-white tabular-nums font-mono">
                    {formatCurrency(exp.amountCents)}
                  </p>
                  <p className="text-xs text-zinc-500 font-mono">
                    Due in {exp.daysUntilDue} day
                    {exp.daysUntilDue === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
