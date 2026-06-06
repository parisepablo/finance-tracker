-- 001_initial_schema.sql
-- Initial schema for the personal finance app
-- Run this in the Supabase SQL Editor

-- ============================================
-- Tables
-- ============================================

CREATE TABLE income_sources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE credit_cards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  last_four char(4),
  credit_limit_cents integer,
  closing_day integer CHECK (closing_day BETWEEN 1 AND 31),
  due_day integer CHECK (due_day BETWEEN 1 AND 31),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE fixed_expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  is_estimated boolean DEFAULT false NOT NULL,
  due_day integer CHECK (due_day BETWEEN 1 AND 31),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','quarterly','annual')),
  payment_method text NOT NULL DEFAULT 'debit' CHECK (payment_method IN ('cash','debit','credit_card')),
  credit_card_id uuid REFERENCES credit_cards(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE budget_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  percentage integer NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  date date NOT NULL DEFAULT CURRENT_DATE,
  budget_category_id uuid REFERENCES budget_categories(id) ON DELETE SET NULL,
  credit_card_id uuid REFERENCES credit_cards(id) ON DELETE SET NULL,
  fixed_expense_id uuid REFERENCES fixed_expenses(id) ON DELETE SET NULL,
  is_installment boolean DEFAULT false NOT NULL,
  total_installments integer CHECK (total_installments > 0),
  current_installment integer CHECK (current_installment > 0),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own income_sources" ON income_sources
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can manage own credit_cards" ON credit_cards
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can manage own fixed_expenses" ON fixed_expenses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can manage own budget_categories" ON budget_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can manage own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_income_sources_user_id ON income_sources(user_id);
CREATE INDEX idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX idx_fixed_expenses_user_id ON fixed_expenses(user_id);
CREATE INDEX idx_budget_categories_user_id ON budget_categories(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_credit_card_id ON transactions(credit_card_id);
