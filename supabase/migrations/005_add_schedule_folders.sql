-- Add nested folders for schedule organization.

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

CREATE INDEX IF NOT EXISTS idx_schedule_folders_parent_sort
  ON schedule_folders(parent_id, sort_order, name);

DROP TRIGGER IF EXISTS update_schedule_folders_updated_at ON schedule_folders;
CREATE TRIGGER update_schedule_folders_updated_at
  BEFORE UPDATE ON schedule_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

INSERT INTO schedule_folders (name, parent_id, sort_order)
SELECT 'Default', NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM schedule_folders);

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES schedule_folders(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE schedules
SET folder_id = (SELECT id FROM schedule_folders ORDER BY sort_order, created_at LIMIT 1)
WHERE folder_id IS NULL;

ALTER TABLE schedules
  ALTER COLUMN folder_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_folder_sort
  ON schedules(folder_id, sort_order, start_date DESC);
