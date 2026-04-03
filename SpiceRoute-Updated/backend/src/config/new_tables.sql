-- ============================================================
-- SPICE ROUTE — NEW TABLES ONLY (run in Supabase SQL Editor)
-- DO NOT re-run schema.sql — these are ADDITIONAL tables only
-- ============================================================

-- FEEDBACK / COMPLAINT BOX
CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  order_id TEXT,
  feedback_type TEXT DEFAULT 'general' CHECK (feedback_type IN ('complaint','suggestion','compliment','general')),
  subject TEXT,
  message TEXT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  staff_involved TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_review','resolved','closed')),
  staff_reply TEXT,
  replied_by UUID,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOMER ACCOUNTS (separate from staff users)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  loyalty_points INT DEFAULT 0,
  total_orders INT DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LOYALTY TRANSACTIONS
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id SERIAL PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  order_id TEXT,
  points_earned INT DEFAULT 0,
  points_redeemed INT DEFAULT 0,
  balance_after INT DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SHIFT LOGS (staff attendance)
CREATE TABLE IF NOT EXISTS shift_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  duration_minutes INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENT TRANSACTIONS
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  method TEXT CHECK (method IN ('cash','card','upi','online','gift_card')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  transaction_ref TEXT,
  processed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DAILY SPECIALS / ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info','promo','special','warning')),
  target TEXT DEFAULT 'all' CHECK (target IN ('all','staff','customer')),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WASTE LOG (cook module - track food waste)
CREATE TABLE IF NOT EXISTS waste_log (
  id SERIAL PRIMARY KEY,
  ingredient_id INT REFERENCES ingredients(id),
  ingredient_name TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT,
  reason TEXT CHECK (reason IN ('expired','overcooked','spillage','quality','other')),
  reported_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (service role bypasses)
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON feedback FOR ALL USING (true);
CREATE POLICY "Service role full access" ON customers FOR ALL USING (true);
CREATE POLICY "Service role full access" ON loyalty_transactions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON shift_logs FOR ALL USING (true);
CREATE POLICY "Service role full access" ON payments FOR ALL USING (true);
CREATE POLICY "Service role full access" ON announcements FOR ALL USING (true);
CREATE POLICY "Service role full access" ON waste_log FOR ALL USING (true);
