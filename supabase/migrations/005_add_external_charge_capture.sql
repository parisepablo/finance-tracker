-- 005_add_external_charge_capture.sql
-- Adds tables for Telegram bot and email-based charge capture.
-- All captured charges require user confirmation before becoming transactions.

-- ============================================
-- User settings
-- ============================================

CREATE TABLE user_settings (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  telegram_chat_id text UNIQUE,
  telegram_username text,
  telegram_link_code text UNIQUE,
  telegram_link_expires_at timestamptz,
  email_alias uuid UNIQUE DEFAULT gen_random_uuid(),
  default_credit_card_id uuid REFERENCES credit_cards(id) ON DELETE SET NULL,
  default_payment_source_id uuid REFERENCES payment_sources(id) ON DELETE SET NULL,
  default_budget_category_id uuid REFERENCES budget_categories(id) ON DELETE SET NULL,
  raw_retention_days integer DEFAULT 7 NOT NULL CHECK (raw_retention_days >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- Pending charges (captured but not confirmed)
-- ============================================

CREATE TABLE pending_charges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source text NOT NULL CHECK (source IN ('telegram','email','notification')),
  source_ref text,
  raw_input text,
  description text,
  amount_cents integer CHECK (amount_cents > 0),
  date date,
  credit_card_id uuid REFERENCES credit_cards(id) ON DELETE SET NULL,
  payment_source_id uuid REFERENCES payment_sources(id) ON DELETE SET NULL,
  budget_category_id uuid REFERENCES budget_categories(id) ON DELETE SET NULL,
  is_installment boolean DEFAULT false NOT NULL,
  total_installments integer CHECK (total_installments > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','discarded','parse_failed','notification_failed')),
  confirmation_token uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  confirmed_at timestamptz,
  parse_error text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own user_settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can manage own pending_charges" ON pending_charges
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_user_settings_telegram_chat_id ON user_settings(telegram_chat_id);
CREATE INDEX idx_pending_charges_user_id_status ON pending_charges(user_id, status);
CREATE INDEX idx_pending_charges_confirmation_token ON pending_charges(confirmation_token);
CREATE INDEX idx_pending_charges_created_at ON pending_charges(created_at);
