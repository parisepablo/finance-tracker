-- 008_effective_date_income_expenses.sql
-- Convert income_sources and fixed_expenses from per-month rows to
-- effective-date series. Each series can have multiple versions; the version
-- with the latest effective_from_month <= target month wins.

-- ============================================================
-- income_sources
-- ============================================================

-- Add series_id and deletion marker.
ALTER TABLE income_sources
  ADD COLUMN series_id uuid DEFAULT gen_random_uuid() NOT NULL,
  ADD COLUMN is_deleted boolean DEFAULT false NOT NULL;

-- Rename month to effective_from_month.
ALTER TABLE income_sources RENAME COLUMN month TO effective_from_month;

-- Group existing rows by (user_id, name) so same-name items become one series.
DO $$
DECLARE
  r RECORD;
  new_series_id uuid;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id, name
    FROM income_sources
  LOOP
    new_series_id := gen_random_uuid();
    UPDATE income_sources
    SET series_id = new_series_id
    WHERE user_id = r.user_id
      AND name = r.name;
  END LOOP;
END $$;

-- Drop old per-name/month unique index and create per-series/month unique index.
DROP INDEX IF EXISTS idx_income_sources_user_name_month;
CREATE UNIQUE INDEX idx_income_sources_user_series_month
  ON income_sources(user_id, series_id, effective_from_month);

CREATE OR REPLACE FUNCTION get_effective_income_sources(p_user_id uuid, p_month text)
RETURNS SETOF income_sources
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH latest AS (
    SELECT DISTINCT ON (series_id) *
    FROM income_sources
    WHERE user_id = p_user_id
      AND effective_from_month <= p_month
    ORDER BY series_id, effective_from_month DESC
  )
  SELECT * FROM latest
  WHERE is_deleted = false;
$$;

-- ============================================================
-- fixed_expenses
-- ============================================================

ALTER TABLE fixed_expenses
  ADD COLUMN series_id uuid DEFAULT gen_random_uuid() NOT NULL,
  ADD COLUMN is_deleted boolean DEFAULT false NOT NULL;

ALTER TABLE fixed_expenses RENAME COLUMN month TO effective_from_month;

DO $$
DECLARE
  r RECORD;
  new_series_id uuid;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id, name
    FROM fixed_expenses
  LOOP
    new_series_id := gen_random_uuid();
    UPDATE fixed_expenses
    SET series_id = new_series_id
    WHERE user_id = r.user_id
      AND name = r.name;
  END LOOP;
END $$;

DROP INDEX IF EXISTS idx_fixed_expenses_user_name_month;
CREATE UNIQUE INDEX idx_fixed_expenses_user_series_month
  ON fixed_expenses(user_id, series_id, effective_from_month);

CREATE OR REPLACE FUNCTION get_effective_fixed_expenses(p_user_id uuid, p_month text)
RETURNS SETOF fixed_expenses
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH latest AS (
    SELECT DISTINCT ON (series_id) *
    FROM fixed_expenses
    WHERE user_id = p_user_id
      AND effective_from_month <= p_month
    ORDER BY series_id, effective_from_month DESC
  )
  SELECT * FROM latest
  WHERE is_deleted = false;
$$;
