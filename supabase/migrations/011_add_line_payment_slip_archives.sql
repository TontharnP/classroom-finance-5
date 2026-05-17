-- Keeps completed LINE payment request rows removable while preserving slip
-- metadata needed for duplicate checks and approved-slip retention.

CREATE TABLE IF NOT EXISTS line_payment_slip_archives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_user_id TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  transaction_id UUID UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  method VARCHAR(20),
  amount DECIMAL(10,2) NOT NULL,
  slip_url TEXT,
  slip_pathname TEXT,
  slip_qr_payload TEXT,
  slip_image_hash TEXT,
  slip_transaction_id TEXT,
  slip_auto_check_result TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_line_payment_slip_archives_line_paid
  ON line_payment_slip_archives(line_user_id, paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_line_payment_slip_archives_slip_qr_payload
  ON line_payment_slip_archives(slip_qr_payload)
  WHERE slip_qr_payload IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_line_payment_slip_archives_slip_image_hash
  ON line_payment_slip_archives(slip_image_hash)
  WHERE slip_image_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_line_payment_slip_archives_slip_transaction_id
  ON line_payment_slip_archives(slip_transaction_id)
  WHERE slip_transaction_id IS NOT NULL;
