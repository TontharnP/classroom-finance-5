-- Migration: Change payment method from 'bank' to 'kplus'
-- This updates the CHECK constraint and existing data

-- Step 1: Remove the old CHECK constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_method_check;

-- Step 2: Update existing 'bank' records to 'kplus'
UPDATE transactions SET method = 'kplus' WHERE method = 'bank';

-- Step 3: Add new CHECK constraint with 'kplus' instead of 'bank'
ALTER TABLE transactions 
  ADD CONSTRAINT transactions_method_check 
  CHECK (method IN ('kplus', 'cash', 'truemoney'));

-- Verification: Check that no 'bank' records remain
-- SELECT COUNT(*) FROM transactions WHERE method = 'bank';
-- Expected result: 0
