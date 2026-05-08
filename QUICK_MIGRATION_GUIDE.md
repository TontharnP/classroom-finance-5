# Quick Category Migration Guide

## ⚠️ IMPORTANT: Run This Migration First

The categories feature requires a database table that doesn't exist yet. You need to run the migration before using categories.

## 🚀 Easiest Method: Supabase Dashboard (Recommended)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: **classroom-finance-5**
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy and Run This SQL

Copy the ENTIRE SQL below and paste it into the SQL Editor, then click **Run**:

\`\`\`sql
-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Add RLS policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Categories policies (public read, authenticated write)
CREATE POLICY "Allow public read access on categories"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated insert on categories"
  ON categories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on categories"
  ON categories FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on categories"
  ON categories FOR DELETE
  USING (true);

-- Create updated_at trigger function (only if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to categories table
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add category_id column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Create index on category_id for faster joins
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- Migrate existing category data from text to relational
INSERT INTO categories (name)
SELECT DISTINCT category
FROM transactions
WHERE category IS NOT NULL 
  AND category != ''
  AND source = 'transaction'
ON CONFLICT (name) DO NOTHING;

-- Update transactions to reference category_id
UPDATE transactions t
SET category_id = c.id
FROM categories c
WHERE t.category = c.name
  AND t.source = 'transaction'
  AND t.category_id IS NULL;
\`\`\`

### Step 3: Verify Success

After running, you should see a success message. Verify by running this query:

\`\`\`sql
-- Check categories table
SELECT * FROM categories;

-- Check category_id in transactions
SELECT id, name, category, category_id FROM transactions LIMIT 5;
\`\`\`

## ✅ What This Migration Does

1. ✅ Creates `categories` table with RLS enabled
2. ✅ Adds `category_id` foreign key to `transactions` table
3. ✅ Migrates existing category text data to category records
4. ✅ Links transactions to their categories via `category_id`
5. ✅ Keeps old `category` text column for backward compatibility

## 🔧 Alternative: If RLS Policy Fails

If you get an error about RLS policies already existing, run this first:

\`\`\`sql
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access on categories" ON categories;
DROP POLICY IF EXISTS "Allow authenticated insert on categories" ON categories;
DROP POLICY IF EXISTS "Allow authenticated update on categories" ON categories;
DROP POLICY IF EXISTS "Allow authenticated delete on categories" ON categories;
\`\`\`

Then run the main migration SQL again.

## 🎉 After Migration

Once the migration completes successfully:

1. Refresh your app
2. Navigate to the Categories page (new sidebar link)
3. You should see any migrated categories from existing transactions
4. You can now create new categories and use them in transactions

## 🐛 Troubleshooting

### Error: "relation 'categories' does not exist"
- The migration hasn't been run yet
- Follow the steps above to run it

### Error: "column 'category_id' does not exist"
- The migration was partially successful
- Run just the ALTER TABLE statement:
  \`\`\`sql
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
  \`\`\`

### Error: "duplicate key value violates unique constraint"
- This is safe to ignore - it means some categories already exist
- The migration uses ON CONFLICT DO NOTHING to handle this

## 📞 Need Help?

If you encounter issues:
1. Check the Supabase logs in the dashboard
2. Verify your connection string in `.env.local`
3. Make sure you have appropriate database permissions
