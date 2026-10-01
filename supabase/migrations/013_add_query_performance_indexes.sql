-- Indexes for the high-frequency payment-status and LINE status queries.
-- Both are additive and preserve existing RLS/policies.

CREATE INDEX IF NOT EXISTS idx_schedules_student_ids_gin
  ON schedules USING GIN (student_ids);

CREATE INDEX IF NOT EXISTS idx_transactions_schedule_student_income
  ON transactions (schedule_id, student_id)
  INCLUDE (amount)
  WHERE source = 'schedule' AND kind = 'income';
