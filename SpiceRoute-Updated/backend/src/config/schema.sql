-- ============================================================
-- BIRYANI BOX RESTAURANT MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================================

-- USERS TABLE (Staff: owner, manager, captain, cook)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'captain', 'cook', 'delivery', 'customer')),
  phone TEXT,
  avatar TEXT,
  is_active BOOLEAN DEFAULT true,
  restaurant_name TEXT,
  tables_assigned TEXT[], -- for captains
  vehicle_type TEXT,      -- for delivery
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MENU CATEGORIES
CREATE TABLE IF NOT EXISTS menu_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category_id INT REFERENCES menu_categories(id),
  category TEXT,
  image_emoji TEXT DEFAULT '🍽️',
  image_url TEXT,
  prep_time INT DEFAULT 20,
  rating DECIMAL(3,1) DEFAULT 4.5,
  spice_level INT DEFAULT 2 CHECK (spice_level BETWEEN 1 AND 5),
  is_veg BOOLEAN DEFAULT false,
  is_halal BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INGREDIENTS
CREATE TABLE IF NOT EXISTS ingredients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  stock DECIMAL(10,2) DEFAULT 0,
  min_stock DECIMAL(10,2) DEFAULT 0,
  reorder_lead_days INT DEFAULT 2,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MENU RECIPES (links menu items to ingredients)
CREATE TABLE IF NOT EXISTS menu_recipes (
  id SERIAL PRIMARY KEY,
  menu_item_id INT REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id INT REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10,4) NOT NULL
);

-- TABLES (restaurant seating)
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id SERIAL PRIMARY KEY,
  table_number TEXT UNIQUE NOT NULL,
  capacity INT DEFAULT 4,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
  section TEXT DEFAULT 'main',
  captain_id UUID REFERENCES users(id)
);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT ('ORD_' || extract(epoch from now())::bigint::text),
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  table_id INT REFERENCES restaurant_tables(id),
  table_number TEXT,
  order_type TEXT DEFAULT 'dine-in' CHECK (order_type IN ('dine-in', 'takeaway', 'delivery', 'catering')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled')),
  captain_id UUID REFERENCES users(id),
  cook_id UUID REFERENCES users(id),
  delivery_agent_id UUID REFERENCES users(id),
  delivery_address TEXT,
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  special_instructions TEXT,
  rating INT,
  review TEXT,
  estimated_ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INT REFERENCES menu_items(id),
  menu_item_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  special_request TEXT,
  cook_status TEXT DEFAULT 'pending' CHECK (cook_status IN ('pending', 'preparing', 'ready'))
);

-- RESERVATIONS
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  party_size INT NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  table_id INT REFERENCES restaurant_tables(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show')),
  special_requests TEXT,
  occasion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GIFT CARDS
CREATE TABLE IF NOT EXISTS gift_cards (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance DECIMAL(10,2) NOT NULL,
  purchaser_name TEXT,
  purchaser_email TEXT,
  recipient_name TEXT,
  recipient_email TEXT,
  message TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CATERING REQUESTS
CREATE TABLE IF NOT EXISTS catering_requests (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  event_date DATE NOT NULL,
  event_type TEXT,
  guest_count INT NOT NULL,
  location TEXT,
  menu_preferences TEXT,
  budget_range TEXT,
  status TEXT DEFAULT 'inquiry' CHECK (status IN ('inquiry', 'quoted', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  quoted_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STAFF ACTIVITY LOG
CREATE TABLE IF NOT EXISTS staff_activity (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  target_role TEXT,  -- 'cook', 'captain', 'manager', 'owner', or NULL for all
  target_user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'order', 'urgent')),
  is_read BOOLEAN DEFAULT false,
  related_order_id TEXT REFERENCES orders(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Menu Categories
INSERT INTO menu_categories (name, display_order) VALUES
  ('Biryani', 1),
  ('Starters', 2),
  ('Breads', 3),
  ('Curries', 4),
  ('Desserts', 5),
  ('Beverages', 6),
  ('Sides', 7)
ON CONFLICT DO NOTHING;

-- Menu Items
INSERT INTO menu_items (name, description, price, category, image_emoji, prep_time, rating, spice_level, is_veg, is_halal) VALUES
  ('Chicken Dum Biryani', 'Traditional Hyderabadi dum biryani with succulent chicken and aromatic basmati rice.', 18.99, 'Biryani', '🍚', 25, 4.8, 3, false, true),
  ('Mutton Dum Biryani', 'Slow-cooked mutton layered with saffron-infused rice and premium heritage spices.', 22.99, 'Biryani', '🍚', 30, 4.9, 3, false, true),
  ('Shrimp Biryani', 'Coastal-style biryani with tiger shrimp and fragrant spices.', 24.99, 'Biryani', '🍚', 25, 4.7, 2, false, true),
  ('Vegetable Dum Biryani', 'Garden-fresh vegetables slow-cooked with aromatic basmati rice.', 14.99, 'Biryani', '🍚', 20, 4.5, 2, true, true),
  ('Egg Biryani', 'Farm-fresh eggs layered with long-grain basmati and whole spices.', 15.99, 'Biryani', '🍚', 20, 4.6, 2, false, true),
  ('Chicken Tikka', 'Tender chicken marinated in yogurt and spices, grilled to perfection.', 14.99, 'Starters', '🍗', 15, 4.7, 2, false, true),
  ('Paneer Tikka', 'Cottage cheese cubes marinated and grilled with bell peppers.', 12.99, 'Starters', '🧀', 15, 4.6, 2, true, true),
  ('Mutton Seekh Kebab', 'Minced mutton mixed with spices, skewered and grilled.', 15.99, 'Starters', '🍢', 20, 4.8, 3, false, true),
  ('Garlic Naan', 'Soft leavened bread brushed with garlic butter.', 3.99, 'Breads', '🫓', 8, 4.7, 1, true, true),
  ('Butter Roti', 'Whole wheat flatbread with butter glaze.', 2.99, 'Breads', '🫓', 5, 4.5, 1, true, true),
  ('Dal Makhani', 'Creamy black lentils slow-cooked overnight with butter and cream.', 11.99, 'Curries', '🍲', 15, 4.8, 1, true, true),
  ('Butter Chicken', 'Tender chicken in rich tomato-based creamy gravy.', 17.99, 'Curries', '🍛', 15, 4.9, 2, false, true),
  ('Gulab Jamun', 'Soft milk-solid dumplings soaked in rose-flavored sugar syrup.', 6.99, 'Desserts', '🍮', 5, 4.7, 1, true, true),
  ('Rasmalai', 'Soft cheese dumplings soaked in cardamom-flavored sweetened milk.', 7.99, 'Desserts', '🍮', 5, 4.8, 1, true, true),
  ('Mango Lassi', 'Refreshing yogurt drink blended with fresh Alphonso mangoes.', 5.99, 'Beverages', '🥛', 5, 4.8, 1, true, true),
  ('Masala Chai', 'Spiced Indian tea brewed with ginger, cardamom, and milk.', 3.99, 'Beverages', '☕', 5, 4.6, 1, true, true),
  ('Raita', 'Cooling yogurt with cucumber and cumin.', 3.99, 'Sides', '🥗', 5, 4.4, 1, true, true),
  ('Papad', 'Crispy lentil wafers served with chutneys.', 2.99, 'Sides', '🥙', 3, 4.3, 1, true, true)
ON CONFLICT DO NOTHING;

-- Ingredients
INSERT INTO ingredients (name, unit, stock, min_stock, reorder_lead_days, unit_cost) VALUES
  ('Basmati Rice', 'kg', 100, 10, 3, 2.50),
  ('Chicken', 'kg', 60, 8, 2, 5.20),
  ('Mutton', 'kg', 40, 6, 3, 8.50),
  ('Shrimp', 'kg', 25, 5, 4, 9.00),
  ('Paneer', 'kg', 30, 5, 3, 4.50),
  ('Vegetables', 'kg', 80, 12, 2, 3.20),
  ('Eggs', 'units', 120, 20, 2, 0.20),
  ('Flour', 'kg', 60, 8, 2, 1.10),
  ('Dairy', 'kg', 70, 10, 2, 3.80),
  ('Spices', 'kg', 40, 5, 2, 10.00),
  ('Tomatoes', 'kg', 30, 8, 2, 2.00),
  ('Onions', 'kg', 50, 10, 2, 1.50),
  ('Garlic', 'kg', 10, 3, 2, 5.00),
  ('Ginger', 'kg', 10, 3, 2, 4.50),
  ('Saffron', 'g', 100, 20, 5, 0.50)
ON CONFLICT DO NOTHING;

-- Restaurant Tables
INSERT INTO restaurant_tables (table_number, capacity, status, section) VALUES
  ('T1', 2, 'available', 'indoor'),
  ('T2', 4, 'available', 'indoor'),
  ('T3', 4, 'available', 'indoor'),
  ('T4', 6, 'available', 'indoor'),
  ('T5', 6, 'available', 'indoor'),
  ('T6', 8, 'available', 'private'),
  ('T7', 4, 'available', 'outdoor'),
  ('T8', 4, 'available', 'outdoor'),
  ('T9', 2, 'available', 'bar'),
  ('T10', 10, 'available', 'banquet')
ON CONFLICT DO NOTHING;

-- Seed Staff Users
-- Password for ALL accounts: password123
-- Hash generated fresh: bcrypt.hash('password123', 10) - VERIFIED CORRECT
INSERT INTO users (name, email, password_hash, role, phone) VALUES
  ('Rajesh Kumar', 'owner@spiceroute.com',    '$2a$10$KiRpBPNGcgtpuhoJqJmk5eCLoH.9ADnfkv8lfPGNLgFK/9Nn2uCHq', 'owner',    '+1-555-0101'),
  ('Priya Sharma', 'manager@spiceroute.com',  '$2a$10$KiRpBPNGcgtpuhoJqJmk5eCLoH.9ADnfkv8lfPGNLgFK/9Nn2uCHq', 'manager',  '+1-555-0102'),
  ('Arjun Singh',  'captain@spiceroute.com',  '$2a$10$KiRpBPNGcgtpuhoJqJmk5eCLoH.9ADnfkv8lfPGNLgFK/9Nn2uCHq', 'captain',  '+1-555-0103'),
  ('Ravi Kumar',   'cook@spiceroute.com',     '$2a$10$KiRpBPNGcgtpuhoJqJmk5eCLoH.9ADnfkv8lfPGNLgFK/9Nn2uCHq', 'cook',     '+1-555-0105'),
  ('Vikram Patel', 'delivery@spiceroute.com', '$2a$10$KiRpBPNGcgtpuhoJqJmk5eCLoH.9ADnfkv8lfPGNLgFK/9Nn2uCHq', 'delivery', '+1-555-0104')
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies (service role bypasses RLS, so backend can do everything)
CREATE POLICY "Service role full access" ON users FOR ALL USING (true);
CREATE POLICY "Service role full access" ON orders FOR ALL USING (true);
CREATE POLICY "Service role full access" ON menu_items FOR ALL USING (true);
CREATE POLICY "Service role full access" ON ingredients FOR ALL USING (true);
CREATE POLICY "Service role full access" ON notifications FOR ALL USING (true);

-- ============================================================
-- RPC FUNCTION: decrement_stock (called when order is placed)
-- ============================================================
CREATE OR REPLACE FUNCTION decrement_stock(ing_id INT, amount DECIMAL)
RETURNS void AS $$
BEGIN
  UPDATE ingredients
  SET stock = GREATEST(0, stock - amount),
      updated_at = NOW()
  WHERE id = ing_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STORED PROCEDURE: decrement_stock
-- Called by orders route when an order is placed
-- ============================================================
CREATE OR REPLACE FUNCTION decrement_stock(ing_id INT, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE ingredients
  SET stock = GREATEST(0, stock - amount),
      updated_at = NOW()
  WHERE id = ing_id;
END;
$$ LANGUAGE plpgsql;
