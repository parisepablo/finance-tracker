import { createClient } from "@/lib/supabase/server";
import {
  sumIncomeSources,
  sumFixedExpenses,
  getDiscretionaryPool,
  getMonthRangeFromParam,
} from "@/lib/utils";
import { FinancesPageClient } from "@/components/finances/FinancesPageClient";
import { BudgetCategoryWithStats, Transaction, PaymentSource } from "@/lib/types";

export default async function FinancesPage({
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
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">Please sign in to view your finances.</p>
      </div>
    );
  }

  const { start, end, monthStr } = getMonthRangeFromParam(monthParam);

  const [
    incomeResult,
    expensesResult,
    categoriesResult,
    cardsResult,
    transactionsResult,
    paymentsResult,
    txDetailResult,
    sourcesResult,
  ] = await Promise.all([
    supabase
      .from("income_sources")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", monthStr)
      .order("created_at", { ascending: false }),
    supabase
      .from("fixed_expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
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
      .select("budget_category_id, amount_cents")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end)
      .not("budget_category_id", "is", null),
    supabase
      .from("expense_payments")
      .select("fixed_expense_id")
      .eq("user_id", user.id)
      .eq("paid_month", monthStr),
    supabase
      .from("transactions")
      .select("id, description, amount_cents, date, budget_category_id, credit_card_id, payment_source_id, is_installment, total_installments, current_installment")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end)
      .not("budget_category_id", "is", null)
      .order("date", { ascending: false }),
    supabase
      .from("payment_sources")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  const incomeSources = incomeResult.data ?? [];
  const expenses = expensesResult.data ?? [];
  const budgetCategories = categoriesResult.data ?? [];
  const creditCards = cardsResult.data ?? [];
  const transactions = transactionsResult.data ?? [];
  const txDetails = txDetailResult.data ?? [];
  const paymentSources = sourcesResult.data ?? [];

  const totalIncome = sumIncomeSources(incomeSources);
  const totalFixed = sumFixedExpenses(expenses);
  const discretionaryPool = getDiscretionaryPool(totalIncome, totalFixed);
  const fixedPercentage =
    totalIncome > 0 ? Math.round((totalFixed / totalIncome) * 100) : 0;

  const spentByCategory: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.budget_category_id) {
      spentByCategory[tx.budget_category_id] =
        (spentByCategory[tx.budget_category_id] ?? 0) + tx.amount_cents;
    }
  }

  const categories: BudgetCategoryWithStats[] = budgetCategories.map((cat) => {
    const allocated = Math.round((discretionaryPool * cat.percentage) / 100);
    const spent = spentByCategory[cat.id] ?? 0;
    return {
      ...cat,
      allocated_cents: allocated,
      spent_cents: spent,
      remaining_cents: allocated - spent,
      spent_percentage: allocated > 0 ? Math.round((spent / allocated) * 100) : 0,
    };
  });

  const paidExpenseIds = Array.from(
    new Set((paymentsResult.data ?? []).map((p) => p.fixed_expense_id))
  );

  const error =
    incomeResult.error?.message ??
    expensesResult.error?.message ??
    categoriesResult.error?.message ??
    null;

  return (
    <FinancesPageClient
      incomeSources={incomeSources}
      expenses={expenses}
      creditCards={creditCards}
      categories={categories}
      transactions={txDetails as Transaction[]}
      paymentSources={paymentSources as PaymentSource[]}
      discretionaryPoolCents={discretionaryPool}
      totalIncomeCents={totalIncome}
      totalFixedCents={totalFixed}
      fixedPercentage={fixedPercentage}
      paidExpenseIds={paidExpenseIds}
      currentMonth={monthStr}
      error={error}
    />
  );
}
