import { createClient } from "@/lib/supabase/server";
import {
  sumIncomeSources,
  sumFixedExpenses,
  getDiscretionaryPool,
  getMonthRangeFromParam,
} from "@/lib/utils";
import { getEffectiveIncomeSources, getEffectiveFixedExpenses } from "@/lib/effective-date";
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
    incomeSources,
    fixedExpenses,
    cardsResult,
    currentMonthTransactionsResult,
    paymentSourcesResult,
    billingCyclesResult,
  ] = await Promise.all([
    getEffectiveIncomeSources(supabase, user.id, monthStr),
    getEffectiveFixedExpenses(supabase, user.id, monthStr),
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
      .from("payment_sources")
      .select("id, type")
      .eq("user_id", user.id),
    supabase
      .from("billing_cycles")
      .select("*, credit_cards(user_id)")
      .eq("credit_cards.user_id", user.id)
      .order("closing_date", { ascending: false })
      .limit(50),
  ]);

  const creditCards = cardsResult.data ?? [];
  const currentMonthTransactions = currentMonthTransactionsResult.data ?? [];
  const paymentSources = paymentSourcesResult.data ?? [];

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

  // Payment method spending breakdown for current month
  const paymentSourceTypes = new Map(
    paymentSources.map((ps) => [ps.id, ps.type])
  );

  const creditCardSpending = currentMonthTransactions
    .filter((tx) => tx.credit_card_id)
    .reduce((sum, tx) => sum + tx.amount_cents, 0);

  const transferSpending = currentMonthTransactions
    .filter(
      (tx) =>
        tx.payment_source_id &&
        paymentSourceTypes.get(tx.payment_source_id) === "digital"
    )
    .reduce((sum, tx) => sum + tx.amount_cents, 0);

  const cashSpending = currentMonthTransactions
    .filter(
      (tx) =>
        tx.payment_source_id &&
        paymentSourceTypes.get(tx.payment_source_id) === "cash"
    )
    .reduce((sum, tx) => sum + tx.amount_cents, 0);

  const totalSpent = currentMonthTransactions.reduce(
    (sum, tx) => sum + tx.amount_cents,
    0
  );

  const remaining = finalPool - totalSpent;

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
      totalSpentCents={totalSpent}
      remainingCents={remaining}
      creditCardSpendingCents={creditCardSpending}
      transferSpendingCents={transferSpending}
      cashSpendingCents={cashSpending}
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
