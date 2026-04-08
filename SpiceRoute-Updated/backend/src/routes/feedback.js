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

router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('feedback').insert([req.body]).select().single();
    if (error) return res.status(400).json({ error: error.message });

    // Notify manager via in-app notification
    await supabase.from('notifications').insert([{
      target_role: 'manager',
      title: `New ${req.body.feedback_type || 'Feedback'} Received`,
      message: `From ${req.body.customer_name || 'Guest'} (${req.body.customer_email || 'no email'}, ${req.body.customer_phone || 'no phone'}): ${(req.body.subject || req.body.message || '').substring(0, 80)}`,
      type: req.body.feedback_type === 'complaint' ? 'urgent' : 'info',
    }]);

    // Send acknowledgement email to customer if email provided
    if (req.body.customer_email) {
      try {
        const transporter = createTransporter();
        await transporter.sendMail({
          from: `"Spice Route" <${process.env.EMAIL_USER}>`,
          to: req.body.customer_email,
          subject: `We received your feedback — SpiceRoute`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1a;color:#fff;border-radius:12px;overflow:hidden;">
              <div style="background:#e63946;padding:20px;text-align:center;">
                <h1 style="margin:0;font-size:22px;color:#fff;">SPICE ROUTE</h1>
              </div>
              <div style="padding:28px;">
                <h2 style="color:#e63946;margin-top:0;">Thank you for your feedback!</h2>
                <p>Hi <strong>${req.body.customer_name || 'Valued Customer'}</strong>,</p>
                <p style="color:#ccc;">We've received your ${req.body.feedback_type || 'feedback'} and our team will review it shortly.</p>
                ${req.body.message ? `<blockquote style="border-left:3px solid #e63946;padding-left:12px;color:#aaa;margin:16px 0;">${req.body.message}</blockquote>` : ''}
                <p style="color:#ccc;">We'll get back to you if a reply is needed.</p>
              </div>
              <div style="padding:14px;text-align:center;background:#111;color:#555;font-size:12px;">
                Spice Route Restaurant
              </div>
            </div>`,
        });
        console.log(`Feedback acknowledgement email sent to ${req.body.customer_email}`);
      } catch (mailErr) {
        console.error('Feedback ack mail error:', mailErr.message);
      }
    }

    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = supabase.from('feedback').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    if (type)   query = query.eq('feedback_type', type);
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

      // Send reply email to customer
      if (req.body.customer_email) {
        try {
          const { data: fb } = await supabase
            .from('feedback')
            .select('customer_name, subject, message')
            .eq('id', req.params.id)
            .single();

          const transporter = createTransporter();
          await transporter.sendMail({
            from: `"Spice Route" <${process.env.EMAIL_USER}>`,
            to: req.body.customer_email,
            subject: `Re: ${fb?.subject || 'Your Feedback'} — SpiceRoute`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1a;color:#fff;border-radius:12px;overflow:hidden;">
                <div style="background:#e63946;padding:20px;text-align:center;">
                  <h1 style="margin:0;font-size:22px;color:#fff;">SPICE ROUTE</h1>
                </div>
                <div style="padding:28px;">
                  <h2 style="color:#e63946;margin-top:0;">Reply to Your Feedback</h2>
                  <p>Hi <strong>${fb?.customer_name || 'Valued Customer'}</strong>,</p>
                  <p style="color:#aaa;font-size:13px;">Your feedback:</p>
                  <blockquote style="border-left:3px solid #444;padding-left:12px;color:#888;margin:8px 0 20px;">${fb?.message || ''}</blockquote>
                  <p style="color:#aaa;font-size:13px;">Our reply:</p>
                  <div style="background:#2a2a2a;border-radius:8px;padding:16px;color:#fff;">${req.body.staff_reply}</div>
                  <p style="margin-top:20px;color:#ccc;">Thank you for dining with us!</p>
                </div>
                <div style="padding:14px;text-align:center;background:#111;color:#555;font-size:12px;">
                  Spice Route Restaurant
                </div>
              </div>`,
          });
          console.log(`Feedback reply email sent to ${req.body.customer_email}`);
        } catch (mailErr) {
          console.error('Feedback reply mail error:', mailErr.message);
        }
      }
    }

    const { data, error } = await supabase.from('feedback').update(updates).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;