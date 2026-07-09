import { createClient } from "@/lib/supabase/server";
import { AnalyticsPageClient } from "@/components/analytics/AnalyticsPageClient";
import { CreditCard, BudgetCategory } from "@/lib/types";
import { getEffectiveIncomeForMonth, getEffectiveFixedExpensesForMonth } from "@/lib/effective-date";

interface MonthlyData {
  month: string;
  label: string;
  totalCents: number;
  creditCardCents: number;
  cashCents: number;
  incomeCents: number;
  fixedExpenseCents: number;
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
      .select("*, credit_card:credit_cards(id, name, credit_limit_cents), budget_category:budget_categories(id, name, color)")
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

  const transactions = transactionsResult.data ?? [];
  const creditCards = creditCardsResult.data ?? [];
  const budgetCategories = budgetCategoriesResult.data ?? [];
  const incomeSources = incomeResult.data ?? [];
  const fixedExpenses = fixedExpensesResult.data ?? [];

  // Get all months from transactions
  const allMonths = new Set<string>();
  transactions.forEach((tx) => {
    const month = tx.date.slice(0, 7); // YYYY-MM
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

    // Calculate effective income and fixed expenses for this month
    const effectiveIncome = getEffectiveIncomeForMonth(incomeSources, month);
    const effectiveFixed = getEffectiveFixedExpensesForMonth(fixedExpenses, month);

    const monthIncome = effectiveIncome
      .filter((inc) => inc.is_active)
      .reduce((sum, inc) => {
        if (inc.currency === "USD") {
          // Approximate USD to ARS conversion (you might want to use a real rate)
          return sum + inc.amount_cents * 100;
        }
        return sum + inc.amount_cents;
      }, 0);

    const monthFixed = effectiveFixed
      .filter((exp) => exp.is_active)
      .reduce((sum, exp) => {
        let monthly = exp.amount_cents;
        if (exp.billing_cycle === "quarterly") monthly = Math.round(exp.amount_cents / 3);
        if (exp.billing_cycle === "annual") monthly = Math.round(exp.amount_cents / 12);
        return sum + monthly;
      }, 0);

    return {
      month,
      label: new Date(`${month}-01`).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      totalCents: monthTransactions.reduce((sum, tx) => sum + tx.amount_cents, 0),
      creditCardCents: creditCardTx.reduce((sum, tx) => sum + tx.amount_cents, 0),
      cashCents: cashTx.reduce((sum, tx) => sum + tx.amount_cents, 0),
      incomeCents: monthIncome,
      fixedExpenseCents: monthFixed,
    };
  });

  // Build category data
  const categoryData: CategoryMonthlyData[] = [];
  sortedMonths.forEach((month) => {
    const monthTransactions = transactions.filter((tx) => tx.date.startsWith(month));
    
    // Group by category
    const categoryMap = new Map<string, CategoryMonthlyData>();
    
    // Initialize with all categories (0 if no transactions)
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
    
    // Also add "Uncategorized"
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

  // Build payment type data
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

  // Build utilization data
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

  return (
    <AnalyticsPageClient
      monthlyData={monthlyData}
      categoryData={categoryData}
      paymentTypeData={paymentTypeData}
      utilizationData={utilizationData}
      budgetCategories={budgetCategories}
      creditCards={creditCards}
    />
  );
}
