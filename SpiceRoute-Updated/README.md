# 🌶️ Spice Route — Full-Stack Restaurant Management System

Complete end-to-end platform: React + Node.js/Express + Supabase + Socket.io

## Quick Start

### 1. Supabase Setup (FREE)
1. Go to https://supabase.com → sign up → New project (region: US East)
2. Settings → API → copy Project URL, anon key, service_role key
3. SQL Editor → paste contents of `backend/src/config/schema.sql` → Run

### 2. Backend
```bash
cd backend
cp .env.example .env    # fill in Supabase keys + JWT_SECRET
npm install
npm run dev             # runs on http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev             # runs on http://localhost:5173
```

## Login Credentials (password: password123)
| Role    | Email                    | Portal           |
|---------|--------------------------|------------------|
| Owner   | owner@spiceroute.com     | /dashboard       |
| Manager | manager@spiceroute.com   | /dashboard       |
| Captain | captain@spiceroute.com   | /dashboard       |
| Cook    | cook@spiceroute.com      | /cook-dashboard  |

## Features
- Owner/Manager: Analytics, POS, Menu, Inventory, Staff management
- Captain: Order booking (POS), Kitchen flow view
- Cook (NEW): Order queue, per-item tracking, ingredient restocking
- Customer: Menu, Cart, Checkout, Reservations, Catering, Gift Cards
- Real-time updates via Socket.io between Cook ↔ Captain ↔ Manager

Full documentation in the README.md file.
