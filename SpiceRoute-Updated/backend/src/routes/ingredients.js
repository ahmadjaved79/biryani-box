import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/ingredients
router.get('/', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name');
    if (error) return res.status(500).json({ error: error.message });

    // Add reorder flag
    const enriched = data.map(i => ({
      ...i,
      needs_reorder: i.stock <= i.min_stock,
      days_remaining: i.stock > 0 ? Math.floor(i.stock / (i.min_stock / 3)) : 0
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ingredients/:id
router.put('/:id', authenticate, authorize('owner', 'manager', 'cook'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
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

// POST /api/ingredients - add new ingredient
router.post('/', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .insert([req.body])
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/ingredients/:id/restock
router.patch('/:id/restock', authenticate, authorize('owner', 'manager', 'cook'), async (req, res) => {
  try {
    const { amount } = req.body;
    const { data: current } = await supabase.from('ingredients').select('stock').eq('id', req.params.id).single();
    const newStock = parseFloat(current.stock) + parseFloat(amount);
    const { data, error } = await supabase
      .from('ingredients')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
