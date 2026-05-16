-- Tracks the bank slip transaction/reference number for duplicate detection.

ALTER TABLE line_payment_requests
  ADD COLUMN IF NOT EXISTS slip_transaction_id TEXT;

CREATE INDEX IF NOT EXISTS idx_line_payment_requests_slip_transaction_id
  ON line_payment_requests(slip_transaction_id)
  WHERE slip_transaction_id IS NOT NULL;
