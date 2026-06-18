ALTER TABLE wallet_transactions
ADD COLUMN IF NOT EXISTS tx_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS
idx_wallet_transactions_tx_hash
ON wallet_transactions(tx_hash)
WHERE tx_hash IS NOT NULL;
