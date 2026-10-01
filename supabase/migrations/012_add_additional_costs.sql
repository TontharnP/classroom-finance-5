-- Manual percentage-based late charges for overdue student schedule balances.

CREATE TABLE IF NOT EXISTS additional_cost_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_key UUID NOT NULL UNIQUE,
  percentage DECIMAL(7,4) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  affected_student_count INTEGER NOT NULL CHECK (affected_student_count > 0),
  overdue_item_count INTEGER NOT NULL CHECK (overdue_item_count > 0),
  base_total DECIMAL(12,2) NOT NULL CHECK (base_total > 0),
  additional_total DECIMAL(12,2) NOT NULL CHECK (additional_total > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS additional_cost_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES additional_cost_runs(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  base_outstanding DECIMAL(12,2) NOT NULL CHECK (base_outstanding > 0),
  percentage DECIMAL(7,4) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT additional_cost_items_run_schedule_student_unique
    UNIQUE (run_id, schedule_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_additional_cost_items_schedule_student
  ON additional_cost_items(schedule_id, student_id);
CREATE INDEX IF NOT EXISTS idx_additional_cost_items_run
  ON additional_cost_items(run_id);
CREATE INDEX IF NOT EXISTS idx_additional_cost_runs_created_at
  ON additional_cost_runs(created_at DESC);

ALTER TABLE additional_cost_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE additional_cost_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on additional cost runs"
  ON additional_cost_runs FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on additional cost runs"
  ON additional_cost_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on additional cost runs"
  ON additional_cost_runs FOR DELETE USING (true);

CREATE POLICY "Allow public read access on additional cost items"
  ON additional_cost_items FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on additional cost items"
  ON additional_cost_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on additional cost items"
  ON additional_cost_items FOR DELETE USING (true);

COMMENT ON TABLE additional_cost_runs IS 'Immutable audit record for each manual late-charge application';
COMMENT ON TABLE additional_cost_items IS 'Per-student, per-overdue-schedule late charges rounded before totals are summed';
