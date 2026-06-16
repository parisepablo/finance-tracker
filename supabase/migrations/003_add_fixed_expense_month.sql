-- 003_add_fixed_expense_month.sql
-- Add month column to fixed_expenses for monthly expense tracking
-- Run this in the Supabase SQL Editor

-- Add month column with default current month for existing data
ALTER TABLE fixed_expenses
ADD COLUMN month text NOT NULL DEFAULT '2026-06';

-- Add index for fast month filtering
CREATE INDEX idx_fixed_expenses_user_month ON fixed_expenses(user_id, month);

-- Add unique constraint to prevent duplicate expenses per month
CREATE UNIQUE INDEX idx_fixed_expenses_user_name_month ON fixed_expenses(user_id, name, month);

-- Drop the default after backfill so new inserts must specify month
ALTER TABLE fixed_expenses
ALTER COLUMN month DROP DEFAULT;