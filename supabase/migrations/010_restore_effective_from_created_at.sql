-- 010_restore_effective_from_created_at.sql
-- Revert the far-past default applied in migration 009. For rows that were
-- moved to 2000-01, restore their effective_from_month to the month they were
-- originally created. This preserves the intended timeline: items exist from
-- the month they were created onward, not forever in the past.

UPDATE income_sources
SET effective_from_month = TO_CHAR(created_at::date, 'YYYY-MM')
WHERE effective_from_month = '2000-01';

UPDATE fixed_expenses
SET effective_from_month = TO_CHAR(created_at::date, 'YYYY-MM')
WHERE effective_from_month = '2000-01';
