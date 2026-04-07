import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET all tables
router.get('/', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase.from('restaurant_tables').select('*').order('table_number');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST — create new table (owner/manager only)
router.post('/', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { table_number, capacity, section } = req.body;
    if (!table_number) return res.status(400).json({ error: 'Table number required' });
    const { data, error } = await supabase
      .from('restaurant_tables')
      .insert([{ table_number, capacity: capacity || 4, section: section || 'main', status: 'available' }])
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH status only
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['available', 'occupied', 'reserved', 'cleaning'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const { data, error } = await supabase
      .from('restaurant_tables').update({ status }).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH full edit (owner/manager only)
router.patch('/:id', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { table_number, capacity, section, status } = req.body;
    const { data, error } = await supabase
      .from('restaurant_tables')
      .update({ table_number, capacity, section, status })
      .eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE (owner/manager only)
router.delete('/:id', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { error } = await supabase.from('restaurant_tables').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;