import express from 'express';
import nodemailer from 'nodemailer';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

router.get('/', async (req, res) => {
  try {
    const { target } = req.query;
    let query = supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (target) query = query.or(`target.eq.${target},target.eq.all`);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { send_email } = req.body;
    const insertData = { ...req.body, created_by: req.user.id };
    delete insertData.send_email;

    const { data, error } = await supabase.from('announcements').insert([insertData]).select().single();
    if (error) return res.status(400).json({ error: error.message });

    // Send email to customers if opted
    if (send_email && ['all', 'customer'].includes(req.body.target)) {
      const { data: customers } = await supabase.from('customers').select('email, name').eq('is_active', true).eq('is_email_verified', true);
      if (customers && customers.length > 0) {
        const emails = customers.map(c => c.email);
        try {
          await transporter.sendMail({
            from: `"SpiceRoute" <${process.env.EMAIL_USER}>`,
            bcc: emails,
            subject: `${req.body.title} — SpiceRoute`,
            html: `<h2>${req.body.title}</h2><p>${req.body.message}</p><hr/><p style="font-size:12px;color:#999">You received this because you have an account with SpiceRoute.</p>`,
          });
        } catch (mailErr) { console.error('Announcement mail error:', mailErr.message); }
      }
    }

    res.status(201).json({ ...data, email_sent: !!send_email });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('announcements').update(req.body).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorize('owner'), async (req, res) => {
  try {
    await supabase.from('announcements').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;