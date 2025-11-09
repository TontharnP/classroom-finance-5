# Database Migration Instructions

## Payment Method Update: "bank" → "kplus"

The payment method has been changed from "bank" to "kplus" throughout the application. You need to run a database migration to update the CHECK constraint and existing data.

### ⚠️ Important: Run this migration to avoid errors!

If you see errors like:
- "Database constraint error: The payment method 'kplus' is not recognized"
- "Error updating transaction"
- CHECK constraint violations

You need to apply the migration.

---

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migrations/002_change_bank_to_kplus.sql`
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

```bash
# Make sure you're in the project directory
cd classroom-finance-5

# Run the migration
supabase db push
```

---

## What the Migration Does

1. **Removes** the old CHECK constraint that only allows: `bank`, `cash`, `truemoney`
2. **Updates** all existing records from `method = 'bank'` to `method = 'kplus'`
3. **Adds** a new CHECK constraint that allows: `kplus`, `cash`, `truemoney`

---

## Migration SQL (for reference)

```sql
-- Remove the old CHECK constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_method_check;

-- Update existing 'bank' records to 'kplus'
UPDATE transactions SET method = 'kplus' WHERE method = 'bank';

-- Add new CHECK constraint with 'kplus' instead of 'bank'
ALTER TABLE transactions 
  ADD CONSTRAINT transactions_method_check 
  CHECK (method IN ('kplus', 'cash', 'truemoney'));
```

---

## Verification

After running the migration, verify it worked:

```sql
-- Check that no 'bank' records remain
SELECT COUNT(*) FROM transactions WHERE method = 'bank';
-- Expected result: 0

-- Check the new constraint
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'transactions_method_check';
-- Should show: (method IN ('kplus', 'cash', 'truemoney'))
```

---

## Troubleshooting

### "Permission denied" error
- Make sure you're connected to the correct Supabase project
- Verify you have admin/owner permissions

### Migration already applied
- If you see "constraint already exists" or similar, the migration has already been run
- You can verify by checking if transactions accept 'kplus' values

### Need to rollback?
If you need to revert (change "kplus" back to "bank"):

```sql
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_method_check;
UPDATE transactions SET method = 'bank' WHERE method = 'kplus';
ALTER TABLE transactions 
  ADD CONSTRAINT transactions_method_check 
  CHECK (method IN ('bank', 'cash', 'truemoney'));
```

---

## Questions?

If you encounter any issues, check:
1. Supabase connection is active
2. You have the correct permissions
3. The migration file exists: `supabase/migrations/002_change_bank_to_kplus.sql`
