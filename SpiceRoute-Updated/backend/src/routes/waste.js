import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase.from('waste_log')
      .insert([{ ...req.body, reported_by: req.user.id }]).select().single();
    if (error) return res.status(400).json({ error: error.message });
    // Deduct from actual stock
    if (req.body.ingredient_id && req.body.quantity) {
      const { data: ing } = await supabase.from('ingredients').select('stock').eq('id', req.body.ingredient_id).single();
      if (ing) {
        const newStock = Math.max(0, parseFloat(ing.stock) - parseFloat(req.body.quantity));
        await supabase.from('ingredients').update({ stock: newStock }).eq('id', req.body.ingredient_id);
      }
    }
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', authenticate, authorize('owner', 'manager', 'cook'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('waste_log')
      .select('*, users(name), ingredients(name, unit)')
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
