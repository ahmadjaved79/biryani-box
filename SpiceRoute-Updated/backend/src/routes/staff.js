import express from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/staff
router.get('/', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, avatar, is_active, tables_assigned, created_at')
      .neq('role', 'customer')
      .order('role');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/staff — create new staff member
// Owner: can create manager, captain, cook, delivery
// Manager: can create captain, cook only
router.post('/', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    const isOwner = req.user.role === 'owner';
    const isManager = req.user.role === 'manager';

    const ownerAllowed = ['manager', 'captain', 'cook', 'delivery'];
    const managerAllowed = ['captain', 'cook'];

    if (isOwner && !ownerAllowed.includes(role)) {
      return res.status(403).json({ error: 'Invalid role' });
    }
    if (isManager && !managerAllowed.includes(role)) {
      return res.status(403).json({ error: 'Managers can only create captains and cooks' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('users')
      .insert([{ name, email: email.toLowerCase(), password_hash, role, phone }])
      .select('id, name, email, role, phone, is_active, created_at')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/staff/:id — edit staff member
// Owner: can edit anyone except owner
// Manager: can edit captain and cook only
router.patch('/:id', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    // Fetch the target user's current role
    const { data: target, error: fetchErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !target) return res.status(404).json({ error: 'Staff member not found' });

    const isOwner = req.user.role === 'owner';
    const isManager = req.user.role === 'manager';
    const managerAllowed = ['captain', 'cook'];

    if (isManager && !managerAllowed.includes(target.role)) {
      return res.status(403).json({ error: 'Managers can only edit captains and cooks' });
    }
    if (!isOwner && req.body.role && !managerAllowed.includes(req.body.role)) {
      return res.status(403).json({ error: 'Managers can only assign captain or cook roles' });
    }

    const { password, ...rest } = req.body;
    // Managers cannot change roles to manager/owner
    const updateData = { ...rest, updated_at: new Date().toISOString() };
    if (isManager) delete updateData.role; // managers cannot change role
    if (password) updateData.password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.params.id)
      .select('id, name, email, role, phone, is_active')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/staff/:id — owner only
router.delete('/:id', authenticate, authorize('owner'), async (req, res) => {
  try {
    const { data: target } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.params.id)
      .single();

    if (!target) return res.status(404).json({ error: 'Staff member not found' });
    if (target.role === 'owner') return res.status(403).json({ error: 'Cannot delete owner account' });

    const { error } = await supabase.from('users').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/staff/:id/toggle-active — owner only
router.patch('/:id/toggle-active', authenticate, authorize('owner'), async (req, res) => {
  try {
    const { data: current } = await supabase.from('users').select('is_active').eq('id', req.params.id).single();
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: !current.is_active })
      .eq('id', req.params.id)
      .select('id, name, is_active')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
