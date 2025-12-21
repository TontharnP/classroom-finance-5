-- Migration: Add pocket columns and support 'transfer' kind in transactions table
-- Description: Adds pocket_id, source_pocket_id, and destination_pocket_id, and updates kind CHECK constraint

-- Add columns
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS pocket_id TEXT,
ADD COLUMN IF NOT EXISTS source_pocket_id TEXT,
ADD COLUMN IF NOT EXISTS destination_pocket_id TEXT;

-- Update kind CHECK constraint to allow 'transfer'
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_kind_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_kind_check CHECK (kind IN ('income', 'expense', 'transfer'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_pocket_id ON transactions(pocket_id) WHERE pocket_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_source_pocket_id ON transactions(source_pocket_id) WHERE source_pocket_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_destination_pocket_id ON transactions(destination_pocket_id) WHERE destination_pocket_id IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN transactions.pocket_id IS 'ID of the pocket/wallet this transaction affects (for income/expense)';
COMMENT ON COLUMN transactions.source_pocket_id IS 'ID of the source pocket (for transfers)';
COMMENT ON COLUMN transactions.destination_pocket_id IS 'ID of the destination pocket (for transfers)';

