import { createClient } from "@/lib/supabase/server";
import { CardsPageClient } from "@/components/cards/CardsPageClient";
import { CreditCard, BudgetCategory, PaymentSource } from "@/lib/types";

async function getData() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      cards: [] as CreditCard[],
      paymentSources: [] as PaymentSource[],
      budgetCategories: [] as BudgetCategory[],
      error: "Unauthorized",
    };
  }

  const [cardsResult, sourcesResult, categoriesResult] = await Promise.all([
    supabase
      .from("credit_cards")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("payment_sources")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("budget_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  if (cardsResult.error) {
    return {
      cards: [] as CreditCard[],
      paymentSources: (sourcesResult.data ?? []) as PaymentSource[],
      budgetCategories: (categoriesResult.data ?? []) as BudgetCategory[],
      error: cardsResult.error.message,
    };
  }

  return {
    cards: (cardsResult.data ?? []) as CreditCard[],
    paymentSources: (sourcesResult.data ?? []) as PaymentSource[],
    budgetCategories: (categoriesResult.data ?? []) as BudgetCategory[],
    error: null,
  };
}

export default async function CardsPage() {
  const { cards, paymentSources, budgetCategories, error } = await getData();

  return (
    <CardsPageClient
      cards={cards}
      paymentSources={paymentSources}
      budgetCategories={budgetCategories}
      error={error}
    />
  );
}
