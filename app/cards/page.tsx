import { createClient } from "@/lib/supabase/server";
import { CardsPageClient } from "@/components/cards/CardsPageClient";
import { CreditCard, BudgetCategory, PaymentSource, BillingCycle } from "@/lib/types";
import { autoAdvanceCycles } from "@/lib/actions/billing-cycles";

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
      cycles: [] as BillingCycle[],
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

  const cardIds = (cardsResult.data ?? []).map((c) => c.id);

  let cycles: BillingCycle[] = [];
  if (cardIds.length > 0) {
    const { data: cyclesData } = await supabase
      .from("billing_cycles")
      .select("*")
      .in("credit_card_id", cardIds)
      .order("closing_date", { ascending: false });
    cycles = (cyclesData ?? []) as BillingCycle[];
  }

  if (cardsResult.error) {
    return {
      cards: [] as CreditCard[],
      paymentSources: (sourcesResult.data ?? []) as PaymentSource[],
      budgetCategories: (categoriesResult.data ?? []) as BudgetCategory[],
      cycles,
      error: cardsResult.error.message,
    };
  }

  return {
    cards: (cardsResult.data ?? []) as CreditCard[],
    paymentSources: (sourcesResult.data ?? []) as PaymentSource[],
    budgetCategories: (categoriesResult.data ?? []) as BudgetCategory[],
    cycles,
    error: null,
  };
}

export default async function CardsPage() {
  // Fire-and-forget auto-advance cycles
  autoAdvanceCycles().catch(() => {});

  const { cards, paymentSources, budgetCategories, cycles, error } = await getData();

  return (
    <CardsPageClient
      cards={cards}
      paymentSources={paymentSources}
      budgetCategories={budgetCategories}
      cycles={cycles}
      error={error}
    />
  );
}
