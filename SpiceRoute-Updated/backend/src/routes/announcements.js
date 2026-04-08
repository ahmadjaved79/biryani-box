import express from 'express';
import nodemailer from 'nodemailer';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Create transporter lazily on each send so env vars are always fresh
const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
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

    // Send email to all registered customers if opted
    if (send_email && ['all', 'customer'].includes(req.body.target)) {
      // Removed is_email_verified filter — column does not exist in schema
      const { data: customers } = await supabase
        .from('customers')
        .select('email, name')
        .eq('is_active', true)
        .not('email', 'is', null);

      if (customers && customers.length > 0) {
        const emails = customers.map(c => c.email).filter(Boolean);
        if (emails.length > 0) {
          try {
            const transporter = createTransporter();
            await transporter.sendMail({
              from: `"Spice Route" <${process.env.EMAIL_USER}>`,
              bcc: emails,
              subject: `${req.body.title} — SpiceRoute`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1a;color:#fff;border-radius:12px;overflow:hidden;">
                  <div style="background:#e63946;padding:20px;text-align:center;">
                    <h1 style="margin:0;font-size:22px;color:#fff;">SPICE ROUTE</h1>
                  </div>
                  <div style="padding:28px;">
                    <h2 style="color:#e63946;margin-top:0;">${req.body.title}</h2>
                    <p style="color:#ccc;line-height:1.6;">${req.body.message}</p>
                  </div>
                  <div style="padding:14px;text-align:center;background:#111;color:#555;font-size:12px;">
                    You received this because you have an account with SpiceRoute.
                  </div>
                </div>`,
            });
            console.log(`Announcement email sent to ${emails.length} customers`);
          } catch (mailErr) {
            console.error('Announcement mail error:', mailErr.message);
            // Don't fail the request — announcement is already saved
          }
        }
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