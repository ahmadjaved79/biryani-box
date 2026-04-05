-- Run in Supabase SQL Editor
-- Adds missing columns to catering_requests

ALTER TABLE catering_requests
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id),
  ADD COLUMN IF NOT EXISTS staff_notes TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Change status options to match new flow
ALTER TABLE catering_requests
  DROP CONSTRAINT IF EXISTS catering_requests_status_check;

ALTER TABLE catering_requests
  ADD CONSTRAINT catering_requests_status_check
  CHECK (status IN ('submitted', 'reviewing', 'accepted', 'rejected', 'completed', 'cancelled'));

-- Set existing rows to 'submitted'
UPDATE catering_requests SET status = 'submitted' WHERE status = 'inquiry';