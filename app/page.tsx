import { createClient } from "@/lib/supabase/server";
import {
  sumIncomeSources,
  sumFixedExpenses,
  getDiscretionaryPool,
  getMonthRangeFromParam,
} from "@/lib/utils";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { LandingPage } from "@/components/marketing/LandingPage";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return <LandingPage />;
  }

  const { start, end, monthStr, year, month } = getMonthRangeFromParam(monthParam);

  const [
    incomeResult,
    expensesResult,
    budgetResult,
    cardsResult,
    currentMonthTransactionsResult,
    billingCyclesResult,
  ] = await Promise.all([
    supabase.from("income_sources").select("*").eq("user_id", user.id).eq("month", monthStr),
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
      .from("billing_cycles")
      .select("*, credit_cards(user_id)")
      .eq("credit_cards.user_id", user.id)
      .order("closing_date", { ascending: false })
      .limit(50),
  ]);

  const incomeSources = incomeResult.data ?? [];
  const fixedExpenses = expensesResult.data ?? [];
  const budgetCategories = budgetResult.data ?? [];
  const creditCards = cardsResult.data ?? [];
  const currentMonthTransactions = currentMonthTransactionsResult.data ?? [];

  const billingCycles = billingCyclesResult.data ?? [];
  const closedCycles = billingCycles.filter((c) => c.status === "closed");
  const mostRecentClosedCycle = closedCycles[0] ?? null;

  const totalIncome = sumIncomeSources(incomeSources);
  const totalFixed = sumFixedExpenses(fixedExpenses);
  const essentialFixed = sumFixedExpenses(
    fixedExpenses.filter((e) => e.is_essential)
  );
  const optionalFixed = sumFixedExpenses(
    fixedExpenses.filter((e) => !e.is_essential)
  );
  const discretionaryPool = getDiscretionaryPool(totalIncome, totalFixed);

  // CC payment due = total charges from most recent closed cycle
  let ccPaymentDue = 0;
  if (mostRecentClosedCycle) {
    // Compute previous cycle in memory from the fetched billing cycles
    const previousCycle = closedCycles.find(
      (c) =>
        c.credit_card_id === mostRecentClosedCycle.credit_card_id &&
        c.closing_date < mostRecentClosedCycle.closing_date
    );

    const cycleStart = previousCycle
      ? (() => {
          const d = new Date(previousCycle.closing_date);
          d.setDate(d.getDate() + 1);
          return d.toISOString().split("T")[0];
        })()
      : (() => {
          const d = new Date(mostRecentClosedCycle.closing_date);
          d.setDate(d.getDate() - 30);
          return d.toISOString().split("T")[0];
        })();

    const { data: cycleCharges } = await supabase
      .from("transactions")
      .select("amount_cents")
      .eq("user_id", user.id)
      .eq("credit_card_id", mostRecentClosedCycle.credit_card_id)
      .gte("date", cycleStart)
      .lte("date", mostRecentClosedCycle.closing_date);

    ccPaymentDue = (cycleCharges ?? []).reduce((sum, tx) => sum + tx.amount_cents, 0);
  }

  const finalPool = Math.max(0, discretionaryPool - ccPaymentDue);

  // Budget spending tracking for current month
  const budgets = budgetCategories.map((cat) => {
    const allocated =
      discretionaryPool > 0
        ? Math.round((discretionaryPool * cat.percentage) / 100)
        : 0;
    const spent = currentMonthTransactions
      .filter((tx) => tx.budget_category_id === cat.id)
      .reduce((sum, tx) => sum + tx.amount_cents, 0);
    const spentPercentage = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

    return {
      id: cat.id,
      name: cat.name,
      color: cat.color,
      allocatedCents: allocated,
      spentCents: spent,
      spentPercentage,
    };
  });

  const totalSpent = currentMonthTransactions.reduce(
    (sum, tx) => sum + tx.amount_cents,
    0
  );

  const remaining = finalPool - totalSpent;

  // Current CC charges per card
  const currentCcTransactions = currentMonthTransactions.filter(
    (tx) => tx.credit_card_id !== null
  );

  const cards = creditCards.map((card) => {
    const totalCents = currentCcTransactions
      .filter((tx) => tx.credit_card_id === card.id)
      .reduce((sum, tx) => sum + tx.amount_cents, 0);
    return {
      id: card.id,
      name: card.name,
      totalCents,
    };
  });

  const totalCccCharges = currentCcTransactions.reduce(
    (sum, tx) => sum + tx.amount_cents,
    0
  );

  // Payment source spending for real cash available
  const paymentSourceSpending = currentMonthTransactions
    .filter((tx) => tx.payment_source_id !== null)
    .reduce((sum, tx) => sum + tx.amount_cents, 0);

  const realCashAvailable = finalPool - paymentSourceSpending;

  // Upcoming expenses (due within next 7 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: paymentsData } = await supabase
    .from("expense_payments")
    .select("fixed_expense_id")
    .eq("user_id", user.id)
    .eq("paid_month", monthStr);

  const paidExpenseIds = new Set(
    (paymentsData ?? []).map((p) => p.fixed_expense_id)
  );

  const activeFixedExpenses = fixedExpenses.filter((exp) => exp.is_active);

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

  const prevMonthDate = new Date(year, month === 1 ? 11 : month - 2);
  const prevMonthName = prevMonthDate.toLocaleDateString("en-US", { month: "long" });
  const currentMonthName = new Date(year, month - 1).toLocaleDateString("en-US", { month: "long" });

  return (
    <DashboardClient
      totalIncomeCents={totalIncome}
      totalFixedCents={totalFixed}
      essentialFixedCents={essentialFixed}
      optionalFixedCents={optionalFixed}
      discretionaryPoolCents={discretionaryPool}
      ccPaymentDueCents={ccPaymentDue}
      finalPoolCents={finalPool}
      budgets={budgets}
      cards={cards}
      totalCccChargesCents={totalCccCharges}
      totalSpentCents={totalSpent}
      remainingCents={remaining}
      paymentSourceSpendingCents={paymentSourceSpending}
      realCashAvailableCents={realCashAvailable}
      upcomingExpenses={upcomingExpenses}
      paidExpenseIds={Array.from(paidExpenseIds)}
      prevMonthName={prevMonthName}
      currentMonthName={currentMonthName}
      currentMonth={monthStr}
    />
  );
}
