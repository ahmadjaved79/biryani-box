-- ============================================================
-- MIGRATION: Add customer_id to orders table
-- Run this in Supabase SQL Editor ONCE
-- ============================================================

-- Add customer_id column to orders (links to customers table)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Create index for fast customer order lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);

-- ============================================================
-- Backfill existing orders: match by customer_email
-- ============================================================
UPDATE orders o
SET customer_id = c.id
FROM customers c
WHERE o.customer_email = c.email
  AND o.customer_id IS NULL;

-- ============================================================
-- Also ensure customers table tracks voucher eligibility:
-- customers with total_spent > 1000 should be identified
-- Use this query to find them:
-- SELECT id, name, email, total_spent, loyalty_points
-- FROM customers WHERE total_spent > 1000 ORDER BY total_spent DESC;
-- ============================================================
