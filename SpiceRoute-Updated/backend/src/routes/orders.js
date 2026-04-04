import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ─── GET /api/orders ──────────────────────────────────────────────────────────
// IMPORTANT: all static/named routes MUST come before /:id
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, date, limit = 100 } = req.query;
    let query = supabase
      .from('orders')
      .select(`*, order_items(*, menu_items(name, image_emoji))`)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (status) query = query.eq('status', status);
    if (date)   query = query.gte('created_at', `${date}T00:00:00`).lte('created_at', `${date}T23:59:59`);

    // Captains see their own orders only
    if (req.user.role === 'captain') query = query.eq('captain_id', req.user.id);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/orders/cook-queue ───────────────────────────────────────────────
router.get('/cook-queue', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`*, order_items(*, menu_items(name, image_emoji, prep_time))`)
      .in('status', ['pending', 'confirmed', 'preparing'])
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/orders/stats/summary ───────────────────────────────────────────
// MUST be before /:id so Express doesn't treat "stats" as an id param
router.get('/stats/summary', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: todayOrders } = await supabase
      .from('orders')
      .select('total, status')
      .gte('created_at', `${today}T00:00:00`);

    const revenue      = todayOrders?.filter(o => o.status === 'paid').reduce((s, o) => s + parseFloat(o.total), 0) || 0;
    const totalOrders  = todayOrders?.length || 0;
    const pendingOrders = todayOrders?.filter(o => ['pending','confirmed','preparing'].includes(o.status)).length || 0;

    res.json({ revenue, totalOrders, pendingOrders, date: today });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/orders/track/:id — public order tracking ───────────────────────
// MUST be before /:id
router.get('/track/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, status, payment_status, order_type, table_number,
        customer_name, customer_phone, subtotal, tax, total,
        special_instructions, created_at, updated_at, served_at,
        order_items(menu_item_name, quantity, unit_price, cook_status),
        captain:captain_id(name),
        cook:cook_id(name)
      `)
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(404).json({ error: 'Order not found' });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/orders/by-customer/:email ──────────────────────────────────────
// MUST be before /:id
router.get('/by-customer/:email', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(menu_item_name, quantity, unit_price)')
      .eq('customer_email', req.params.email)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
// Dynamic param MUST be last among GETs
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`*, order_items(*, menu_items(name, image_emoji, prep_time))`)
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(404).json({ error: 'Order not found' });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/orders ─────────────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      items, table_number, table_id, customer_name, customer_phone,
      order_type = 'dine-in', special_instructions, delivery_address,
      payment_method, customer_email: bodyEmail,
    } = req.body;

    if (!items || items.length === 0)
      return res.status(400).json({ error: 'No items in order' });

    // ── Resolve customer identity ──────────────────────────────────────────
    let resolvedCustomerId    = null;
    let resolvedCustomerEmail = bodyEmail || null;
    let resolvedCustomerName  = customer_name || null;

    if (req.user.role === 'customer') {
      resolvedCustomerId    = req.user.id;
      resolvedCustomerEmail = req.user.email;
      if (!resolvedCustomerName) {
        const { data: cust } = await supabase
          .from('customers').select('name').eq('id', req.user.id).single();
        resolvedCustomerName = cust?.name || req.user.name;
      }
    }

    // ── Stock check ────────────────────────────────────────────────────────
    for (const item of items) {
      const { data: recipes } = await supabase
        .from('menu_recipes')
        .select('*, ingredients(name, stock)')
        .eq('menu_item_id', item.id);
      if (recipes) {
        for (const r of recipes) {
          if (r.ingredients.stock < r.quantity * item.quantity) {
            return res.status(400).json({ error: `Insufficient stock: ${r.ingredients.name}` });
          }
        }
      }
    }

    // ── Create order ────────────────────────────────────────────────────────
    const subtotal = parseFloat(items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2));
    const tax      = parseFloat((subtotal * 0.08).toFixed(2));
    const total    = parseFloat((subtotal + tax).toFixed(2));
    const orderId  = `ORD_${Date.now()}`;

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert([{
        id: orderId,
        customer_id:    resolvedCustomerId,
        customer_name:  resolvedCustomerName,
        customer_phone,
        customer_email: resolvedCustomerEmail,
        table_id, table_number,
        order_type, special_instructions, delivery_address, payment_method,
        captain_id: ['captain','manager','owner'].includes(req.user.role) ? req.user.id : null,
        subtotal, tax, total,
        status: 'pending',
        payment_status: 'unpaid',
      }])
      .select()
      .single();

    if (orderErr) return res.status(500).json({ error: orderErr.message });

    // ── Insert order items ─────────────────────────────────────────────────
    const orderItems = items.map(i => ({
      order_id:       orderId,
      menu_item_id:   i.id,
      menu_item_name: i.name,
      quantity:       i.quantity,
      unit_price:     i.price,
      special_request: i.special_request || null,
    }));
    await supabase.from('order_items').insert(orderItems);

    // ── Deduct ingredient stock ────────────────────────────────────────────
    for (const item of items) {
      const { data: recipes } = await supabase
        .from('menu_recipes').select('*').eq('menu_item_id', item.id);
      if (recipes) {
        for (const r of recipes) {
          await supabase.rpc('decrement_stock', {
            ing_id: r.ingredient_id,
            amount: r.quantity * item.quantity,
          });
        }
      }
    }

    // ── Update table status ────────────────────────────────────────────────
    if (table_id && order_type === 'dine-in') {
      await supabase.from('restaurant_tables').update({ status: 'occupied' }).eq('id', table_id);
    }

    // ── Notify cook ────────────────────────────────────────────────────────
    await supabase.from('notifications').insert([{
      target_role:      'cook',
      title:            'New Order',
      message:          `Order ${orderId} · ${order_type === 'dine-in' ? `Table ${table_number || '?'}` : order_type} needs attention`,
      type:             'order',
      related_order_id: orderId,
    }]);

    res.status(201).json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── PATCH /api/orders/:id/status ────────────────────────────────────────────
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status, cook_id } = req.body;
    const valid = ['pending','confirmed','preparing','ready','served','paid','cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const upd = { status, updated_at: new Date().toISOString() };
    if (cook_id)         upd.cook_id  = cook_id;
    if (status === 'served') upd.served_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('orders').update(upd).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });

    if (status === 'paid' && data.table_id) {
      await supabase.from('restaurant_tables').update({ status: 'cleaning' }).eq('id', data.table_id);
    }
    if (status === 'ready') {
      await supabase.from('notifications').insert([{
        target_role: 'captain',
        title:       'Order Ready',
        message:     `Order ${req.params.id} is ready to serve!`,
        type:        'success',
        related_order_id: req.params.id,
      }]);
    }

    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── PATCH /api/orders/:id/item-status ───────────────────────────────────────
router.patch('/:id/item-status', authenticate, async (req, res) => {
  try {
    const { item_id, cook_status } = req.body;
    const { data, error } = await supabase
      .from('order_items')
      .update({ cook_status })
      .eq('id', item_id)
      .eq('order_id', req.params.id)
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DELETE /api/orders/:id ───────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    await supabase.from('order_items').delete().eq('order_id', req.params.id);
    const { error } = await supabase.from('orders').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;