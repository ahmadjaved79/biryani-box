import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// POST /api/customers/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password required' });
    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('customers')
      .insert([{ name, email: email.toLowerCase(), password_hash, phone, address }])
      .select('id, name, email, phone, address, loyalty_points, total_orders, created_at')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    const token = jwt.sign({ id: data.id, email: data.email, role: 'customer', name: data.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { ...data, role: 'customer' } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/customers/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const { data: customer, error } = await supabase
      .from('customers').select('*').eq('email', email.toLowerCase()).eq('is_active', true).single();
    if (error || !customer) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, customer.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: customer.id, email: customer.email, role: 'customer', name: customer.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safe } = customer;
    res.json({ token, user: { ...safe, role: 'customer' } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/customers/high-value — owner/manager: customers with total_spent > 1000
router.get('/high-value', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email, phone, total_orders, total_spent, loyalty_points, created_at')
      .gt('total_spent', 1000)
      .order('total_spent', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/customers — owner/manager: list all customers
router.get('/', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email, phone, total_orders, total_spent, loyalty_points, is_active, created_at')
      .order('total_spent', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/customers/:id/orders — customer's own orders by email
router.get('/:id/orders', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('customer_email', req.params.id)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/customers/:id/loyalty — loyalty transactions
router.get('/:id/loyalty', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('customer_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/customers/:id/profile — owner/manager: full customer profile with orders
router.get('/:id/profile', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .select('id, name, email, phone, address, total_orders, total_spent, loyalty_points, is_active, created_at')
      .eq('id', req.params.id)
      .single();
    if (error || !customer) return res.status(404).json({ error: 'Customer not found' });

    const { data: orders } = await supabase
      .from('orders')
      .select('id, status, total, order_type, created_at, order_items(menu_item_name, quantity)')
      .eq('customer_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({ ...customer, recent_orders: orders || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
