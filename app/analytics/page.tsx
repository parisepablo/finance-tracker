import { createClient } from "@/lib/supabase/server";
import { AnalyticsPageClient } from "@/components/analytics/AnalyticsPageClient";
import { CreditCard, BudgetCategory } from "@/lib/types";
import { getEffectiveIncomeForMonth, getEffectiveFixedExpensesForMonth } from "@/lib/effective-date";
import { getMonthlyEquivalent } from "@/lib/utils";

interface MonthlyData {
  month: string;
  label: string;
  totalCents: number;
  creditCardCents: number;
  cashCents: number;
  incomeCents: number;
  fixedExpenseCents: number;
  savingsCents: number;
  savingsRate: number | null;
}

interface CategoryMonthlyData {
  month: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalCents: number;
  creditCardCents: number;
  cashCents: number;
}

interface CardUtilizationData {
  month: string;
  cardId: string;
  cardName: string;
  limitCents: number | null;
  spentCents: number;
  percentage: number;
}

interface PaymentTypeData {
  singleCount: number;
  singleAmount: number;
  installmentCount: number;
  installmentAmount: number;
}

interface BudgetVsActualData {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  allocatedCents: number;
  spentCents: number;
}

interface KpiData {
  currentMonth: string;
  currentMonthLabel: string;
  totalIncomeCents: number;
  totalSpentCents: number;
  savingsCents: number;
  savingsRate: number | null;
  avgDailySpendCents: number;
  topCategory: { name: string; color: string; spentCents: number } | null;
}

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">Please sign in to view analytics.</p>
      </div>
    );
  }

  // Fetch all data
  const [
    transactionsResult,
    creditCardsResult,
    budgetCategoriesResult,
    incomeResult,
    fixedExpensesResult,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("*, credit_card:credit_cards(id, name, credit_limit_cents, currency), budget_category:budget_categories(id, name, color)")
      .eq("user_id", user.id)
      .order("date", { ascending: true }),
    supabase
      .from("credit_cards")
      .select("id, name, credit_limit_cents, user_id, last_four, currency, created_at")
      .eq("user_id", user.id),
    supabase
      .from("budget_categories")
      .select("id, name, color, percentage, user_id, created_at")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("income_sources")
      .select("*")
      .eq("user_id", user.id),
    supabase
      .from("fixed_expenses")
      .select("*")
      .eq("user_id", user.id),
  ]);

  const allTransactions = transactionsResult.data ?? [];
  const allCreditCards = creditCardsResult.data ?? [];
  const budgetCategories = budgetCategoriesResult.data ?? [];
  const incomeSources = incomeResult.data ?? [];
  const fixedExpenses = fixedExpensesResult.data ?? [];

  // Hide USD from analytics
  const transactions = allTransactions.filter((tx) => tx.currency !== "USD");
  const creditCards = allCreditCards.filter((card) => card.currency !== "USD");

  // Get all months from ARS transactions
  const allMonths = new Set<string>();
  transactions.forEach((tx) => {
    const month = tx.date.slice(0, 7);
    allMonths.add(month);
  });

  // Also add current month if no transactions
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  allMonths.add(currentMonth);

  const sortedMonths = Array.from(allMonths).sort();

  // Build monthly data
  const monthlyData: MonthlyData[] = sortedMonths.map((month) => {
    const monthTransactions = transactions.filter((tx) => tx.date.startsWith(month));
    const creditCardTx = monthTransactions.filter((tx) => tx.credit_card_id);
    const cashTx = monthTransactions.filter((tx) => tx.payment_source_id);

    const effectiveIncome = getEffectiveIncomeForMonth(incomeSources, month);
    const effectiveFixed = getEffectiveFixedExpensesForMonth(fixedExpenses, month);

    const monthIncome = effectiveIncome
      .filter((inc) => inc.is_active && inc.currency !== "USD")
      .reduce((sum, inc) => sum + inc.amount_cents, 0);

    const monthFixed = effectiveFixed
      .filter((exp) => exp.is_active)
      .reduce((sum, exp) => sum + getMonthlyEquivalent(exp.amount_cents, exp.billing_cycle), 0);

    const totalSpent = monthTransactions.reduce((sum, tx) => sum + tx.amount_cents, 0);
    const savings = monthIncome - totalSpent;
    const savingsRate = monthIncome > 0 ? Math.round((savings / monthIncome) * 100) : null;

    return {
      month,
      label: new Date(`${month}-01`).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      totalCents: totalSpent,
      creditCardCents: creditCardTx.reduce((sum, tx) => sum + tx.amount_cents, 0),
      cashCents: cashTx.reduce((sum, tx) => sum + tx.amount_cents, 0),
      incomeCents: monthIncome,
      fixedExpenseCents: monthFixed,
      savingsCents: savings,
      savingsRate,
    };
  });

  // Build category data (ARS only)
  const categoryData: CategoryMonthlyData[] = [];
  sortedMonths.forEach((month) => {
    const monthTransactions = transactions.filter((tx) => tx.date.startsWith(month));

    const categoryMap = new Map<string, CategoryMonthlyData>();

    budgetCategories.forEach((cat) => {
      categoryMap.set(cat.id, {
        month,
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color,
        totalCents: 0,
        creditCardCents: 0,
        cashCents: 0,
      });
    });

    categoryMap.set("uncategorized", {
      month,
      categoryId: "uncategorized",
      categoryName: "Uncategorized",
      categoryColor: "#71717a",
      totalCents: 0,
      creditCardCents: 0,
      cashCents: 0,
    });

    monthTransactions.forEach((tx) => {
      const catId = tx.budget_category_id ?? "uncategorized";
      const entry = categoryMap.get(catId);
      if (entry) {
        entry.totalCents += tx.amount_cents;
        if (tx.credit_card_id) {
          entry.creditCardCents += tx.amount_cents;
        } else if (tx.payment_source_id) {
          entry.cashCents += tx.amount_cents;
        }
      }
    });

    categoryMap.forEach((value) => {
      if (value.totalCents > 0) {
        categoryData.push(value);
      }
    });
  });

  // Build payment type data (ARS only)
  const paymentTypeData: PaymentTypeData = {
    singleCount: 0,
    singleAmount: 0,
    installmentCount: 0,
    installmentAmount: 0,
  };

  transactions.forEach((tx) => {
    if (tx.is_installment) {
      paymentTypeData.installmentCount += 1;
      paymentTypeData.installmentAmount += tx.amount_cents;
    } else {
      paymentTypeData.singleCount += 1;
      paymentTypeData.singleAmount += tx.amount_cents;
    }
  });

  // Build utilization data (ARS cards only)
  const utilizationData: CardUtilizationData[] = [];
  sortedMonths.forEach((month) => {
    creditCards.forEach((card) => {
      const monthTransactions = transactions.filter(
        (tx) => tx.date.startsWith(month) && tx.credit_card_id === card.id
      );
      const spentCents = monthTransactions.reduce((sum, tx) => sum + tx.amount_cents, 0);
      const limitCents = card.credit_limit_cents;
      const percentage = limitCents && limitCents > 0
        ? Math.round((spentCents / limitCents) * 100)
        : 0;

      utilizationData.push({
        month,
        cardId: card.id,
        cardName: card.name,
        limitCents,
        spentCents,
        percentage,
      });
    });
  });

  // Build budget vs actual data (ARS only, across all months)
  const categorySpentTotal = new Map<string, number>();
  const categoryAllocatedTotal = new Map<string, number>();

  budgetCategories.forEach((cat) => {
    categorySpentTotal.set(cat.id, 0);
    categoryAllocatedTotal.set(cat.id, 0);
  });
  categorySpentTotal.set("uncategorized", 0);

  transactions.forEach((tx) => {
    const catId = tx.budget_category_id ?? "uncategorized";
    categorySpentTotal.set(catId, (categorySpentTotal.get(catId) ?? 0) + tx.amount_cents);
  });

  sortedMonths.forEach((month) => {
    const effectiveIncome = getEffectiveIncomeForMonth(incomeSources, month);
    const effectiveFixed = getEffectiveFixedExpensesForMonth(fixedExpenses, month);

    const monthIncome = effectiveIncome
      .filter((inc) => inc.is_active && inc.currency !== "USD")
      .reduce((sum, inc) => sum + inc.amount_cents, 0);

    const monthFixed = effectiveFixed
      .filter((exp) => exp.is_active)
      .reduce((sum, exp) => sum + getMonthlyEquivalent(exp.amount_cents, exp.billing_cycle), 0);

    const discretionaryPool = Math.max(0, monthIncome - monthFixed);

    budgetCategories.forEach((cat) => {
      const allocated = Math.round((discretionaryPool * cat.percentage) / 100);
      categoryAllocatedTotal.set(cat.id, (categoryAllocatedTotal.get(cat.id) ?? 0) + allocated);
    });
  });

  const budgetVsActualData: BudgetVsActualData[] = budgetCategories.map((cat) => ({
    categoryId: cat.id,
    categoryName: cat.name,
    categoryColor: cat.color,
    allocatedCents: categoryAllocatedTotal.get(cat.id) ?? 0,
    spentCents: categorySpentTotal.get(cat.id) ?? 0,
  }));

  // Build KPIs for latest month with data
  const latestMonth = monthlyData[monthlyData.length - 1];
  const daysInLatestMonth = latestMonth
    ? new Date(parseInt(latestMonth.month.split("-")[0]), parseInt(latestMonth.month.split("-")[1]), 0).getDate()
    : 0;

  const latestMonthCategoryMap = new Map<string, { name: string; color: string; spentCents: number }>();
  budgetCategories.forEach((cat) => {
    latestMonthCategoryMap.set(cat.id, { name: cat.name, color: cat.color, spentCents: 0 });
  });
  latestMonthCategoryMap.set("uncategorized", { name: "Uncategorized", color: "#71717a", spentCents: 0 });

  const latestMonthTransactions = transactions.filter((tx) => tx.date.startsWith(latestMonth?.month ?? currentMonth));
  latestMonthTransactions.forEach((tx) => {
    const catId = tx.budget_category_id ?? "uncategorized";
    const entry = latestMonthCategoryMap.get(catId);
    if (entry) entry.spentCents += tx.amount_cents;
  });

  let topCategory: KpiData["topCategory"] = null;
  latestMonthCategoryMap.forEach((value) => {
    if (value.spentCents > 0 && (!topCategory || value.spentCents > topCategory.spentCents)) {
      topCategory = value;
    }
  });

  const kpiData: KpiData = {
    currentMonth: latestMonth?.month ?? currentMonth,
    currentMonthLabel: latestMonth?.label ?? new Date(`${currentMonth}-01`).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    totalIncomeCents: latestMonth?.incomeCents ?? 0,
    totalSpentCents: latestMonth?.totalCents ?? 0,
    savingsCents: latestMonth?.savingsCents ?? 0,
    savingsRate: latestMonth?.savingsRate ?? null,
    avgDailySpendCents: daysInLatestMonth > 0 ? Math.round((latestMonth?.totalCents ?? 0) / daysInLatestMonth) : 0,
    topCategory,
  };

  return (
    <AnalyticsPageClient
      monthlyData={monthlyData}
      categoryData={categoryData}
      paymentTypeData={paymentTypeData}
      utilizationData={utilizationData}
      budgetVsActualData={budgetVsActualData}
      kpiData={kpiData}
      budgetCategories={budgetCategories}
      creditCards={creditCards}
    />
  );
}
