import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// POST /api/feedback — public, customers submit
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('feedback').insert([req.body]).select().single();
    if (error) return res.status(400).json({ error: error.message });
    // Notify manager/owner
    await supabase.from('notifications').insert([{
      target_role: 'manager',
      title: `New ${req.body.feedback_type || 'Feedback'} Received`,
      message: `From ${req.body.customer_name || 'Guest'}: ${(req.body.subject || req.body.message || '').substring(0, 80)}`,
      type: req.body.feedback_type === 'complaint' ? 'urgent' : 'info',
    }]);
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/feedback — staff view
router.get('/', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = supabase.from('feedback').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    if (type) query = query.eq('feedback_type', type);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/feedback/:id — staff reply/resolve
router.patch('/:id', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.body.staff_reply) {
      updates.replied_by = req.user.id;
      updates.replied_at = new Date().toISOString();
      updates.status = 'resolved';
    }
    const { data, error } = await supabase.from('feedback').update(updates).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
