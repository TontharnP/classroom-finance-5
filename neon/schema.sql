-- Classroom Finance Neon schema
-- Run this SQL in the Neon SQL editor before starting the app.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nick_name TEXT,
  number INTEGER NOT NULL UNIQUE CHECK (number > 0),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedule_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  parent_id UUID REFERENCES schedule_folders(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT schedule_folders_not_self_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount_per_item NUMERIC(10, 2) NOT NULL CHECK (amount_per_item > 0),
  start_date DATE NOT NULL,
  end_date DATE CHECK (end_date IS NULL OR end_date >= start_date),
  description TEXT,
  student_ids UUID[] NOT NULL DEFAULT '{}',
  folder_id UUID NOT NULL REFERENCES schedule_folders(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'transfer')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  method TEXT CHECK (method IN ('kplus', 'cash', 'truemoney')),
  category TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  source TEXT NOT NULL CHECK (source IN ('transaction', 'schedule')),
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  pocket_id TEXT,
  source_pocket_id TEXT,
  destination_pocket_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transactions_schedule_consistency CHECK (
    (source = 'schedule' AND schedule_id IS NOT NULL AND student_id IS NOT NULL) OR
    (source = 'transaction' AND schedule_id IS NULL AND student_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_students_number ON students(number);
CREATE INDEX IF NOT EXISTS idx_schedule_folders_parent_sort ON schedule_folders(parent_id, sort_order, name);
CREATE INDEX IF NOT EXISTS idx_schedules_start_date ON schedules(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_schedules_end_date ON schedules(end_date) WHERE end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedules_folder_sort ON schedules(folder_id, sort_order, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_transactions_kind ON transactions(kind);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_method ON transactions(method) WHERE method IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_schedule_id ON transactions(schedule_id) WHERE schedule_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_student_id ON transactions(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_pocket_id ON transactions(pocket_id) WHERE pocket_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_source_pocket_id ON transactions(source_pocket_id) WHERE source_pocket_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_destination_pocket_id ON transactions(destination_pocket_id) WHERE destination_pocket_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedules_updated_at ON schedules;
CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedule_folders_updated_at ON schedule_folders;
CREATE TRIGGER update_schedule_folders_updated_at
  BEFORE UPDATE ON schedule_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
