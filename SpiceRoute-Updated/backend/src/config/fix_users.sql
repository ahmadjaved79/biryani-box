-- ============================================================
-- FIX SCRIPT — Run this in Supabase SQL Editor if you already
-- ran the old schema.sql and login is not working.
-- This fixes: wrong email domain + wrong password hash
-- ============================================================

-- Update emails from biryanibox.com → spiceroute.com
-- AND update the password hash to the correct one for 'password123'
-- Hash verified: bcrypt.hash('password123', 10)

UPDATE users SET
  email = 'owner@spiceroute.com',
  password_hash = '$2a$10$KiRpBPNGcgtpuhoJqJmk5eCLoH.9ADnfkv8lfPGNLgFK/9Nn2uCHq'
WHERE email IN ('owner@biryanibox.com', 'owner@spiceroute.com');

UPDATE users SET
  email = 'manager@spiceroute.com',
  password_hash = '$2a$10$KiRpBPNGcgtpuhoJqJmk5eCLoH.9ADnfkv8lfPGNLgFK/9Nn2uCHq'
WHERE email IN ('manager@biryanibox.com', 'manager@spiceroute.com');

UPDATE users SET
  email = 'captain@spiceroute.com',
  password_hash = '$2a$10$KiRpBPNGcgtpuhoJqJmk5eCLoH.9ADnfkv8lfPGNLgFK/9Nn2uCHq'
WHERE email IN ('captain@biryanibox.com', 'captain@spiceroute.com');

UPDATE users SET
  email = 'cook@spiceroute.com',
  password_hash = '$2a$10$KiRpBPNGcgtpuhoJqJmk5eCLoH.9ADnfkv8lfPGNLgFK/9Nn2uCHq'
WHERE email IN ('cook@biryanibox.com', 'cook@spiceroute.com');

UPDATE users SET
  email = 'delivery@spiceroute.com',
  password_hash = '$2a$10$KiRpBPNGcgtpuhoJqJmk5eCLoH.9ADnfkv8lfPGNLgFK/9Nn2uCHq'
WHERE email IN ('delivery@biryanibox.com', 'delivery@spiceroute.com');

-- Verify the fix worked - you should see 5 users with spiceroute.com emails
SELECT id, name, email, role, is_active FROM users ORDER BY role;
