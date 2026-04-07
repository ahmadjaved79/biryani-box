import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/* ─── helpers ─── */
function dateRange(filter, from, to) {
  const now = new Date();
  if (filter === 'today') {
    const d = now.toISOString().split('T')[0];
    return { from: `${d}T00:00:00`, to: `${d}T23:59:59` };
  }
  if (filter === 'week') {
    const f = new Date(now); f.setDate(f.getDate() - 6);
    return { from: f.toISOString(), to: now.toISOString() };
  }
  if (filter === 'month') {
    const f = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: f.toISOString(), to: now.toISOString() };
  }
  if (filter === 'custom' && from && to) {
    return { from: `${from}T00:00:00`, to: `${to}T23:59:59` };
  }
  // default: current month
  const f = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: f.toISOString(), to: now.toISOString() };
}

/* ─────────────────────────────────────────────
   GET /api/finance/summary?filter=today|week|month|custom&from=&to=
   Returns: revenue, expenses, profit, by-category, daily series
───────────────────────────────────────────── */
router.get('/summary', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { filter = 'month', from, to } = req.query;
    const range = dateRange(filter, from, to);

    const [ordersRes, expensesRes] = await Promise.all([
      supabase
        .from('orders')
        .select('total, created_at')
        .eq('payment_status', 'paid')
        .gte('created_at', range.from)
        .lte('created_at', range.to),
      supabase
        .from('expenses')
        .select('amount, category, date, description')
        .gte('date', range.from.split('T')[0])
        .lte('date', range.to.split('T')[0]),
    ]);

    const orders   = ordersRes.data   || [];
    const expenses = expensesRes.data || [];

    const totalRevenue  = orders.reduce((s, o) => s + parseFloat(o.total), 0);
    const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const netProfit     = totalRevenue - totalExpenses;

    // By category
    const byCategory = {};
    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + parseFloat(e.amount);
    });
    const categoryData = Object.entries(byCategory).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));

    // Daily series — build map for both revenue & expenses
    const dailyMap = {};
    orders.forEach(o => {
      const d = o.created_at.split('T')[0];
      if (!dailyMap[d]) dailyMap[d] = { date: d, revenue: 0, expenses: 0 };
      dailyMap[d].revenue += parseFloat(o.total);
    });
    expenses.forEach(e => {
      const d = e.date;
      if (!dailyMap[d]) dailyMap[d] = { date: d, revenue: 0, expenses: 0 };
      dailyMap[d].expenses += parseFloat(e.amount);
    });
    const dailySeries = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        date:     d.date,
        revenue:  parseFloat(d.revenue.toFixed(2)),
        expenses: parseFloat(d.expenses.toFixed(2)),
        profit:   parseFloat((d.revenue - d.expenses).toFixed(2)),
      }));

    // Break-even: fixed costs vs daily avg revenue
    const days        = dailySeries.length || 1;
    const avgDailyRev = totalRevenue / days;
    const breakEvenDays = avgDailyRev > 0 ? Math.ceil(totalExpenses / avgDailyRev) : null;

    res.json({
      totalRevenue:  parseFloat(totalRevenue.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      netProfit:     parseFloat(netProfit.toFixed(2)),
      isProfit:      netProfit >= 0,
      breakEvenDays,
      avgDailyRevenue: parseFloat(avgDailyRev.toFixed(2)),
      categoryData,
      dailySeries,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /api/finance/expenses
───────────────────────────────────────────── */
router.get('/expenses', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { filter = 'month', from, to, category } = req.query;
    const range = dateRange(filter, from, to);

    let query = supabase
      .from('expenses')
      .select('*')
      .gte('date', range.from.split('T')[0])
      .lte('date', range.to.split('T')[0])
      .order('date', { ascending: false });

    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   POST /api/finance/expenses  — single entry
───────────────────────────────────────────── */
router.post('/expenses', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { category, amount, date, description, vendor, file_url } = req.body;
    if (!category || !amount || !date) return res.status(400).json({ error: 'category, amount, date required' });

    const { data, error } = await supabase
      .from('expenses')
      .insert([{ category, amount: parseFloat(amount), date, description, vendor, file_url, created_by: req.user.id }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   POST /api/finance/expenses/bulk  — array
───────────────────────────────────────────── */
router.post('/expenses/bulk', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { rows } = req.body; // [{ category, amount, date, description, vendor }]
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'rows array required' });

    const inserts = rows.map(r => ({
      category:    r.category || 'miscellaneous',
      amount:      parseFloat(r.amount),
      date:        r.date || new Date().toISOString().split('T')[0],
      description: r.description || '',
      vendor:      r.vendor || '',
      created_by:  req.user.id,
    }));

    const { data, error } = await supabase.from('expenses').insert(inserts).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ inserted: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   DELETE /api/finance/expenses/:id
───────────────────────────────────────────── */
router.delete('/expenses/:id', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { error } = await supabase.from('expenses').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;