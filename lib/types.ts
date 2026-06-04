export interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  amount_cents: number;
  is_active: boolean;
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
  closing_day: number;
  due_day: number;
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
