import { alertGenerators, AlertToCreate } from "@/lib/alerts";
import {
  IncomeSource,
  FixedExpense,
  BudgetCategoryWithStats,
  CreditCard,
  Transaction,
  ExpensePayment,
  Alert,
} from "@/lib/types";
import { getCurrentMonth } from "@/lib/utils";
import type { SupabaseClient } from "@supabase/supabase-js";

interface FinancialData {
  incomeSources: IncomeSource[];
  fixedExpenses: FixedExpense[];
  expensePayments: ExpensePayment[];
  budgetCategories: BudgetCategoryWithStats[];
  creditCards: CreditCard[];
  transactions: Transaction[];
}

async function fetchFinancialData(
  supabase: SupabaseClient,
  userId: string,
  currentMonth: string
): Promise<FinancialData> {
  const startOfMonth = `${currentMonth}-01`;
  const [year, month] = currentMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const endOfMonth = `${currentMonth}-${String(lastDay).padStart(2, "0")}`;

  const [
    incomeResult,
    expensesResult,
    paymentsResult,
    budgetsResult,
    cardsResult,
    transactionsResult,
  ] = await Promise.all([
    supabase
      .from("income_sources")
      .select("*")
      .eq("user_id", userId)
      .eq("month", currentMonth)
      .eq("is_active", true),
    supabase
      .from("fixed_expenses")
      .select("*")
      .eq("user_id", userId)
      .eq("month", currentMonth)
      .eq("is_active", true),
    supabase
      .from("expense_payments")
      .select("*")
      .eq("user_id", userId)
      .eq("paid_month", currentMonth),
    supabase
      .from("budget_categories")
      .select("*")
      .eq("user_id", userId),
    supabase
      .from("credit_cards")
      .select("*")
      .eq("user_id", userId),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startOfMonth)
      .lte("date", endOfMonth),
  ]);

  // Fetch budget spending stats
  const budgetCategories: BudgetCategoryWithStats[] = [];
  for (const cat of budgetsResult.data ?? []) {
    const { data: spentData } = await supabase
      .from("transactions")
      .select("amount_cents")
      .eq("user_id", userId)
      .eq("budget_category_id", cat.id)
      .gte("date", startOfMonth)
      .lte("date", endOfMonth);

    const spent_cents = (spentData ?? []).reduce(
      (sum, t) => sum + (t.amount_cents ?? 0),
      0
    );

    // Get discretionary pool for allocation
    const totalIncome = (incomeResult.data ?? []).reduce(
      (sum, s) => sum + s.amount_cents,
      0
    );
    const totalFixed = (expensesResult.data ?? []).reduce(
      (sum, e) => {
        const monthly =
          e.billing_cycle === "monthly"
            ? e.amount_cents
            : e.billing_cycle === "quarterly"
              ? Math.round(e.amount_cents / 3)
              : Math.round(e.amount_cents / 12);
        return sum + monthly;
      },
      0
    );
    const discretionary = Math.max(0, totalIncome - totalFixed);
    const allocated_cents = Math.round(
      (discretionary * cat.percentage) / 100
    );

    budgetCategories.push({
      ...cat,
      allocated_cents,
      spent_cents,
      remaining_cents: Math.max(0, allocated_cents - spent_cents),
      spent_percentage:
        allocated_cents > 0
          ? Math.round((spent_cents / allocated_cents) * 100)
          : 0,
    });
  }

  return {
    incomeSources: incomeResult.data ?? [],
    fixedExpenses: expensesResult.data ?? [],
    expensePayments: paymentsResult.data ?? [],
    budgetCategories,
    creditCards: cardsResult.data ?? [],
    transactions: transactionsResult.data ?? [],
  };
}

function getPayloadKey(
  type: string,
  payload: Record<string, unknown>
): string {
  // Extract the key identifying fields from payload for deduplication
  const keyFields: Record<string, string[]> = {
    DUE_DATE_UPCOMING: ["fixed_expense_id"],
    DUE_DATE_TODAY: ["fixed_expense_id"],
    BUDGET_WARNING: ["budget_category_id"],
    BUDGET_EXCEEDED: ["budget_category_id"],
    CREDIT_CARD_CLOSING_SOON: ["credit_card_id"],
    CREDIT_CARD_PAYMENT_DUE: ["credit_card_id"],
    HIGH_FIXED_EXPENSE_RATIO: [],
    UNLOGGED_ACTIVITY: [],
  };

  const fields = keyFields[type] ?? [];
  const values = fields.map((f) => String(payload[f] ?? "")).join("-");
  return `${type}:${values}`;
}

export async function generateAlerts(
  userId: string,
  supabase: SupabaseClient
): Promise<number> {
  const currentMonth = getCurrentMonth();
  const today = new Date();

  const data = await fetchFinancialData(supabase, userId, currentMonth);

  const ctx = {
    ...data,
    currentMonth,
    today,
  };

  // Generate all alerts
  const generated: AlertToCreate[] = [];
  for (const generator of Object.values(alertGenerators)) {
    generated.push(...generator(ctx));
  }

  if (generated.length === 0) {
    // Still clean up expired alerts
    await supabase
      .from("alerts")
      .delete()
      .lt("expires_at", today.toISOString())
      .eq("user_id", userId);
    return 0;
  }

  // Fetch existing unread alerts to deduplicate
  const { data: existingAlerts } = await supabase
    .from("alerts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_read", false);

  const existingKeys = new Set(
    (existingAlerts ?? []).map((a: Alert) =>
      getPayloadKey(a.type, a.payload)
    )
  );

  // Filter out duplicates
  const newAlerts = generated.filter(
    (g) => !existingKeys.has(getPayloadKey(g.type, g.payload))
  );

  if (newAlerts.length > 0) {
    const rows = newAlerts.map((a) => ({
      user_id: userId,
      type: a.type,
      title: a.title,
      message: a.message,
      payload: a.payload,
      priority: a.priority,
      expires_at: a.expires_at?.toISOString() ?? null,
    }));

    const { error: insertError } = await supabase
      .from("alerts")
      .insert(rows);

    if (insertError) {
      console.error("Failed to insert alerts:", insertError.message);
    }
  }

  // Clean up expired alerts
  await supabase
    .from("alerts")
    .delete()
    .lt("expires_at", today.toISOString())
    .eq("user_id", userId);

  return newAlerts.length;
}
