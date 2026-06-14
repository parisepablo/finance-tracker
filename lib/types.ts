export interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  amount_cents: number;
  currency: "ARS" | "USD";
  is_active: boolean;
  month: string;
  created_at: string;
}

export interface FixedExpense {
  id: string;
  user_id: string;
  name: string;
  category: string;
  amount_cents: number;
  is_estimated: boolean;
  due_day: number;
  billing_cycle: "monthly" | "quarterly" | "annual";
  payment_method: "cash" | "debit" | "credit_card";
  credit_card_id: string | null;
  is_essential: boolean;
  is_active: boolean;
  created_at: string;
}

export interface BudgetCategory {
  id: string;
  user_id: string;
  name: string;
  percentage: number;
  color: string;
  created_at: string;
}

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  last_four: string;
  credit_limit_cents: number;
  created_at: string;
}

export interface BillingCycle {
  id: string;
  credit_card_id: string;
  opening_date: string;
  closing_date: string;
  due_date: string;
  status: 'open' | 'closed';
  created_at: string;
}

export interface PaymentSource {
  id: string;
  user_id: string;
  name: string;
  type: "digital" | "cash";
  color: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount_cents: number;
  date: string;
  budget_category_id: string | null;
  credit_card_id: string | null;
  payment_source_id: string | null;
  fixed_expense_id: string | null;
  is_installment: boolean;
  total_installments: number | null;
  current_installment: number | null;
  created_at: string;
}

export interface MonthlySnapshot {
  total_income_cents: number;
  total_fixed_cents: number;
  discretionary_pool_cents: number;
  month: string;
}

export interface ExpensePayment {
  id: string;
  user_id: string;
  fixed_expense_id: string;
  paid_month: string;
  paid_at: string;
}

export interface BudgetCategoryWithStats extends BudgetCategory {
  allocated_cents: number;
  spent_cents: number;
  remaining_cents: number;
  spent_percentage: number;
}

export type AlertPriority = "low" | "medium" | "high" | "critical";
export type AlertType =
  | "DUE_DATE_UPCOMING"
  | "DUE_DATE_TODAY"
  | "BUDGET_WARNING"
  | "BUDGET_EXCEEDED"
  | "CREDIT_CARD_CLOSING_SOON"
  | "CREDIT_CARD_PAYMENT_DUE"
  | "HIGH_FIXED_EXPENSE_RATIO"
  | "UNLOGGED_ACTIVITY";

export interface Alert {
  id: string;
  user_id: string;
  type: AlertType;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  priority: AlertPriority;
  created_at: string;
  expires_at: string | null;
}
