# 🌶️ Spice Route — Full-Stack Restaurant Management System

Complete end-to-end platform: React 19 + Node.js/Express + Supabase (PostgreSQL) + Socket.io real-time

---

## 📁 Structure

```
SpiceRoute/
├── README.md
├── frontend/          ← React + Vite
│   ├── src/api/       ← axios client + socket.io
│   ├── src/context/   ← Auth, Order, Cart (real API)
│   ├── src/pages/     ← All pages incl. CookDashboard
│   └── .env
└── backend/
    ├── src/config/schema.sql   ← Run in Supabase SQL Editor
    ├── src/routes/             ← All REST endpoints
    ├── src/server.js           ← Express + Socket.io
    └── .env
```

---

## 🗄️ STEP 1 — Supabase Setup (FREE)

1. Visit **https://supabase.com** → Start your project → sign up
2. Click **New project**:
   - Name: `spice-route`
   - Password: choose strong password
   - Region: **US East (N. Virginia)**
3. Wait ~2 min for provisioning
4. Go to **Settings → API**:
   - Copy **Project URL** → `SUPABASE_URL`
   - Copy **anon/public** key → `SUPABASE_ANON_KEY`
   - Copy **service_role** key → `SUPABASE_SERVICE_KEY`
5. Go to **SQL Editor → New query**
6. Open `backend/src/config/schema.sql` → copy ALL → paste → **Run**

---

## ⚙️ STEP 2 — Backend

```bash
cd backend
cp .env.example .env
```

Fill in `.env`:
```
PORT=5000
SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...
JWT_SECRET=change-this-to-any-long-random-string
FRONTEND_URL=http://localhost:5173
```

```bash
npm install
npm run dev
# → http://localhost:5000/api/health should return { status: "ok" }
```

---

## 🖥️ STEP 3 — Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

`.env` is pre-configured for local dev (`VITE_API_URL=http://localhost:5000/api`)

---

## 👥 Login Credentials (all use password: **password123**)

| Role     | Email                     | Redirects to       |
|----------|---------------------------|--------------------|
| Owner    | owner@spiceroute.com      | /dashboard         |
| Manager  | manager@spiceroute.com    | /dashboard         |
| Captain  | captain@spiceroute.com    | /dashboard (POS)   |
| **Cook** | **cook@spiceroute.com**   | **/cook-dashboard**|
| Delivery | delivery@spiceroute.com   | /delivery/hub      |

---

## 🎯 All Modules

### Owner `/dashboard`
- Command Hub — revenue, daily stats, top items, quick KPIs
- Order Booking (POS) — point-of-sale with live menu
- Kitchen Flow — real-time order status board
- Menu Master — add/edit/toggle availability
- Inventory — ingredient stock + reorder alerts
- Access Protocol — create/disable staff accounts
- Personnel — full staff directory

### Manager `/dashboard`
- Everything except staff account creation

### Captain `/dashboard`
- POS order booking for tables
- Kitchen Flow monitoring
- Personnel view

### 👨‍🍳 Cook `/cook-dashboard` ← **NEW MODULE**
- **Order Queue** — incoming / confirmed / preparing orders with live timer
- **Per-item tracking** — mark each dish done individually
- **Mark Order Ready** — auto-notifies captain via Socket.io
- **Ingredient Stock** — view stock levels, restock with +5/+10/+25 buttons
- **Stats** — completed today count, active orders, low-stock alerts
- **Auto-refresh** every 15 seconds + real-time socket events
- **Urgency timer** — turns red when order exceeds 15 minutes

### Customer Public Pages
- `/` — Homepage with featured menu
- `/cart` — Cart with quantity controls
- `/checkout` — Full checkout with delivery/takeaway + payment method
- `/reservations` — Real table booking form (saves to Supabase)
- `/gift-cards` — Gift card purchase
- `/catering` — Catering request form
- `/history` — Order history
- `/auth` — Customer login/register

---

## 🔌 API Reference

```
Auth
  POST /api/auth/login              { email, password } → { token, user }
  GET  /api/auth/me                 → user profile
  POST /api/auth/register           create staff (owner/manager only)

Orders
  GET    /api/orders                list (filtered by role)
  POST   /api/orders                create order + deduct ingredients
  GET    /api/orders/cook-queue     confirmed+preparing orders for cook
  PATCH  /api/orders/:id/status     pending→confirmed→preparing→ready→served→paid
  PATCH  /api/orders/:id/item-status mark individual item done
  DELETE /api/orders/:id            owner/manager only
  GET    /api/orders/stats/summary  today revenue/count

Menu
  GET    /api/menu                  public, supports ?category= ?available=true
  GET    /api/menu/categories       public
  POST   /api/menu                  add item
  PUT    /api/menu/:id              update item
  PATCH  /api/menu/:id/availability toggle on/off
  DELETE /api/menu/:id              owner only

Ingredients
  GET    /api/ingredients           with needs_reorder flag
  POST   /api/ingredients           add ingredient
  PUT    /api/ingredients/:id       full update
  PATCH  /api/ingredients/:id/restock  add stock amount

Tables
  GET    /api/tables                all tables with status
  PATCH  /api/tables/:id/status     available/occupied/reserved/cleaning

Staff
  GET    /api/staff                 all non-customer users
  PATCH  /api/staff/:id             update (can include password)
  PATCH  /api/staff/:id/toggle-active  enable/disable

Reservations
  GET    /api/reservations          list (auth required)
  POST   /api/reservations          create (public)
  PATCH  /api/reservations/:id/status  update status

Notifications
  GET    /api/notifications         role-filtered
  PATCH  /api/notifications/:id/read
  PATCH  /api/notifications/read-all

Analytics
  GET    /api/analytics/dashboard   today + month stats
  GET    /api/analytics/revenue?range=7  daily revenue chart data
  GET    /api/analytics/top-items   most ordered dishes
```

---

## ⚡ Real-time Flow (Socket.io)

```
Captain/POS → POST /api/orders
  ↓ server emits "new-order-received" to cook room
Cook Dashboard auto-updates queue

Cook marks order "preparing"
  ↓ PATCH /api/orders/:id/status { status: "preparing" }

Cook marks order "ready"
  ↓ server emits "item-ready-notify" to captain room
  ↓ notification saved to DB for captain
Captain sees order is ready to serve
```

---

## 🚀 Production Deployment

**Backend** → Railway.app (free tier):
1. Push `backend/` to GitHub repo
2. railway.app → New Project → Deploy from GitHub
3. Add all `.env` variables in Railway dashboard
4. Update `FRONTEND_URL` to your Vercel URL

**Frontend** → Vercel (free):
1. Push `frontend/` to GitHub repo
2. vercel.com → New Project → import repo
3. Add `VITE_API_URL=https://your-backend.railway.app/api`
4. Deploy

---

## 🛠️ Tech Stack

| Layer      | Tech                                  |
|------------|---------------------------------------|
| Frontend   | React 19, Vite 8, Tailwind CSS 3     |
| Animation  | Framer Motion 12                      |
| HTTP       | Axios 1.6                             |
| Real-time  | Socket.io 4.6 (client + server)       |
| Backend    | Node.js, Express 4                    |
| Database   | Supabase (PostgreSQL)                 |
| Auth       | JWT (jsonwebtoken), bcryptjs          |
| Icons      | Lucide React                          |
