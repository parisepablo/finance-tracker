import {
  AlertType,
  AlertPriority,
  FixedExpense,
  BudgetCategoryWithStats,
  CreditCard,
  Transaction,
  IncomeSource,
  ExpensePayment,
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
  transactions: Transaction[];
  currentMonth: string;
  today: Date;
}

function daysUntil(day: number, today: Date): number {
  const todayDay = today.getDate();
  if (day >= todayDay) return day - todayDay;
  // If day has passed this month, treat as next month (not relevant for alerts)
  return day + 30 - todayDay;
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

      const days = daysUntil(expense.due_day, ctx.today);
      if (days >= 1 && days <= 5) {
        const priority: AlertPriority =
          days <= 2 ? "high" : "medium";
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
          message: `Your ${expense.name} of ${formatCurrency(monthly)} is due on the ${expense.due_day}th.`,
          payload: {
            fixed_expense_id: expense.id,
            due_day: expense.due_day,
            amount_cents: monthly,
          },
          priority,
          expires_at: expiresAt,
        });
      }
    }
    return alerts;
  },

  DUE_DATE_TODAY: (ctx) => {
    const alerts: AlertToCreate[] = [];
    for (const expense of ctx.fixedExpenses) {
      if (!expense.is_active || !expense.due_day) continue;
      if (isPaidThisMonth(expense.id, ctx.expensePayments, ctx.currentMonth))
        continue;

      const days = daysUntil(expense.due_day, ctx.today);
      if (days === 0) {
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
    }
    return alerts;
  },

  BUDGET_WARNING: (ctx) => {
    const alerts: AlertToCreate[] = [];
    for (const cat of ctx.budgetCategories) {
      if (cat.allocated_cents <= 0) continue;
      const pct = cat.spent_percentage;
      if (pct >= 80 && pct < 100) {
        const priority: AlertPriority =
          pct >= 90 ? "high" : "medium";
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
    // TODO: update to use billing_cycles table
    const alerts: AlertToCreate[] = [];
    return alerts;
  },

  CREDIT_CARD_PAYMENT_DUE: (ctx) => {
    // TODO: update to use billing_cycles table
    const alerts: AlertToCreate[] = [];
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
