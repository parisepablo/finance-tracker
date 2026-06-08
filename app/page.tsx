import { createClient } from "@/lib/supabase/server";
import {
  sumIncomeSources,
  sumFixedExpenses,
  getDiscretionaryPool,
  getMonthlyEquivalent,
} from "@/lib/utils";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

function getMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
    monthStr: `${year}-${month}`,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">Please sign in to view your dashboard.</p>
      </div>
    );
  }

  const { start, end, monthStr } = getMonthRange();

  const [
    incomeResult,
    expensesResult,
    budgetResult,
    cardsResult,
    transactionsResult,
    paymentsResult,
  ] = await Promise.all([
    supabase.from("income_sources").select("*").eq("user_id", user.id),
    supabase.from("fixed_expenses").select("*").eq("user_id", user.id),
    supabase
      .from("budget_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("credit_cards")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end),
    supabase
      .from("expense_payments")
      .select("fixed_expense_id")
      .eq("user_id", user.id)
      .eq("paid_month", monthStr),
  ]);

  const incomeSources = incomeResult.data ?? [];
  const fixedExpenses = expensesResult.data ?? [];
  const budgetCategories = budgetResult.data ?? [];
  const creditCards = cardsResult.data ?? [];
  const transactions = transactionsResult.data ?? [];

  const totalIncome = sumIncomeSources(incomeSources);
  const totalFixed = sumFixedExpenses(fixedExpenses);
  const essentialFixed = sumFixedExpenses(
    fixedExpenses.filter((e) => e.is_essential)
  );
  const optionalFixed = sumFixedExpenses(
    fixedExpenses.filter((e) => !e.is_essential)
  );
  const discretionaryPool = getDiscretionaryPool(totalIncome, totalFixed);
  const fixedPercentage =
    totalIncome > 0 ? Math.round((totalFixed / totalIncome) * 100) : 0;

  // Budget health
  const budgets = budgetCategories.map((cat) => {
    const allocated =
      discretionaryPool > 0
        ? Math.round((discretionaryPool * cat.percentage) / 100)
        : 0;
    const spent = transactions
      .filter((tx) => tx.budget_category_id === cat.id)
      .reduce((sum, tx) => sum + tx.amount_cents, 0);
    const remaining = allocated - spent;
    const spentPercentage =
      allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

    return {
      id: cat.id,
      name: cat.name,
      color: cat.color,
      allocatedCents: allocated,
      spentCents: spent,
      remainingCents: remaining,
      spentPercentage,
    };
  });

  // Credit card obligations
  const activeFixedExpenses = fixedExpenses.filter((exp) => exp.is_active);

  const cards = creditCards.map((card) => {
    const fixedDue = activeFixedExpenses
      .filter((exp) => exp.credit_card_id === card.id)
      .reduce(
        (sum, exp) =>
          sum + getMonthlyEquivalent(exp.amount_cents, exp.billing_cycle),
        0
      );

    const txDue = transactions
      .filter((tx) => tx.credit_card_id === card.id)
      .reduce((sum, tx) => sum + tx.amount_cents, 0);

    const totalDue = fixedDue + txDue;

    return {
      id: card.id,
      name: card.name,
      lastFour: card.last_four,
      dueDay: card.due_day,
      totalDueCents: totalDue,
      exceeds30Percent: totalIncome > 0 && totalDue > totalIncome * 0.3,
    };
  });

  const totalCardObligations = cards.reduce(
    (sum, card) => sum + card.totalDueCents,
    0
  );

  // Upcoming expenses (due within next 7 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const paidExpenseIds = new Set(
    (paymentsResult.data ?? []).map((p) => p.fixed_expense_id)
  );

  const upcomingExpenses = activeFixedExpenses
    .filter((exp) => exp.due_day)
    .map((exp) => {
      let dueDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        exp.due_day
      );
      if (dueDate < today) {
        dueDate = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          exp.due_day
        );
      }
      const diffMs = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return {
        expense: exp,
        daysUntilDue: diffDays,
      };
    })
    .filter((item) => item.daysUntilDue <= 7)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    .map((item) => ({
      id: item.expense.id,
      name: item.expense.name,
      category: item.expense.category,
      amountCents: item.expense.amount_cents,
      dueDay: item.expense.due_day,
      daysUntilDue: item.daysUntilDue,
      billingCycle: item.expense.billing_cycle,
    }));

  // Financial health score
  const anyOver100 = budgets.some((b) => b.spentPercentage > 100);
  const anyOver90 = budgets.some((b) => b.spentPercentage > 90);

  let healthStatus: "healthy" | "warning" | "danger" = "healthy";
  if (fixedPercentage > 70 || anyOver100) {
    healthStatus = "danger";
  } else if (fixedPercentage >= 50 || anyOver90) {
    healthStatus = "warning";
  }

  return (
    <DashboardClient
      totalIncomeCents={totalIncome}
      totalFixedCents={totalFixed}
      essentialFixedCents={essentialFixed}
      optionalFixedCents={optionalFixed}
      fixedPercentage={fixedPercentage}
      discretionaryPoolCents={discretionaryPool}
      totalCardObligationsCents={totalCardObligations}
      budgets={budgets}
      cards={cards}
      upcomingExpenses={upcomingExpenses}
      paidExpenseIds={Array.from(paidExpenseIds)}
      currentMonth={monthStr}
      healthStatus={healthStatus}
    />
  );
}
