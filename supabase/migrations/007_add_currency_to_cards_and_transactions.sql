-- 007_add_currency_to_cards_and_transactions.sql
-- Adds currency support to credit cards, transactions, and pending charges.
-- Default is ARS for existing data.

ALTER TABLE credit_cards
ADD COLUMN currency text NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD'));

ALTER TABLE transactions
ADD COLUMN currency text NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD'));

ALTER TABLE pending_charges
ADD COLUMN currency text NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD'));

CREATE INDEX idx_transactions_currency ON transactions(currency);
