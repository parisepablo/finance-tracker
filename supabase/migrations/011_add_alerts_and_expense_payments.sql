-- 011_add_alerts_and_expense_payments.sql
-- Add notifications/alerts table and expense payment tracking.
-- These are required for the alerts module to function.

-- ============================================
-- alerts
-- ============================================

CREATE TABLE alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  is_read boolean DEFAULT false NOT NULL,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own alerts" ON alerts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_user_read ON alerts(user_id, is_read);
CREATE INDEX idx_alerts_user_priority ON alerts(user_id, priority);
CREATE INDEX idx_alerts_expires_at ON alerts(expires_at);

-- ============================================
-- expense_payments
-- ============================================

CREATE TABLE expense_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fixed_expense_id uuid REFERENCES fixed_expenses(id) ON DELETE CASCADE NOT NULL,
  paid_month text NOT NULL CHECK (paid_month ~ '^[0-9]{4}-[0-9]{2}$'),
  paid_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expense_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own expense_payments" ON expense_payments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_expense_payments_user_id ON expense_payments(user_id);
CREATE UNIQUE INDEX idx_expense_payments_user_expense_month
  ON expense_payments(user_id, fixed_expense_id, paid_month);
