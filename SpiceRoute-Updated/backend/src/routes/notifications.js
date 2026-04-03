import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`target_role.eq.${req.user.role},target_user_id.eq.${req.user.id},target_role.is.null`)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications').update({ is_read: true }).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await supabase.from('notifications')
      .update({ is_read: true })
      .or(`target_role.eq.${req.user.role},target_user_id.eq.${req.user.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
