-- ============================================================
-- SPICE ROUTE — FINANCIAL MODULE
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id          SERIAL PRIMARY KEY,
  category    TEXT NOT NULL CHECK (category IN ('salary','inventory','maintenance','electricity','marketing','rent','miscellaneous')),
  amount      DECIMAL(12,2) NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  vendor      TEXT,
  file_url    TEXT,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON expenses FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
