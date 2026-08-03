import { alertGenerators, AlertToCreate } from "@/lib/alerts";
import {
  IncomeSource,
  FixedExpense,
  BudgetCategory,
  BudgetCategoryWithStats,
  CreditCard,
  Transaction,
  ExpensePayment,
  BillingCycle,
  Alert,
} from "@/lib/types";
import {
  getEffectiveIncomeSources,
  getEffectiveFixedExpenses,
  type SupabaseClient,
} from "@/lib/effective-date";
import { getCurrentMonth, getMonthlyEquivalent } from "@/lib/utils";

interface FinancialData {
  incomeSources: IncomeSource[];
  fixedExpenses: FixedExpense[];
  expensePayments: ExpensePayment[];
  budgetCategories: BudgetCategoryWithStats[];
  creditCards: CreditCard[];
  billingCycles: BillingCycle[];
  transactions: Transaction[];
}

async function fetchFinancialData(
  supabase: SupabaseClient,
  userId: string,
  currentMonth: string
): Promise<FinancialData> {
  const { start, end } = getMonthRange(currentMonth);

  const [
    incomeSources,
    fixedExpenses,
    paymentsResult,
    budgetsResult,
    cardsResult,
    transactionsResult,
  ] = await Promise.all([
    getEffectiveIncomeSources(supabase, userId, currentMonth),
    getEffectiveFixedExpenses(supabase, userId, currentMonth),
    supabase
      .from("expense_payments")
      .select("*")
      .eq("user_id", userId)
      .eq("paid_month", currentMonth),
    supabase.from("budget_categories").select("*").eq("user_id", userId),
    supabase.from("credit_cards").select("*").eq("user_id", userId),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", start)
      .lte("date", end),
  ]);

  const cardIds = (cardsResult.data ?? []).map((c: CreditCard) => c.id);

  const cyclesResult =
    cardIds.length > 0
      ? await supabase
          .from("billing_cycles")
          .select("*")
          .in("credit_card_id", cardIds)
      : { data: [] };

  const totalIncome = incomeSources.reduce((sum, s) => sum + s.amount_cents, 0);
  const totalFixed = fixedExpenses.reduce(
    (sum, e) => sum + getMonthlyEquivalent(e.amount_cents, e.billing_cycle),
    0
  );
  const discretionary = Math.max(0, totalIncome - totalFixed);

  // Sum transactions by budget category in memory to avoid N+1 queries.
  const spentByCategory = new Map<string, number>();
  for (const t of transactionsResult.data ?? []) {
    if (!t.budget_category_id) continue;
    const current = spentByCategory.get(t.budget_category_id) ?? 0;
    spentByCategory.set(t.budget_category_id, current + (t.amount_cents ?? 0));
  }

  const budgetCategories: BudgetCategoryWithStats[] = (budgetsResult.data ?? []).map(
    (cat: BudgetCategory) => {
      const spent_cents = spentByCategory.get(cat.id) ?? 0;
      const allocated_cents = Math.round((discretionary * cat.percentage) / 100);
      const spent_percentage =
        allocated_cents > 0
          ? Math.round((spent_cents / allocated_cents) * 100)
          : 0;

      return {
        ...cat,
        allocated_cents,
        spent_cents,
        remaining_cents: Math.max(0, allocated_cents - spent_cents),
        spent_percentage,
      };
    }
  );

  return {
    incomeSources,
    fixedExpenses,
    expensePayments: paymentsResult.data ?? [],
    budgetCategories,
    creditCards: cardsResult.data ?? [],
    billingCycles: cyclesResult.data ?? [],
    transactions: transactionsResult.data ?? [],
  };
}

function getMonthRange(monthStr: string) {
  const [year, month] = monthStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${monthStr}-01`,
    end: `${monthStr}-${String(lastDay).padStart(2, "0")}`,
  };
}

function getPayloadKey(
  type: string,
  payload: Record<string, unknown>
): string {
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

function sanitizePayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
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

  // Clean up expired alerts first
  await supabase
    .from("alerts")
    .delete()
    .lt("expires_at", today.toISOString())
    .eq("user_id", userId);

  if (generated.length === 0) {
    return 0;
  }

  // Fetch existing unread alerts to deduplicate
  const { data: existingAlerts } = await supabase
    .from("alerts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_read", false);

  const existingKeys = new Set(
    (existingAlerts ?? []).map((a: Alert) => getPayloadKey(a.type, a.payload))
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
      payload: sanitizePayload(a.payload),
      priority: a.priority,
      expires_at: a.expires_at?.toISOString() ?? null,
    }));

    const { error: insertError } = await supabase.from("alerts").insert(rows);

    if (insertError) {
      console.error("Failed to insert alerts:", insertError.message);
    }
  }

  return newAlerts.length;
}
