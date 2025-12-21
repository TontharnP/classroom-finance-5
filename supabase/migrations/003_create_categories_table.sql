-- Migration: Create categories table
-- Description: Adds a categories table for organizing transactions

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on name for faster lookups
CREATE INDEX idx_categories_name ON categories(name);

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

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add category_id column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Create index on category_id for faster joins
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- Migrate existing category data
-- This will create categories from existing transaction.category text values
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

-- Note: Keep the old 'category' column for backward compatibility
-- It can be removed in a future migration after ensuring all code uses category_id
