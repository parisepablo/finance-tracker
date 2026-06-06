import { createClient } from "@/lib/supabase/server";
import {
  sumIncomeSources,
  sumFixedExpenses,
  getDiscretionaryPool,
} from "@/lib/utils";
import { BudgetsPageClient } from "@/components/budgets/BudgetsPageClient";
import { BudgetCategoryWithStats } from "@/lib/types";

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];
  return { start, end };
}

async function getData() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      categories: [] as BudgetCategoryWithStats[],
      discretionaryPoolCents: 0,
      error: "Unauthorized",
    };
  }

  const { start, end } = getMonthRange();

  const [categoriesResult, incomeResult, expensesResult, transactionsResult] =
    await Promise.all([
      supabase
        .from("budget_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("income_sources").select("*").eq("user_id", user.id),
      supabase.from("fixed_expenses").select("*").eq("user_id", user.id),
      supabase
        .from("transactions")
        .select("budget_category_id, amount_cents")
        .eq("user_id", user.id)
        .gte("date", start)
        .lte("date", end)
        .not("budget_category_id", "is", null),
    ]);

  if (categoriesResult.error) {
    return {
      categories: [] as BudgetCategoryWithStats[],
      discretionaryPoolCents: 0,
      error: categoriesResult.error.message,
    };
  }

  const income = sumIncomeSources(incomeResult.data ?? []);
  const fixed = sumFixedExpenses(expensesResult.data ?? []);
  const pool = getDiscretionaryPool(income, fixed);

  const spentByCategory: Record<string, number> = {};
  for (const tx of transactionsResult.data ?? []) {
    if (tx.budget_category_id) {
      spentByCategory[tx.budget_category_id] =
        (spentByCategory[tx.budget_category_id] ?? 0) + tx.amount_cents;
    }
  }

  const categories: BudgetCategoryWithStats[] = (categoriesResult.data ?? []).map(
    (cat) => {
      const allocated = Math.round((pool * cat.percentage) / 100);
      const spent = spentByCategory[cat.id] ?? 0;
      return {
        ...cat,
        allocated_cents: allocated,
        spent_cents: spent,
        remaining_cents: allocated - spent,
        spent_percentage: allocated > 0 ? Math.round((spent / allocated) * 100) : 0,
      };
    }
  );

  return {
    categories,
    discretionaryPoolCents: pool,
    error: null,
  };
}

export default async function BudgetsPage() {
  const { categories, discretionaryPoolCents, error } = await getData();

  return (
    <BudgetsPageClient
      categories={categories}
      discretionaryPoolCents={discretionaryPoolCents}
      error={error}
    />
  );
}
