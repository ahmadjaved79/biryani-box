import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

// POST /api/customers/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password required' });

    const { data: existing } = await supabase.from('customers').select('id').eq('email', email.toLowerCase()).single();
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const otp = generateOtp();
    const otp_hash = hashOtp(otp);
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const password_hash = await bcrypt.hash(password, 10);

    await supabase.from('otp_verifications').delete().eq('email', email.toLowerCase());
    await supabase.from('otp_verifications').insert([{
      email: email.toLowerCase(), phone, otp_hash, expires_at,
      temp_data: { name, email: email.toLowerCase(), password_hash, phone },
    }]);

    await transporter.sendMail({
      from: `"SpiceRoute" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your SpiceRoute OTP',
      html: `<p>Your OTP is <b>${otp}</b>. Valid for 5 minutes.</p>`,
    });

    res.json({ message: 'OTP sent to email' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/customers/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    const { data: record, error } = await supabase.from('otp_verifications')
      .select('*').eq('email', email.toLowerCase()).eq('verified', false).single();

    if (error || !record) return res.status(400).json({ error: 'OTP not found or already used' });
    if (new Date() > new Date(record.expires_at)) return res.status(400).json({ error: 'OTP expired' });
    if (hashOtp(otp) !== record.otp_hash) return res.status(400).json({ error: 'Invalid OTP' });

    const { name, email: em, password_hash, phone } = record.temp_data;
    const { data, error: insertErr } = await supabase.from('customers')
      .insert([{ name, email: em, password_hash, phone, is_email_verified: true }])
      .select('id, name, email, phone, loyalty_points, total_orders, created_at').single();

    if (insertErr) return res.status(400).json({ error: insertErr.message });

    await supabase.from('otp_verifications').update({ verified: true }).eq('id', record.id);

    const token = jwt.sign({ id: data.id, email: data.email, role: 'customer', name: data.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { ...data, role: 'customer' } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/customers/resend-otp
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const { data: record } = await supabase.from('otp_verifications').select('*').eq('email', email.toLowerCase()).eq('verified', false).single();
    if (!record) return res.status(400).json({ error: 'No pending OTP session' });

    const otp = generateOtp();
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await supabase.from('otp_verifications').update({ otp_hash: hashOtp(otp), expires_at }).eq('id', record.id);

    await transporter.sendMail({
      from: `"SpiceRoute" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your SpiceRoute OTP (Resent)',
      html: `<p>Your new OTP is <b>${otp}</b>. Valid for 5 minutes.</p>`,
    });

    res.json({ message: 'OTP resent' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/customers/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const { data: customer, error } = await supabase.from('customers').select('*').eq('email', email.toLowerCase()).eq('is_active', true).single();
    if (error || !customer) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, customer.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: customer.id, email: customer.email, role: 'customer', name: customer.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safe } = customer;
    res.json({ token, user: { ...safe, role: 'customer' } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/customers/high-value
router.get('/high-value', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('customers').select('id, name, email, phone, total_orders, total_spent, loyalty_points, created_at').gt('total_spent', 1000).order('total_spent', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/customers
router.get('/', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('customers').select('id, name, email, phone, total_orders, total_spent, loyalty_points, is_active, created_at').order('total_spent', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/customers/:id/orders
router.get('/:id/orders', async (req, res) => {
  try {
    const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('customer_email', req.params.id).order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/customers/:id/loyalty
router.get('/:id/loyalty', async (req, res) => {
  try {
    const { data, error } = await supabase.from('loyalty_transactions').select('*').eq('customer_id', req.params.id).order('created_at', { ascending: false }).limit(20);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/customers/:id/profile
router.get('/:id/profile', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { data: customer, error } = await supabase.from('customers').select('id, name, email, phone, address, total_orders, total_spent, loyalty_points, is_active, created_at').eq('id', req.params.id).single();
    if (error || !customer) return res.status(404).json({ error: 'Customer not found' });
    const { data: orders } = await supabase.from('orders').select('id, status, total, order_type, created_at, order_items(menu_item_name, quantity)').eq('customer_id', req.params.id).order('created_at', { ascending: false }).limit(10);
    res.json({ ...customer, recent_orders: orders || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;