import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// POST /api/payments — record a payment
router.post('/', authenticate, async (req, res) => {
  try {
    const { order_id, amount, method } = req.body;
    const { data, error } = await supabase.from('payments')
      .insert([{ order_id, amount, method, status: 'completed', processed_by: req.user.id }])
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    // Mark order as paid
    await supabase.from('orders').update({ payment_status: 'paid', payment_method: method, status: 'paid' }).eq('id', order_id);
    // Award loyalty points if customer_email exists
    const { data: order } = await supabase.from('orders').select('customer_email, total').eq('id', order_id).single();
    if (order?.customer_email) {
      const points = Math.floor(parseFloat(amount) * 10); // 10 pts per $1
      const { data: customer } = await supabase.from('customers').select('id, loyalty_points').eq('email', order.customer_email).single();
      if (customer) {
        const newBalance = (customer.loyalty_points || 0) + points;
        await supabase.from('customers').update({ loyalty_points: newBalance, total_orders: supabase.rpc('increment', { x: 1 }), total_spent: supabase.rpc('increment', { x: amount }) }).eq('id', customer.id);
        await supabase.from('loyalty_transactions').insert([{ customer_id: customer.id, order_id, points_earned: points, balance_after: newBalance, description: `Order ${order_id} payment` }]);
      }
    }
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/payments?order_id=...
router.get('/', authenticate, async (req, res) => {
  try {
    const { order_id } = req.query;
    let query = supabase.from('payments').select('*').order('created_at', { ascending: false });
    if (order_id) query = query.eq('order_id', order_id);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
