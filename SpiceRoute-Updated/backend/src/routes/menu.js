import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/menu - public endpoint
router.get('/', async (req, res) => {
  try {
    const { category, available } = req.query;
    let query = supabase.from('menu_items').select('*').order('category').order('name');
    if (category) query = query.eq('category', category);
    if (available === 'true') query = query.eq('is_available', true);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/menu/categories
router.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/menu - add menu item
router.post('/', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .insert([req.body])
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/menu/:id - update menu item
router.put('/:id', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/menu/:id/availability
router.patch('/:id/availability', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { is_available } = req.body;
    const { data, error } = await supabase
      .from('menu_items')
      .update({ is_available, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/menu/:id
router.delete('/:id', authenticate, authorize('owner'), async (req, res) => {
  try {
    await supabase.from('menu_recipes').delete().eq('menu_item_id', req.params.id);
    const { error } = await supabase.from('menu_items').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
