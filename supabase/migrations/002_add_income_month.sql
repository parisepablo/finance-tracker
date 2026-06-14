-- 002_add_income_month.sql
-- Add month column to income_sources for monthly income tracking
-- Run this in the Supabase SQL Editor

-- Add month column with default current month for existing data
ALTER TABLE income_sources
ADD COLUMN month text NOT NULL DEFAULT '2026-06';

-- Add index for fast month filtering
CREATE INDEX idx_income_sources_user_month ON income_sources(user_id, month);

-- Add unique constraint to prevent duplicate income sources per month
CREATE UNIQUE INDEX idx_income_sources_user_name_month ON income_sources(user_id, name, month);

-- Drop the default after backfill so new inserts must specify month
ALTER TABLE income_sources
ALTER COLUMN month DROP DEFAULT;