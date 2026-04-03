import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/analytics/dashboard - owner/manager summary
router.get('/dashboard', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);

    const [todayOrders, monthOrders, allIngredients, pendingReservations] = await Promise.all([
      supabase.from('orders').select('total, status, order_type').gte('created_at', `${today}T00:00:00`),
      supabase.from('orders').select('total, status').gte('created_at', `${thisMonth}-01T00:00:00`).eq('payment_status', 'paid'),
      supabase.from('ingredients').select('name, stock, min_stock'),
      supabase.from('reservations').select('id').eq('reservation_date', today).eq('status', 'confirmed')
    ]);

    const todayData = todayOrders.data || [];
    const monthData = monthOrders.data || [];
    const ingredients = allIngredients.data || [];

    const todayRevenue = todayData.filter(o => o.status === 'paid').reduce((s, o) => s + parseFloat(o.total), 0);
    const monthRevenue = monthData.reduce((s, o) => s + parseFloat(o.total), 0);
    const lowStockCount = ingredients.filter(i => i.stock <= i.min_stock).length;

    res.json({
      today: {
        revenue: parseFloat(todayRevenue.toFixed(2)),
        orders: todayData.length,
        pending: todayData.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length,
        dineIn: todayData.filter(o => o.order_type === 'dine-in').length,
        delivery: todayData.filter(o => o.order_type === 'delivery').length
      },
      month: {
        revenue: parseFloat(monthRevenue.toFixed(2)),
        orders: monthData.length
      },
      inventory: { lowStockCount, totalItems: ingredients.length },
      reservations: { todayCount: pendingReservations.data?.length || 0 }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/revenue?range=7|30|90
router.get('/revenue', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const days = parseInt(req.query.range) || 7;
    const from = new Date();
    from.setDate(from.getDate() - days);

    const { data, error } = await supabase
      .from('orders')
      .select('total, status, created_at, order_type')
      .gte('created_at', from.toISOString())
      .eq('payment_status', 'paid')
      .order('created_at');

    if (error) return res.status(500).json({ error: error.message });

    // Group by date
    const byDate = {};
    data.forEach(o => {
      const date = o.created_at.split('T')[0];
      if (!byDate[date]) byDate[date] = { date, revenue: 0, orders: 0 };
      byDate[date].revenue += parseFloat(o.total);
      byDate[date].orders += 1;
    });

    res.json(Object.values(byDate).map(d => ({ ...d, revenue: parseFloat(d.revenue.toFixed(2)) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/top-items
router.get('/top-items', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('order_items')
      .select('menu_item_name, quantity')
      .limit(1000);
    if (error) return res.status(500).json({ error: error.message });

    const counts = {};
    data.forEach(i => {
      counts[i.menu_item_name] = (counts[i.menu_item_name] || 0) + i.quantity;
    });
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
