-- 009_default_effective_from_past.sql
-- Move the earliest version of each income/expense series to a far-past month
-- so existing items apply to all months by default. Later versions remain as
-- monthly overrides.

UPDATE income_sources v1
SET effective_from_month = '2000-01'
WHERE effective_from_month = (
  SELECT MIN(v2.effective_from_month)
  FROM income_sources v2
  WHERE v2.series_id = v1.series_id
);

UPDATE fixed_expenses v1
SET effective_from_month = '2000-01'
WHERE effective_from_month = (
  SELECT MIN(v2.effective_from_month)
  FROM fixed_expenses v2
  WHERE v2.series_id = v1.series_id
);
