import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// POST /api/shifts/clock-in
router.post('/clock-in', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('shift_logs').insert([{ user_id: req.user.id }]).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/shifts/:id/clock-out
router.patch('/:id/clock-out', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const { data: shift } = await supabase.from('shift_logs').select('clock_in').eq('id', req.params.id).single();
    const duration = shift ? Math.floor((now - new Date(shift.clock_in)) / 60000) : 0;
    const { data, error } = await supabase
      .from('shift_logs').update({ clock_out: now.toISOString(), duration_minutes: duration, notes: req.body.notes })
      .eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/shifts — manager/owner view all
router.get('/', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { date } = req.query;
    let query = supabase.from('shift_logs')
      .select('*, users(name, role, email)')
      .order('clock_in', { ascending: false }).limit(100);
    if (date) query = query.gte('clock_in', `${date}T00:00:00`).lte('clock_in', `${date}T23:59:59`);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/shifts/my — own shifts
router.get('/my', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('shift_logs').select('*').eq('user_id', req.user.id)
      .order('clock_in', { ascending: false }).limit(30);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
