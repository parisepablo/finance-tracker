-- 002_add_payment_sources.sql
-- Add payment_sources table and payment_source_id to transactions

-- ============================================
-- Payment Sources
-- ============================================

CREATE TABLE payment_sources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('digital', 'cash')),
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own payment_sources" ON payment_sources
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Link payment sources to transactions
-- ============================================

ALTER TABLE transactions
  ADD COLUMN payment_source_id uuid REFERENCES payment_sources(id) ON DELETE CASCADE;

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_payment_sources_user_id ON payment_sources(user_id);
CREATE INDEX idx_transactions_payment_source_id ON transactions(payment_source_id);
