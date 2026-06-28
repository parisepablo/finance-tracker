-- 006_add_callback_token_to_pending_charges.sql
-- Adds a short callback token for Telegram inline keyboards.
-- Telegram limits callback_data to 64 bytes.

ALTER TABLE pending_charges
ADD COLUMN callback_token text UNIQUE;

-- Generate callback tokens for existing rows
UPDATE pending_charges
SET callback_token = SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 16)
WHERE callback_token IS NULL;

-- Make it not null for future rows
ALTER TABLE pending_charges
ALTER COLUMN callback_token SET NOT NULL;

CREATE UNIQUE INDEX idx_pending_charges_callback_token ON pending_charges(callback_token);
