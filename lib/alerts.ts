import {
  AlertType,
  AlertPriority,
  FixedExpense,
  BudgetCategoryWithStats,
  CreditCard,
  Transaction,
  IncomeSource,
  ExpensePayment,
  BillingCycle,
} from "@/lib/types";
import { formatCurrency, getMonthlyEquivalent } from "@/lib/utils";

export interface AlertToCreate {
  type: AlertType;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  priority: AlertPriority;
  expires_at: Date | null;
}

export interface AlertContext {
  incomeSources: IncomeSource[];
  fixedExpenses: FixedExpense[];
  expensePayments: ExpensePayment[];
  budgetCategories: BudgetCategoryWithStats[];
  creditCards: CreditCard[];
  billingCycles: BillingCycle[];
  transactions: Transaction[];
  currentMonth: string;
  today: Date;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntilDue(day: number, today: Date): number | null {
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfMonth);

  const due = new Date(year, month, clampedDay);
  const diff = Math.floor(
    (startOfDay(due).getTime() - startOfDay(today).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return diff;
}

function isPaidThisMonth(
  expenseId: string,
  payments: ExpensePayment[],
  currentMonth: string
): boolean {
  return payments.some(
    (p) => p.fixed_expense_id === expenseId && p.paid_month === currentMonth
  );
}

function getOpenCycle(
  cardId: string,
  cycles: BillingCycle[]
): BillingCycle | undefined {
  return cycles
    .filter((c) => c.credit_card_id === cardId && c.status === "open")
    .sort(
      (a, b) =>
        new Date(b.closing_date + "T00:00:00").getTime() -
        new Date(a.closing_date + "T00:00:00").getTime()
    )[0];
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor(
    (startOfDay(a).getTime() - startOfDay(b).getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

export const alertGenerators: Record<
  AlertType,
  (ctx: AlertContext) => AlertToCreate[]
> = {
  DUE_DATE_UPCOMING: (ctx) => {
    const alerts: AlertToCreate[] = [];
    for (const expense of ctx.fixedExpenses) {
      if (!expense.is_active || !expense.due_day) continue;
      if (isPaidThisMonth(expense.id, ctx.expensePayments, ctx.currentMonth))
        continue;

      const days = daysUntilDue(expense.due_day, ctx.today);
      if (days === null || days < 1 || days > 5) continue;

      const priority: AlertPriority = days <= 2 ? "high" : "medium";
      const monthly = getMonthlyEquivalent(
        expense.amount_cents,
        expense.billing_cycle
      );
      const dueDate = new Date(ctx.today);
      dueDate.setDate(dueDate.getDate() + days);
      const expiresAt = new Date(dueDate);
      expiresAt.setDate(expiresAt.getDate() + 1);

      alerts.push({
        type: "DUE_DATE_UPCOMING",
        title: `${expense.name} due in ${days} day${days === 1 ? "" : "s"}`,
        message: `Your ${expense.name} of ${formatCurrency(monthly)} is due on the ${expense.due_day}${getOrdinalSuffix(expense.due_day)}.`,
        payload: {
          fixed_expense_id: expense.id,
          due_day: expense.due_day,
          amount_cents: monthly,
        },
        priority,
        expires_at: expiresAt,
      });
    }
    return alerts;
  },

  DUE_DATE_TODAY: (ctx) => {
    const alerts: AlertToCreate[] = [];
    for (const expense of ctx.fixedExpenses) {
      if (!expense.is_active || !expense.due_day) continue;
      if (isPaidThisMonth(expense.id, ctx.expensePayments, ctx.currentMonth))
        continue;

      const days = daysUntilDue(expense.due_day, ctx.today);
      if (days !== 0) continue;

      const monthly = getMonthlyEquivalent(
        expense.amount_cents,
        expense.billing_cycle
      );
      const expiresAt = new Date(ctx.today);
      expiresAt.setDate(expiresAt.getDate() + 1);

      alerts.push({
        type: "DUE_DATE_TODAY",
        title: `${expense.name} is due today`,
        message: `Don't forget to pay ${expense.name} (${formatCurrency(monthly)}) today.`,
        payload: {
          fixed_expense_id: expense.id,
          due_day: expense.due_day,
          amount_cents: monthly,
        },
        priority: "critical",
        expires_at: expiresAt,
      });
    }
    return alerts;
  },

  BUDGET_WARNING: (ctx) => {
    const alerts: AlertToCreate[] = [];
    for (const cat of ctx.budgetCategories) {
      if (cat.allocated_cents <= 0) continue;
      const pct = cat.spent_percentage;
      if (pct >= 80 && pct < 100) {
        const priority: AlertPriority = pct >= 90 ? "high" : "medium";
        const lastDayOfMonth = new Date(
          ctx.today.getFullYear(),
          ctx.today.getMonth() + 1,
          0
        );

        alerts.push({
          type: "BUDGET_WARNING",
          title: `${cat.name} budget at ${pct}%`,
          message: `You've spent ${formatCurrency(cat.spent_cents)} of your ${formatCurrency(cat.allocated_cents)} ${cat.name} budget this month.`,
          payload: {
            budget_category_id: cat.id,
            percentage_used: pct,
            spent_cents: cat.spent_cents,
            allocated_cents: cat.allocated_cents,
          },
          priority,
          expires_at: lastDayOfMonth,
        });
      }
    }
    return alerts;
  },

  BUDGET_EXCEEDED: (ctx) => {
    const alerts: AlertToCreate[] = [];
    for (const cat of ctx.budgetCategories) {
      if (cat.allocated_cents <= 0) continue;
      const pct = cat.spent_percentage;
      if (pct >= 100) {
        const overage = Math.max(0, cat.spent_cents - cat.allocated_cents);
        const lastDayOfMonth = new Date(
          ctx.today.getFullYear(),
          ctx.today.getMonth() + 1,
          0
        );

        alerts.push({
          type: "BUDGET_EXCEEDED",
          title: `${cat.name} budget exceeded`,
          message: `You've gone ${formatCurrency(overage)} over your ${cat.name} budget this month.`,
          payload: {
            budget_category_id: cat.id,
            overage_cents: overage,
          },
          priority: "critical",
          expires_at: lastDayOfMonth,
        });
      }
    }
    return alerts;
  },

  CREDIT_CARD_CLOSING_SOON: (ctx) => {
    const alerts: AlertToCreate[] = [];
    for (const card of ctx.creditCards) {
      const cycle = getOpenCycle(card.id, ctx.billingCycles);
      if (!cycle) continue;

      const closingDate = new Date(cycle.closing_date + "T00:00:00");
      const daysUntil = daysBetween(closingDate, ctx.today);

      // Alert from 3 days before closing through closing day itself.
      if (daysUntil < 0 || daysUntil > 3) continue;

      const priority: AlertPriority = daysUntil <= 1 ? "high" : "medium";
      const expiresAt = new Date(closingDate);
      expiresAt.setDate(expiresAt.getDate() + 1);

      alerts.push({
        type: "CREDIT_CARD_CLOSING_SOON",
        title: `${card.name} closing ${daysUntil === 0 ? "today" : `in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`}`,
        message: `Your ${card.name} billing cycle closes on ${formatDate(closingDate)}. Charges after that date will roll into next month's bill.`,
        payload: {
          credit_card_id: card.id,
          billing_cycle_id: cycle.id,
          closing_date: cycle.closing_date,
        },
        priority,
        expires_at: expiresAt,
      });
    }
    return alerts;
  },

  CREDIT_CARD_PAYMENT_DUE: (ctx) => {
    const alerts: AlertToCreate[] = [];
    for (const card of ctx.creditCards) {
      const cycle = getOpenCycle(card.id, ctx.billingCycles);
      if (!cycle) continue;

      const dueDate = new Date(cycle.due_date + "T00:00:00");
      const daysUntil = daysBetween(dueDate, ctx.today);

      // Alert from 5 days before due date through due date.
      // After due date we keep a critical alert for 3 more days while the
      // cycle is still open, since we don't yet track payment status.
      if (daysUntil < -3 || daysUntil > 5) continue;

      const priority: AlertPriority = daysUntil <= 1 ? "critical" : "high";
      const expiresAt = new Date(dueDate);
      expiresAt.setDate(expiresAt.getDate() + 4);

      alerts.push({
        type: "CREDIT_CARD_PAYMENT_DUE",
        title: `${card.name} payment ${daysUntil < 0 ? "overdue" : daysUntil === 0 ? "due today" : `due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`}`,
        message: `Your ${card.name} bill is due on ${formatDate(dueDate)}. Make sure you have enough funds to cover it.`,
        payload: {
          credit_card_id: card.id,
          billing_cycle_id: cycle.id,
          due_date: cycle.due_date,
        },
        priority,
        expires_at: expiresAt,
      });
    }
    return alerts;
  },

  HIGH_FIXED_EXPENSE_RATIO: (ctx) => {
    const totalIncome = ctx.incomeSources
      .filter((s) => s.is_active)
      .reduce((sum, s) => sum + s.amount_cents, 0);
    const totalFixed = ctx.fixedExpenses
      .filter((e) => e.is_active)
      .reduce(
        (sum, e) =>
          sum + getMonthlyEquivalent(e.amount_cents, e.billing_cycle),
        0
      );

    if (totalIncome <= 0) return [];

    const ratio = Math.round((totalFixed / totalIncome) * 100);
    if (ratio >= 60) {
      const priority: AlertPriority = ratio >= 70 ? "high" : "medium";
      const discretionary = Math.max(0, totalIncome - totalFixed);
      const lastDayOfMonth = new Date(
        ctx.today.getFullYear(),
        ctx.today.getMonth() + 1,
        0
      );

      return [
        {
          type: "HIGH_FIXED_EXPENSE_RATIO",
          title: "High fixed expense ratio",
          message: `Your fixed expenses represent ${ratio}% of your income this month, leaving only ${formatCurrency(discretionary)} for variable spending.`,
          payload: {
            ratio_percentage: ratio,
            fixed_cents: totalFixed,
            income_cents: totalIncome,
          },
          priority,
          expires_at: lastDayOfMonth,
        },
      ];
    }
    return [];
  },

  UNLOGGED_ACTIVITY: (ctx) => {
    const sorted = [...ctx.transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const lastCharge = sorted[0];
    if (!lastCharge) return [];

    const lastDate = new Date(lastCharge.date);
    const diffMs = ctx.today.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays >= 7) {
      const expiresAt = new Date(ctx.today);
      expiresAt.setDate(expiresAt.getDate() + 1);

      return [
        {
          type: "UNLOGGED_ACTIVITY",
          title: "No charges logged recently",
          message: `You haven't logged any credit card charges in ${diffDays} days. Keeping your tracker up to date helps you stay on budget.`,
          payload: {
            days_since_last_charge: diffDays,
          },
          priority: "low",
          expires_at: expiresAt,
        },
      ];
    }
    return [];
  },
};

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
