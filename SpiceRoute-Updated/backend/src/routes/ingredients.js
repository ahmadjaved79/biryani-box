import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET all
router.get('/', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase.from('ingredients').select('*').order('name');
    if (error) return res.status(500).json({ error: error.message });
    const enriched = data.map(i => ({
      ...i,
      needs_reorder: parseFloat(i.stock) <= parseFloat(i.min_stock),
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST — create (owner/manager)
router.post('/', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { name, unit, stock, min_stock, unit_cost, reorder_lead_days } = req.body;
    if (!name || !unit) return res.status(400).json({ error: 'Name and unit required' });
    const { data, error } = await supabase
      .from('ingredients')
      .insert([{ name, unit, stock: stock || 0, min_stock: min_stock || 0, unit_cost: unit_cost || 0, reorder_lead_days: reorder_lead_days || 2 }])
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT — full edit (owner/manager)
router.put('/:id', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE (owner/manager)
router.delete('/:id', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { error } = await supabase.from('ingredients').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH restock (owner/manager)
router.patch('/:id/restock', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { amount } = req.body;
    const { data: current } = await supabase.from('ingredients').select('stock').eq('id', req.params.id).single();
    const newStock = parseFloat(current.stock) + parseFloat(amount);
    const { data, error } = await supabase
      .from('ingredients').update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH use — cook decreases stock + sends low stock alert
router.patch('/:id/use', authenticate, authorize('cook', 'owner', 'manager'), async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

    const { data: current } = await supabase.from('ingredients').select('*').eq('id', req.params.id).single();
    if (!current) return res.status(404).json({ error: 'Ingredient not found' });

    const newStock = Math.max(0, parseFloat(current.stock) - parseFloat(amount));
    const { data, error } = await supabase
      .from('ingredients').update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });

    // Fire low stock notification if just crossed the threshold
    if (newStock <= parseFloat(current.min_stock) && parseFloat(current.stock) > parseFloat(current.min_stock)) {
      await supabase.from('notifications').insert([
        { target_role: 'manager', title: '⚠️ Low Stock Alert', message: `${current.name} is low: ${newStock} ${current.unit} remaining (min: ${current.min_stock})`, type: 'warning' },
        { target_role: 'owner',   title: '⚠️ Low Stock Alert', message: `${current.name} is low: ${newStock} ${current.unit} remaining (min: ${current.min_stock})`, type: 'warning' },
      ]);
    }

    res.json({ ...data, needs_reorder: newStock <= parseFloat(current.min_stock) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;