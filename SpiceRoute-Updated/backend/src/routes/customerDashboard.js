import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ─── GET /api/customer/profile ───────────────────────────────────────────────
// Full customer profile with stats computed from real orders
router.get('/profile', authenticate, async (req, res) => {
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .select('id, name, email, phone, address, loyalty_points, total_orders, total_spent, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !customer) return res.status(404).json({ error: 'Customer not found' });

    // Compute real stats from orders table
    const { data: orderStats } = await supabase
      .from('orders')
      .select('total, status, created_at')
      .eq('customer_email', customer.email);

    const allOrders = orderStats || [];
    const paidOrders = allOrders.filter(o => o.payment_status === 'paid' || o.status === 'paid');
    const totalSpent = paidOrders.reduce((s, o) => s + parseFloat(o.total || 0), 0);

    // Loyalty tier logic
    const points = customer.loyalty_points || 0;
    const tier = points >= 5000 ? 'Platinum' : points >= 2000 ? 'Gold' : points >= 500 ? 'Silver' : 'Bronze';
    const tierBenefits = {
      Bronze:   { discount: 0,   nextTier: 'Silver',   pointsNeeded: 500  - points },
      Silver:   { discount: 5,   nextTier: 'Gold',     pointsNeeded: 2000 - points },
      Gold:     { discount: 10,  nextTier: 'Platinum', pointsNeeded: 5000 - points },
      Platinum: { discount: 15,  nextTier: null,       pointsNeeded: 0 },
    };

    res.json({
      ...customer,
      total_spent: parseFloat(totalSpent.toFixed(2)),
      total_orders: allOrders.length,
      loyalty_tier: tier,
      tier_benefits: tierBenefits[tier],
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/customer/order-history ─────────────────────────────────────────
// Paginated order history for logged-in customer
router.get('/order-history', authenticate, async (req, res) => {
  try {
    const { data: customer } = await supabase
      .from('customers').select('email').eq('id', req.user.id).single();

    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const { data, error } = await supabase
      .from('orders')
      .select('id, status, payment_status, order_type, table_number, subtotal, tax, total, created_at, served_at, order_items(menu_item_name, quantity, unit_price)')
      .eq('customer_email', customer.email)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/customer/active-order ──────────────────────────────────────────
// Most recent non-completed order for tracking
router.get('/active-order', authenticate, async (req, res) => {
  try {
    const { data: customer } = await supabase
      .from('customers').select('email').eq('id', req.user.id).single();

    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, status, payment_status, order_type, table_number,
        subtotal, tax, total, created_at, updated_at, served_at,
        special_instructions,
        order_items(menu_item_name, quantity, unit_price, cook_status)
      `)
      .eq('customer_email', customer.email)
      .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'served'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return res.json(null); // no active order is fine
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/customer/recommendations ───────────────────────────────────────
// Smart recommendations: customer's past items + globally popular items
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const { data: customer } = await supabase
      .from('customers').select('email').eq('id', req.user.id).single();

    // 1. Items customer has ordered before (frequency)
    let pastItems = [];
    if (customer?.email) {
      const { data: pastOrders } = await supabase
        .from('orders')
        .select('order_items(menu_item_name, quantity)')
        .eq('customer_email', customer.email)
        .limit(20);

      const freq = {};
      (pastOrders || []).forEach(o =>
        (o.order_items || []).forEach(i => {
          freq[i.menu_item_name] = (freq[i.menu_item_name] || 0) + i.quantity;
        })
      );
      pastItems = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);
    }

    // 2. Globally popular items (from order_items table, available only)
    const { data: popularRaw } = await supabase
      .from('order_items')
      .select('menu_item_name, quantity')
      .limit(500);

    const globalFreq = {};
    (popularRaw || []).forEach(i => {
      globalFreq[i.menu_item_name] = (globalFreq[i.menu_item_name] || 0) + i.quantity;
    });
    const globalTop = Object.entries(globalFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);

    // 3. Fetch full menu item details for recommended names
    const allNames = [...new Set([...pastItems, ...globalTop])].slice(0, 8);

    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('id, name, price, category, image_emoji, rating, spice_level, is_veg, is_halal, description, is_available')
      .in('name', allNames.length > 0 ? allNames : ['Chicken Dum Biryani'])
      .eq('is_available', true);

    // Tag each item
    const result = (menuItems || []).map(item => ({
      ...item,
      is_reorder: pastItems.includes(item.name),
      order_count: globalFreq[item.name] || 0,
    })).sort((a, b) => (b.is_reorder ? 1 : 0) - (a.is_reorder ? 1 : 0));

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/customer/offers ─────────────────────────────────────────────────
// Personalised offers based on loyalty tier and order count
router.get('/offers', authenticate, async (req, res) => {
  try {
    const { data: customer } = await supabase
      .from('customers')
      .select('loyalty_points, total_orders, email, created_at')
      .eq('id', req.user.id)
      .single();

    if (!customer) return res.json([]);

    const points = customer.loyalty_points || 0;
    const orders = customer.total_orders || 0;
    const tier   = points >= 5000 ? 'Platinum' : points >= 2000 ? 'Gold' : points >= 500 ? 'Silver' : 'Bronze';

    const offers = [];

    // Welcome offer for new customers (< 2 orders)
    if (orders < 2) {
      offers.push({
        id: 'WELCOME10',
        title: 'Welcome Offer',
        description: '10% off your first order',
        discount_pct: 10,
        min_order: 15,
        code: 'WELCOME10',
        type: 'new_customer',
        expires: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
    }

    // Loyalty milestone offers
    if (points >= 500) {
      offers.push({
        id: 'LOYAL5',
        title: 'Loyalty Reward',
        description: `${tier} member — 5% off any order`,
        discount_pct: 5,
        min_order: 0,
        code: 'LOYAL5',
        type: 'loyalty',
        expires: null,
      });
    }
    if (points >= 2000) {
      offers.push({
        id: 'GOLD10',
        title: 'Gold Member Perk',
        description: 'Extra 10% off orders above $30',
        discount_pct: 10,
        min_order: 30,
        code: 'GOLD10',
        type: 'loyalty',
        expires: null,
      });
    }

    // Frequent buyer — 5+ orders
    if (orders >= 5) {
      offers.push({
        id: 'FREQUENT',
        title: 'Regular Guest Perk',
        description: 'Free dessert on orders above $25',
        discount_pct: 0,
        free_item: 'Gulab Jamun',
        min_order: 25,
        code: 'FREESWEET',
        type: 'freebie',
        expires: null,
      });
    }

    // Active announcements tagged 'customer'
    const { data: announcements } = await supabase
      .from('announcements')
      .select('id, title, message, type')
      .eq('is_active', true)
      .or('target.eq.customer,target.eq.all')
      .order('created_at', { ascending: false })
      .limit(3);

    (announcements || []).forEach(a => {
      offers.push({
        id: `ANN_${a.id}`,
        title: a.title,
        description: a.message,
        type: 'announcement',
        code: null,
        expires: null,
      });
    });

    res.json(offers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
