import { createClient } from "@/lib/supabase/server";
import { FixedExpensesPageClient } from "@/components/expenses/FixedExpensesPageClient";

async function getData() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      expenses: [],
      incomeSources: [],
      creditCards: [],
      error: "Unauthorized",
    };
  }

  const [expensesResult, incomeResult, cardsResult] = await Promise.all([
    supabase
      .from("fixed_expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("income_sources")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("credit_cards")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  if (expensesResult.error) {
    return {
      expenses: [],
      incomeSources: [],
      creditCards: [],
      error: expensesResult.error.message,
    };
  }

  return {
    expenses: expensesResult.data ?? [],
    incomeSources: incomeResult.data ?? [],
    creditCards: cardsResult.data ?? [],
    error: null,
  };
}

export default async function ExpensesPage() {
  const { expenses, incomeSources, creditCards, error } = await getData();

  return (
    <FixedExpensesPageClient
      expenses={expenses}
      incomeSources={incomeSources}
      creditCards={creditCards}
      error={error}
    />
  );
}
