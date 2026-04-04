import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/delivery/available
router.get('/available', authenticate, authorize('delivery', 'manager', 'owner'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, customer_name, customer_phone, customer_email,
        delivery_address, subtotal, tax, total, status,
        payment_status, payment_method, special_instructions,
        created_at, order_items(menu_item_name, quantity, unit_price)
      `)
      .eq('order_type', 'delivery')
      .is('delivery_agent_id', null)
      .in('status', ['ready', 'confirmed', 'preparing'])
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/delivery/my-orders
router.get('/my-orders', authenticate, authorize('delivery', 'manager', 'owner'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, customer_name, customer_phone, customer_email,
        delivery_address, subtotal, tax, total, status,
        payment_status, payment_method, special_instructions,
        created_at, updated_at,
        order_items(menu_item_name, quantity, unit_price)
      `)
      .eq('order_type', 'delivery')
      .eq('delivery_agent_id', req.user.id)
      .in('status', ['confirmed', 'preparing', 'ready', 'served'])
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/delivery/completed
router.get('/completed', authenticate, authorize('delivery', 'manager', 'owner'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, customer_name, customer_phone, customer_email,
        delivery_address, total, status, payment_method,
        created_at, updated_at,
        order_items(menu_item_name, quantity, unit_price)
      `)
      .eq('order_type', 'delivery')
      .eq('delivery_agent_id', req.user.id)
      .in('status', ['paid', 'cancelled'])
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/delivery/stats
router.get('/stats', authenticate, authorize('delivery'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('orders')
      .select('total, status')
      .eq('delivery_agent_id', req.user.id)
      .eq('order_type', 'delivery')
      .gte('created_at', `${today}T00:00:00`);

    const orders = data || [];
    res.json({
      total_today: orders.length,
      completed_today: orders.filter(o => o.status === 'paid').length,
      earnings_today: orders.filter(o => o.status === 'paid').reduce((s, o) => s + parseFloat(o.total || 0), 0).toFixed(2),
      active: orders.filter(o => ['confirmed','preparing','ready','served'].includes(o.status)).length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/delivery/:id/accept
router.patch('/:id/accept', authenticate, authorize('delivery'), async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('orders')
      .select('delivery_agent_id, order_type, status')
      .eq('id', req.params.id)
      .single();

    if (!existing) return res.status(404).json({ error: 'Order not found' });
    if (existing.order_type !== 'delivery') return res.status(400).json({ error: 'Not a delivery order' });
    if (existing.delivery_agent_id) return res.status(409).json({ error: 'Order already taken by another agent' });

    const { data, error } = await supabase
      .from('orders')
      .update({
        delivery_agent_id: req.user.id,
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await supabase.from('notifications').insert([{
      target_role: 'manager',
      title: 'Delivery Accepted',
      message: `${req.user.name} accepted order ${req.params.id}`,
      type: 'info',
      related_order_id: req.params.id
    }]);

    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/delivery/:id/picked-up
router.patch('/:id/picked-up', authenticate, authorize('delivery'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'served', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('delivery_agent_id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/delivery/:id/delivered
router.patch('/:id/delivered', authenticate, authorize('delivery'), async (req, res) => {
  try {
    const { payment_method = 'cash' } = req.body;

    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_status: 'paid',
        payment_method,
        served_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('delivery_agent_id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    if (data.customer_id) {
      const { data: cust } = await supabase
        .from('customers')
        .select('loyalty_points, total_spent')
        .eq('id', data.customer_id)
        .single();
      if (cust) {
        const pts = Math.floor(parseFloat(data.total) * 10);
        await supabase.from('customers').update({
          loyalty_points: (cust.loyalty_points || 0) + pts,
          total_spent: parseFloat(((cust.total_spent || 0) + parseFloat(data.total)).toFixed(2))
        }).eq('id', data.customer_id);
      }
    }

    await supabase.from('notifications').insert([{
      target_role: 'manager',
      title: 'Order Delivered',
      message: `Order ${req.params.id} delivered by ${req.user.name}`,
      type: 'success',
      related_order_id: req.params.id
    }]);

    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;