import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/orders/track/:id — customer order tracking (public, must be before /:id)
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

// GET /api/orders/cook-queue
router.get('/cook-queue', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`*, order_items(*, menu_items(name, image_emoji, prep_time))`)
      .in('status', ['confirmed', 'preparing'])
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/stats/summary
router.get('/stats/summary', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: todayOrders } = await supabase
      .from('orders')
      .select('total, status')
      .gte('created_at', `${today}T00:00:00`);

    const revenue = todayOrders?.filter(o => o.status === 'paid').reduce((s, o) => s + o.total, 0) || 0;
    const totalOrders = todayOrders?.length || 0;
    const pendingOrders = todayOrders?.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length || 0;

    res.json({ revenue, totalOrders, pendingOrders, date: today });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/by-customer/:email
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

// GET /api/orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, date, limit = 100 } = req.query;
    let query = supabase
      .from('orders')
      .select(`*, order_items(*, menu_items(name, image_emoji))`)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (status) query = query.eq('status', status);
    if (date) query = query.gte('created_at', `${date}T00:00:00`).lte('created_at', `${date}T23:59:59`);
    if (req.user.role === 'captain') query = query.eq('captain_id', req.user.id);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`*, order_items(*, menu_items(name, image_emoji, prep_time))`)
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(404).json({ error: 'Order not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      items, table_number, table_id, customer_name, customer_phone,
      customer_email, order_type = 'dine-in', special_instructions,
      delivery_address, payment_method
    } = req.body;

    if (!items || items.length === 0) return res.status(400).json({ error: 'No items in order' });

    // Check ingredient stock
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

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));
    const orderId = `ORD_${Date.now()}`;

    // Resolve customer_id if this is a logged-in customer
    let customer_id = null;
    let resolvedEmail = customer_email;
    if (req.user.role === 'customer') {
      customer_id = req.user.id;
      // Get customer email from customers table
      const { data: cust } = await supabase
        .from('customers')
        .select('email, name, phone')
        .eq('id', req.user.id)
        .single();
      if (cust) {
        resolvedEmail = cust.email;
      }
    }

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert([{
        id: orderId,
        customer_name: customer_name || (req.user.role === 'customer' ? req.user.name : null),
        customer_phone,
        customer_email: resolvedEmail,
        customer_id,
        table_id,
        table_number,
        order_type,
        special_instructions,
        delivery_address,
        payment_method,
        captain_id: ['captain', 'manager', 'owner'].includes(req.user.role) ? req.user.id : null,
        subtotal,
        tax,
        total,
        status: 'pending',
        payment_status: 'unpaid'
      }])
      .select()
      .single();

    if (orderErr) return res.status(500).json({ error: orderErr.message });

    // Insert order items
    const orderItems = items.map(i => ({
      order_id: orderId,
      menu_item_id: i.id,
      menu_item_name: i.name,
      quantity: i.quantity,
      unit_price: i.price,
      special_request: i.special_request || null
    }));
    await supabase.from('order_items').insert(orderItems);

    // Deduct ingredient stock
    for (const item of items) {
      const { data: recipes } = await supabase
        .from('menu_recipes')
        .select('*')
        .eq('menu_item_id', item.id);
      if (recipes) {
        for (const r of recipes) {
          await supabase.rpc('decrement_stock', {
            ing_id: r.ingredient_id,
            amount: r.quantity * item.quantity
          });
        }
      }
    }

    // Update table status
    if (table_id && order_type === 'dine-in') {
      await supabase.from('restaurant_tables').update({ status: 'occupied' }).eq('id', table_id);
    }

    // Update customer stats if logged-in customer
    if (customer_id) {
      const { data: custData } = await supabase
        .from('customers')
        .select('total_orders, total_spent, loyalty_points')
        .eq('id', customer_id)
        .single();

      if (custData) {
        const pointsEarned = Math.floor(total * 10); // 10 pts per $1
        await supabase
          .from('customers')
          .update({
            total_orders: (custData.total_orders || 0) + 1,
            total_spent: parseFloat(((custData.total_spent || 0) + total).toFixed(2)),
            loyalty_points: (custData.loyalty_points || 0) + pointsEarned
          })
          .eq('id', customer_id);

        // Log loyalty transaction
        await supabase.from('loyalty_transactions').insert([{
          customer_id,
          order_id: orderId,
          points_earned: pointsEarned,
          points_redeemed: 0,
          balance_after: (custData.loyalty_points || 0) + pointsEarned,
          description: `Order ${orderId} — earned ${pointsEarned} pts`
        }]);
      }
    }

    // Notification for cook
    await supabase.from('notifications').insert([{
      target_role: 'cook',
      title: 'New Order',
      message: `Order ${orderId} - Table ${table_number || 'N/A'} needs attention`,
      type: 'order',
      related_order_id: orderId
    }]);

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status, cook_id } = req.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const updateData = { status, updated_at: new Date().toISOString() };
    if (cook_id) updateData.cook_id = cook_id;
    if (status === 'served') updateData.served_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Free table when paid
    if (status === 'paid' && data.table_id) {
      await supabase.from('restaurant_tables').update({ status: 'cleaning' }).eq('id', data.table_id);
    }

    // Notification on ready
    if (status === 'ready') {
      await supabase.from('notifications').insert([{
        target_role: 'captain',
        title: 'Order Ready',
        message: `Order ${req.params.id} is ready to serve!`,
        type: 'success',
        related_order_id: req.params.id
      }]);
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/item-status
router.patch('/:id/item-status', authenticate, async (req, res) => {
  try {
    const { item_id, cook_status } = req.body;
    const { data, error } = await supabase
      .from('order_items')
      .update({ cook_status })
      .eq('id', item_id)
      .eq('order_id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    await supabase.from('order_items').delete().eq('order_id', req.params.id);
    const { error } = await supabase.from('orders').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
