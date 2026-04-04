import express from 'express';
import nodemailer from 'nodemailer';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('feedback').insert([req.body]).select().single();
    if (error) return res.status(400).json({ error: error.message });
    await supabase.from('notifications').insert([{
      target_role: 'manager',
      title: `New ${req.body.feedback_type || 'Feedback'} Received`,
      message: `From ${req.body.customer_name || 'Guest'} (${req.body.customer_email || 'no email'}, ${req.body.customer_phone || 'no phone'}): ${(req.body.subject || req.body.message || '').substring(0, 80)}`,
      type: req.body.feedback_type === 'complaint' ? 'urgent' : 'info',
    }]);
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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

router.patch('/:id', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.body.staff_reply) {
      updates.replied_by = req.user.id;
      updates.replied_at = new Date().toISOString();
      updates.status = 'resolved';

      // Send reply email if customer_email exists
      if (req.body.customer_email) {
        try {
          const { data: fb } = await supabase.from('feedback').select('customer_name, subject, message').eq('id', req.params.id).single();
          await transporter.sendMail({
            from: `"SpiceRoute" <${process.env.EMAIL_USER}>`,
            to: req.body.customer_email,
            subject: `Re: ${fb?.subject || 'Your Feedback'} — SpiceRoute`,
            html: `<p>Hi ${fb?.customer_name || 'Customer'},</p><p>Thank you for your feedback.</p><blockquote>${fb?.message}</blockquote><p><b>Our Reply:</b> ${req.body.staff_reply}</p><p>— SpiceRoute Team</p>`,
          });
        } catch (mailErr) { console.error('Mail error:', mailErr.message); }
      }
    }
    const { data, error } = await supabase.from('feedback').update(updates).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;