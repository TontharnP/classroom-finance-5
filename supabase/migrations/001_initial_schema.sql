-- Classroom Finance 5.0 Database Schema
-- Created: 2025-11-08
-- Description: Initial schema for students, schedules, and transactions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABLE: students
-- ==========================================
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prefix VARCHAR(20) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  nick_name VARCHAR(50),
  number INTEGER NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Constraints
  CONSTRAINT students_number_unique UNIQUE (number),
  CONSTRAINT students_number_positive CHECK (number > 0)
);

-- Index for faster queries
CREATE INDEX idx_students_number ON students(number);
CREATE INDEX idx_students_created_at ON students(created_at DESC);

-- ==========================================
-- TABLE: schedules
-- ==========================================
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  amount_per_item DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  student_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Constraints
  CONSTRAINT schedules_amount_positive CHECK (amount_per_item > 0),
  CONSTRAINT schedules_dates_valid CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Index for date queries
CREATE INDEX idx_schedules_start_date ON schedules(start_date DESC);
CREATE INDEX idx_schedules_end_date ON schedules(end_date) WHERE end_date IS NOT NULL;
CREATE INDEX idx_schedules_created_at ON schedules(created_at DESC);

-- ==========================================
-- TABLE: transactions
-- ==========================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('income', 'expense')),
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(20) CHECK (method IN ('kplus', 'cash', 'truemoney')),
  category VARCHAR(100),
  description TEXT,
  source VARCHAR(20) NOT NULL CHECK (source IN ('transaction', 'schedule')),
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Constraints
  CONSTRAINT transactions_amount_positive CHECK (amount > 0),
  CONSTRAINT transactions_schedule_consistency CHECK (
    (source = 'schedule' AND schedule_id IS NOT NULL AND student_id IS NOT NULL) OR
    (source = 'transaction' AND schedule_id IS NULL AND student_id IS NULL)
  )
);

-- Indexes for faster queries
CREATE INDEX idx_transactions_kind ON transactions(kind);
CREATE INDEX idx_transactions_source ON transactions(source);
CREATE INDEX idx_transactions_method ON transactions(method) WHERE method IS NOT NULL;
CREATE INDEX idx_transactions_schedule_id ON transactions(schedule_id) WHERE schedule_id IS NOT NULL;
CREATE INDEX idx_transactions_student_id ON transactions(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_category ON transactions(category) WHERE category IS NOT NULL;

-- ==========================================
-- FUNCTIONS: Auto-update updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Students policies (public read, authenticated write)
CREATE POLICY "Allow public read access on students"
  ON students FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated insert on students"
  ON students FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on students"
  ON students FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on students"
  ON students FOR DELETE
  USING (true);

-- Schedules policies
CREATE POLICY "Allow public read access on schedules"
  ON schedules FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated insert on schedules"
  ON schedules FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on schedules"
  ON schedules FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on schedules"
  ON schedules FOR DELETE
  USING (true);

-- Transactions policies
CREATE POLICY "Allow public read access on transactions"
  ON transactions FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated insert on transactions"
  ON transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on transactions"
  ON transactions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on transactions"
  ON transactions FOR DELETE
  USING (true);

-- ==========================================
-- HELPER VIEWS
-- ==========================================

-- View: Student payment summary
CREATE VIEW student_payment_summary AS
SELECT 
  s.id,
  s.first_name,
  s.last_name,
  s.number,
  COUNT(DISTINCT t.schedule_id) as schedules_paid,
  COALESCE(SUM(t.amount), 0) as total_paid
FROM students s
LEFT JOIN transactions t ON s.id = t.student_id AND t.source = 'schedule'
GROUP BY s.id, s.first_name, s.last_name, s.number;

-- View: Schedule collection summary
CREATE VIEW schedule_collection_summary AS
SELECT 
  sch.id,
  sch.name,
  sch.amount_per_item,
  CARDINALITY(sch.student_ids) as total_students,
  COUNT(DISTINCT t.student_id) as students_paid,
  COALESCE(SUM(t.amount), 0) as total_collected,
  (sch.amount_per_item * CARDINALITY(sch.student_ids)) as total_target
FROM schedules sch
LEFT JOIN transactions t ON sch.id = t.schedule_id
GROUP BY sch.id, sch.name, sch.amount_per_item, sch.student_ids;

-- ==========================================
-- COMMENTS
-- ==========================================
COMMENT ON TABLE students IS 'Student profiles with personal information';
COMMENT ON TABLE schedules IS 'Payment schedules for collecting money from students';
COMMENT ON TABLE transactions IS 'Financial transactions (income/expense) including schedule-based payments';
COMMENT ON VIEW student_payment_summary IS 'Summary of payment status for each student';
COMMENT ON VIEW schedule_collection_summary IS 'Summary of collection status for each schedule';
