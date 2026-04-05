import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, ChefHat, CheckCircle, Calendar, Clock,
  MapPin, DollarSign, Loader, Phone, Mail, FileText,
  AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { cateringAPI } from '../api/index.js';
import { useAuth } from '../context/useContextHooks';

const STATUS_CONFIG = {
  submitted:  { label: 'Submitted',  color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30' },
  reviewing:  { label: 'Reviewing',  color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30' },
  accepted:   { label: 'Accepted',   color: 'text-green-400',   bg: 'bg-green-500/10',   border: 'border-green-500/30' },
  rejected:   { label: 'Rejected',   color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30' },
  completed:  { label: 'Completed',  color: 'text-primary',     bg: 'bg-primary/10',     border: 'border-primary/30' },
  cancelled:  { label: 'Cancelled',  color: 'text-text-muted',  bg: 'bg-white/5',        border: 'border-white/10' },
};

const EMPTY_FORM = {
  customer_name: '', customer_phone: '', customer_email: '',
  event_date: '', event_type: '', guest_count: 50,
  location: '', menu_preferences: '', budget_range: '',
};

// ── My Requests (for logged-in customers) ─────────────────────────────────────
const MyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    cateringAPI.getMy()
      .then(r => setRequests(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader className="animate-spin text-primary" size={24}/></div>;
  if (!requests.length) return (
    <div className="text-center py-8 text-text-muted">
      <FileText size={36} className="mx-auto mb-3 opacity-30"/>
      <p className="text-sm">No catering requests yet. Submit one below!</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {requests.map(req => {
        const sc  = STATUS_CONFIG[req.status] || STATUS_CONFIG.submitted;
        const open = expanded === req.id;
        return (
          <div key={req.id} className={`border rounded-2xl overflow-hidden ${sc.border} ${sc.bg}`}>
            <button onClick={() => setExpanded(open ? null : req.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left">
              <div className="flex items-center gap-4 min-w-0">
                <div>
                  <p className="font-bold text-white text-sm">{req.event_type || 'Catering Event'}</p>
                  <p className="text-text-muted text-xs mt-0.5 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Calendar size={10}/>{req.event_date}</span>
                    <span className="flex items-center gap-1"><Users size={10}/>{req.guest_count} guests</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase ${sc.color} ${sc.border}`}>
                  {sc.label}
                </span>
                {open ? <ChevronUp size={14} className="text-text-muted"/> : <ChevronDown size={14} className="text-text-muted"/>}
              </div>
            </button>

            {open && (
              <div className="px-5 pb-5 border-t border-white/10 pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {req.location && <div><p className="text-text-muted">Location</p><p className="text-white font-bold">{req.location}</p></div>}
                  {req.budget_range && <div><p className="text-text-muted">Budget</p><p className="text-white font-bold">{req.budget_range}</p></div>}
                  {req.quoted_amount && <div><p className="text-text-muted">Quoted Amount</p><p className="text-primary font-bold text-base">${parseFloat(req.quoted_amount).toFixed(2)}</p></div>}
                  {req.menu_preferences && <div className="col-span-2"><p className="text-text-muted">Menu Preferences</p><p className="text-white">{req.menu_preferences}</p></div>}
                </div>
                {req.staff_notes && (
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Notes from our team</p>
                    <p className="text-white text-sm">{req.staff_notes}</p>
                  </div>
                )}
                {req.rejection_reason && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Reason</p>
                    <p className="text-red-300 text-sm">{req.rejection_reason}</p>
                  </div>
                )}
                {req.status === 'accepted' && (
                  <div className="flex items-center gap-2 text-green-400 text-xs font-bold bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
                    <CheckCircle size={14}/> Our team will contact you at {req.customer_phone} to finalize details.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Main Catering Page ─────────────────────────────────────────────────────────
const Catering = () => {
  const { user } = useAuth();
  const [form,      setForm]      = useState({ ...EMPTY_FORM, customer_name: user?.name || '', customer_email: user?.email || '', customer_phone: user?.phone || '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [refetch,   setRefetch]   = useState(0);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_phone || !form.event_date || !form.guest_count) {
      setError('Please fill all required fields.'); return;
    }
    setLoading(true); setError('');
    try {
      await cateringAPI.submit(form);
      setSubmitted(true);
      setRefetch(r => r + 1);
      setForm({ ...EMPTY_FORM, customer_name: user?.name || '', customer_email: user?.email || '', customer_phone: user?.phone || '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally { setLoading(false); }
  };

  const inp = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary transition-colors";

  return (
    <div className="min-h-screen bg-bg-main text-white pt-24 pb-20 relative overflow-hidden">
      <Navbar />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 blur-[200px] rounded-full translate-x-1/2 -translate-y-1/2"/>

      <div className="container relative z-10 px-6 max-w-5xl mx-auto mt-16 space-y-12">

        {/* Header */}
        <div className="text-center">
          <span className="text-primary font-black uppercase tracking-[0.4em] text-[12px] mb-3 block">Bulk Orders</span>
          <h1 className="text-5xl md:text-6xl font-black mb-4">
            Corporate <span className="text-primary">Catering</span>
          </h1>
          <p className="text-text-muted max-w-xl mx-auto">
            Events from 50 to 500+ guests · Custom menus · Full-service delivery
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Users,      label: '50–500+ Guests',   sub: 'Any event size' },
            { icon: ChefHat,    label: 'Custom Menu',       sub: 'Tailored to you' },
            { icon: Clock,      label: '24h Response',      sub: 'Quick turnaround' },
            { icon: DollarSign, label: 'Flexible Budgets',  sub: 'Packages available' },
          ].map((f, i) => (
            <div key={i} className="bg-white/3 border border-white/10 rounded-2xl p-4 text-center">
              <f.icon size={24} className="text-primary mx-auto mb-2"/>
              <p className="font-bold text-white text-sm">{f.label}</p>
              <p className="text-text-muted text-xs">{f.sub}</p>
            </div>
          ))}
        </div>

        {/* My Requests — only for logged-in customers */}
        {user?.role === 'customer' && (
          <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
            <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
              <FileText size={18} className="text-primary"/> My Catering Requests
            </h2>
            <MyRequests key={refetch}/>
          </div>
        )}

        {/* Book / Success */}
        {submitted ? (
          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
            className="text-center py-12 bg-green-500/10 border border-green-500/30 rounded-2xl">
            <CheckCircle size={56} className="text-green-400 mx-auto mb-4"/>
            <h2 className="text-2xl font-bold text-white mb-2">Request Submitted!</h2>
            <p className="text-text-muted mb-1">
              {form.customer_email
                ? `A confirmation has been sent to ${form.customer_email}`
                : 'We will contact you within 24 hours.'}
            </p>
            <p className="text-text-muted text-sm">Status: <span className="text-yellow-400 font-bold">Submitted — Awaiting Review</span></p>
            <button onClick={() => setSubmitted(false)}
              className="mt-6 px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-all text-sm">
              Submit Another Request
            </button>
          </motion.div>
        ) : (
          <div className="bg-white/3 border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <ChefHat className="text-primary" size={24}/> Request Catering
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-400 text-sm mb-5">
                <AlertCircle size={16}/> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Contact */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Full Name *</label>
                  <input name="customer_name" value={form.customer_name} onChange={handleChange} placeholder="Your name" className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Phone *</label>
                  <input name="customer_phone" value={form.customer_phone} onChange={handleChange} placeholder="+1 555-0100" className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Email (for confirmation)</label>
                  <input name="customer_email" type="email" value={form.customer_email} onChange={handleChange} placeholder="your@email.com" className={inp}/>
                </div>
              </div>

              {/* Event */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Event Date *</label>
                  <input name="event_date" type="date" value={form.event_date} onChange={handleChange} min={new Date().toISOString().split('T')[0]} className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Event Type</label>
                  <select name="event_type" value={form.event_type} onChange={handleChange} className={inp}>
                    <option value="">Select type</option>
                    {['Corporate Event','Wedding','Birthday Party','Anniversary','Conference','Graduation','Other'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Guest Count *</label>
                  <input name="guest_count" type="number" min="10" value={form.guest_count} onChange={handleChange} className={inp}/>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Event Location</label>
                  <input name="location" value={form.location} onChange={handleChange} placeholder="Venue name and address" className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Budget Range</label>
                  <select name="budget_range" value={form.budget_range} onChange={handleChange} className={inp}>
                    <option value="">Select budget</option>
                    {['$500–$1,000','$1,000–$2,500','$2,500–$5,000','$5,000–$10,000','$10,000+','Flexible'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Menu Preferences & Dietary Requirements</label>
                <textarea name="menu_preferences" value={form.menu_preferences} onChange={handleChange} rows={3}
                  placeholder="E.g. Biryani varieties, vegetarian options, halal, allergies..." className={`${inp} resize-none`}/>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-base disabled:opacity-60">
                {loading ? <Loader size={18} className="animate-spin"/> : <ChefHat size={18}/>}
                {loading ? 'Submitting...' : 'Submit Catering Request'}
              </button>

              {form.customer_email && (
                <p className="text-center text-xs text-text-muted flex items-center justify-center gap-1">
                  <Mail size={11}/> A confirmation email will be sent to {form.customer_email}
                </p>
              )}
            </form>
          </div>
        )}
      </div>
      <Footer/>
    </div>
  );
};

export default Catering;