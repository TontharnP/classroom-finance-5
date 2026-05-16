-- Semi-automatic LINE slip review metadata.
-- Keeps existing line_payment_requests rows compatible while adding helper
-- checks for treasurer review. These checks are advisory only.

ALTER TABLE line_payment_requests
  ADD COLUMN IF NOT EXISTS slip_status TEXT,
  ADD COLUMN IF NOT EXISTS slip_qr_payload TEXT,
  ADD COLUMN IF NOT EXISTS slip_image_hash TEXT,
  ADD COLUMN IF NOT EXISTS slip_ocr_text TEXT,
  ADD COLUMN IF NOT EXISTS slip_auto_check_result TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reject_reason TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE line_payment_requests
  DROP CONSTRAINT IF EXISTS line_payment_requests_status_check;

ALTER TABLE line_payment_requests
  ADD CONSTRAINT line_payment_requests_status_check CHECK (
    status IN (
      'selecting',
      'awaiting_slip',
      'pending_review',
      'pending_slip_review',
      'cash_pending',
      'approved',
      'rejected',
      'expired'
    )
  );

ALTER TABLE line_payment_requests
  DROP CONSTRAINT IF EXISTS line_payment_requests_slip_status_check;

ALTER TABLE line_payment_requests
  ADD CONSTRAINT line_payment_requests_slip_status_check CHECK (
    slip_status IS NULL OR slip_status IN (
      'pending_slip_review',
      'approved',
      'rejected',
      'duplicate_suspected',
      'wrong_amount'
    )
  );

CREATE INDEX IF NOT EXISTS idx_line_payment_requests_slip_qr_payload
  ON line_payment_requests(slip_qr_payload)
  WHERE slip_qr_payload IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_line_payment_requests_slip_image_hash
  ON line_payment_requests(slip_image_hash)
  WHERE slip_image_hash IS NOT NULL;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-slips', 'payment-slips', false)
ON CONFLICT (id) DO UPDATE SET public = false;
