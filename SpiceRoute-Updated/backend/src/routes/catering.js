import express from 'express';
import nodemailer from 'nodemailer';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ── Email transporter ─────────────────────────────────────────────────────────
const createTransporter = () => nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_APP_PASSWORD,   // Gmail App Password
  },
});

const sendMail = async ({ to, subject, html }) => {
  if (!process.env.MAIL_USER || !process.env.MAIL_APP_PASSWORD) {
    console.warn('Mail not configured — skipping email to', to);
    return;
  }
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Spice Route Catering" <${process.env.MAIL_USER}>`,
    to, subject, html,
  });
};

// ── Email templates ───────────────────────────────────────────────────────────
const emailTemplates = {
  submitted: (req) => ({
    subject: 'Catering Request Received — Spice Route',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1a;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:#f59e0b;padding:24px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;">SPICE ROUTE</h1>
          <p style="margin:4px 0 0;color:#fff;opacity:0.9;font-size:13px;">Catering Division</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#f59e0b;margin-top:0;">Request Received! 🎉</h2>
          <p>Hi <strong>${req.customer_name}</strong>,</p>
          <p>We've received your catering request and our team will review it shortly.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr><td style="padding:8px;color:#aaa;width:40%;">Event</td><td style="padding:8px;color:#fff;font-weight:bold;">${req.event_type || 'Not specified'}</td></tr>
            <tr><td style="padding:8px;color:#aaa;">Date</td><td style="padding:8px;color:#fff;font-weight:bold;">${req.event_date}</td></tr>
            <tr><td style="padding:8px;color:#aaa;">Guests</td><td style="padding:8px;color:#fff;font-weight:bold;">${req.guest_count}</td></tr>
            <tr><td style="padding:8px;color:#aaa;">Location</td><td style="padding:8px;color:#fff;font-weight:bold;">${req.location || 'TBD'}</td></tr>
            <tr><td style="padding:8px;color:#aaa;">Budget</td><td style="padding:8px;color:#fff;font-weight:bold;">${req.budget_range || 'Not specified'}</td></tr>
          </table>
          <p style="color:#aaa;font-size:13px;">Status: <span style="color:#f59e0b;font-weight:bold;">Submitted — Awaiting Review</span></p>
          <p>We'll contact you within 24 hours to discuss your event details.</p>
        </div>
        <div style="padding:16px;text-align:center;background:#111;color:#666;font-size:12px;">
          Spice Route Restaurant · catering@spiceroute.com
        </div>
      </div>`,
  }),

  accepted: (req) => ({
    subject: 'Your Catering Request is Accepted! — Spice Route',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1a;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:#22c55e;padding:24px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;">✅ Request Accepted!</h1>
        </div>
        <div style="padding:32px;">
          <p>Hi <strong>${req.customer_name}</strong>,</p>
          <p>Great news! Your catering request has been <strong style="color:#22c55e;">accepted</strong>.</p>
          ${req.quoted_amount ? `<div style="background:#f59e0b20;border:1px solid #f59e0b50;border-radius:8px;padding:16px;margin:16px 0;text-align:center;"><p style="margin:0;color:#aaa;font-size:13px;">Quoted Amount</p><p style="margin:4px 0 0;font-size:28px;font-weight:bold;color:#f59e0b;">$${parseFloat(req.quoted_amount).toFixed(2)}</p></div>` : ''}
          ${req.staff_notes ? `<div style="background:#ffffff10;border-radius:8px;padding:16px;margin:16px 0;"><p style="margin:0;color:#aaa;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Notes from our team</p><p style="margin:8px 0 0;color:#fff;">${req.staff_notes}</p></div>` : ''}
          <p>Our catering team will contact you at <strong>${req.customer_phone}</strong> to finalize the details.</p>
        </div>
        <div style="padding:16px;text-align:center;background:#111;color:#666;font-size:12px;">Spice Route Restaurant</div>
      </div>`,
  }),

  rejected: (req) => ({
    subject: 'Update on Your Catering Request — Spice Route',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1a;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:#ef4444;padding:24px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;">Catering Update</h1>
        </div>
        <div style="padding:32px;">
          <p>Hi <strong>${req.customer_name}</strong>,</p>
          <p>We're sorry, but we're unable to accommodate your catering request at this time.</p>
          ${req.rejection_reason ? `<div style="background:#ffffff10;border-radius:8px;padding:16px;margin:16px 0;"><p style="margin:0;color:#aaa;font-size:12px;">Reason</p><p style="margin:8px 0 0;">${req.rejection_reason}</p></div>` : ''}
          <p>We'd love to help you find an alternative date or arrangement. Please contact us at <strong>catering@spiceroute.com</strong>.</p>
        </div>
        <div style="padding:16px;text-align:center;background:#111;color:#666;font-size:12px;">Spice Route Restaurant</div>
      </div>`,
  }),
};

// ── POST /api/catering — customer submits request ─────────────────────────────
router.post('/', async (req, res) => {
  try {
    const body = { ...req.body, status: 'submitted' };

    // Link to customer account if JWT provided
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { data: decoded } = await supabase.auth.getUser(authHeader.split(' ')[1]);
        if (decoded?.user) body.customer_id = decoded.user.id;
      } catch {}
      // Also try our own JWT
      try {
        const jwt = await import('jsonwebtoken');
        const payload = jwt.default.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        if (payload.role === 'customer') body.customer_id = payload.id;
      } catch {}
    }

    const { data, error } = await supabase
      .from('catering_requests').insert([body]).select().single();
    if (error) return res.status(400).json({ error: error.message });

    // Send confirmation email
    if (data.customer_email) {
      const tmpl = emailTemplates.submitted(data);
      sendMail({ to: data.customer_email, ...tmpl }).catch(e => console.error('Mail error:', e));
    }

    // Notify manager/owner
    await supabase.from('notifications').insert([{
      target_role: 'manager',
      title: '📋 New Catering Request',
      message: `${data.customer_name} — ${data.event_type || 'Event'} · ${data.guest_count} guests · ${data.event_date}`,
      type: 'info',
    }]);

    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/catering — staff view all ───────────────────────────────────────
router.get('/', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase.from('catering_requests').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/catering/my — customer's own requests ───────────────────────────
router.get('/my', authenticate, async (req, res) => {
  try {
    let query;
    if (req.user.role === 'customer') {
      // by customer_id first, fallback by email
      const { data: byId } = await supabase
        .from('catering_requests').select('*').eq('customer_id', req.user.id).order('created_at', { ascending: false });
      const { data: byEmail } = await supabase
        .from('catering_requests').select('*').eq('customer_email', req.user.email).order('created_at', { ascending: false });
      // merge and deduplicate
      const all = [...(byId || []), ...(byEmail || [])];
      const seen = new Set();
      const unique = all.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
      return res.json(unique);
    }
    return res.status(403).json({ error: 'Customers only' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/catering/:id — staff update status ────────────────────────────
router.patch('/:id', authenticate, authorize('owner', 'manager'), async (req, res) => {
  try {
    const { status, quoted_amount, staff_notes, rejection_reason } = req.body;

    const updateData = {
      updated_at: new Date().toISOString(),
    };
    if (status)            updateData.status            = status;
    if (quoted_amount)     updateData.quoted_amount     = quoted_amount;
    if (staff_notes)       updateData.staff_notes       = staff_notes;
    if (rejection_reason)  updateData.rejection_reason  = rejection_reason;

    const { data, error } = await supabase
      .from('catering_requests').update(updateData).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });

    // Send email based on new status
    if (data.customer_email && (status === 'accepted' || status === 'rejected')) {
      const tmpl = emailTemplates[status](data);
      sendMail({ to: data.customer_email, ...tmpl }).catch(e => console.error('Mail error:', e));
    }

    // Notify customer if linked
    if (data.customer_id && status) {
      const msgMap = {
        accepted: '🎉 Your catering request has been accepted! We\'ll contact you soon.',
        rejected: 'Update on your catering request — please check your email.',
        reviewing: 'Your catering request is now under review.',
      };
      if (msgMap[status]) {
        await supabase.from('notifications').insert([{
          target_user_id: data.customer_id,
          title: 'Catering Request Update',
          message: msgMap[status],
          type: status === 'accepted' ? 'success' : status === 'rejected' ? 'warning' : 'info',
        }]);
      }
    }

    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;