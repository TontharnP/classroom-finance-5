# Category Migration Instructions

## Overview
This migration creates the `categories` table and migrates existing transaction category data from text to relational references.

## Migration File
`supabase/migrations/003_create_categories_table.sql`

## What This Migration Does

1. **Creates categories table** with columns:
   - `id` (UUID, primary key)
   - `name` (TEXT, unique)
   - `icon` (TEXT, optional)
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)

2. **Adds RLS policies** for authenticated users

3. **Creates updated_at trigger** to automatically update timestamps

4. **Adds category_id column** to transactions table as a foreign key

5. **Migrates existing data**:
   - Extracts unique category names from existing transactions
   - Creates category records
   - Updates transactions to reference category_id

6. **Maintains backward compatibility**:
   - Keeps the old `category` text column for now
   - Can be removed in a future migration after verification

## How to Run

### Option 1: Using Supabase CLI (Recommended)

```bash
cd /Users/mac/Desktop/Project/web/classroom-finance-5

# Make sure you're logged in
supabase login

# Link your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Push the migration
supabase db push
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/003_create_categories_table.sql`
5. Paste into the query editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

### Option 3: Using psql

```bash
# Connect to your database
psql "YOUR_DATABASE_CONNECTION_STRING"

# Run the migration file
\i /Users/mac/Desktop/Project/web/classroom-finance-5/supabase/migrations/003_create_categories_table.sql
```

## Verification

After running the migration, verify it worked correctly:

```sql
-- Check categories table exists
SELECT * FROM categories LIMIT 10;

-- Check transactions have category_id populated
SELECT id, name, category, category_id 
FROM transactions 
WHERE source = 'transaction' 
LIMIT 10;

-- Check foreign key relationship
SELECT t.name as transaction_name, c.name as category_name
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.source = 'transaction'
LIMIT 10;
```

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Remove foreign key constraint
ALTER TABLE transactions DROP COLUMN IF EXISTS category_id;

-- Drop index
DROP INDEX IF EXISTS idx_transactions_category_id;

-- Drop trigger
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop table
DROP TABLE IF EXISTS categories;
```

## Notes

- The migration preserves existing category text in the `category` column
- Both `category` (text) and `category_id` (UUID) will coexist temporarily
- The app will use the new categories system going forward
- Old category text can be removed in a future migration after confirming all systems work correctly
- Transactions without a category will have `category_id` set to NULL
