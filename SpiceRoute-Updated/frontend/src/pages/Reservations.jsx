import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, Clock, Users, CheckCircle, Phone, Mail, Loader, Star } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { reservationsAPI } from '../api/index.js';

const Reservations = () => {
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    party_size: 2, reservation_date: '', reservation_time: '',
    special_requests: '', occasion: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_phone || !form.reservation_date || !form.reservation_time) {
      setError('Please fill all required fields.'); return;
    }
    setLoading(true); setError('');
    try {
      await reservationsAPI.create(form);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg-main text-white pt-24 pb-20 relative overflow-hidden">
      <Navbar />
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-primary/5 blur-[200px] rounded-full -translate-x-1/2 -translate-y-1/2" />

      <div className="container relative z-10 px-6 max-w-5xl mx-auto mt-16">
        <div className="text-center mb-14">
          <span className="text-primary font-black uppercase tracking-[0.4em] text-xs mb-4 block">Dining Experience</span>
          <h1 className="text-5xl md:text-6xl font-black mb-4">
            Reserve Your <span className="text-primary">Table</span>
          </h1>
          <p className="text-text-muted max-w-xl mx-auto">Book your perfect dining experience at Spice Route</p>
        </div>

        {submitted ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto text-center bg-green-500/10 border border-green-500/30 rounded-2xl p-12">
            <CheckCircle size={64} className="text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Reservation Confirmed!</h2>
            <p className="text-text-muted mb-2">We've received your booking, <strong className="text-white">{form.customer_name}</strong>.</p>
            <p className="text-text-muted text-sm">📅 {form.reservation_date} at {form.reservation_time} · {form.party_size} guests</p>
            <p className="text-text-muted text-sm mt-1">We'll confirm via {form.customer_phone}</p>
            <button onClick={() => { setSubmitted(false); setForm({ customer_name:'', customer_phone:'', customer_email:'', party_size:2, reservation_date:'', reservation_time:'', special_requests:'', occasion:'' }); }}
              className="mt-8 px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-all">
              Make Another Reservation
            </button>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-10">
            {/* Form */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 bg-secondary/20 border border-white/10 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-6">Booking Details</h2>
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 mb-6 text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Full Name *</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                      <input name="customer_name" value={form.customer_name} onChange={handleChange} placeholder="John Smith"
                        className="w-full bg-bg-main border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-primary outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Phone Number *</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                      <input name="customer_phone" value={form.customer_phone} onChange={handleChange} placeholder="+1 (555) 000-0000"
                        className="w-full bg-bg-main border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-primary outline-none" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                    <input name="customer_email" value={form.customer_email} onChange={handleChange} placeholder="john@email.com" type="email"
                      className="w-full bg-bg-main border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-primary outline-none" />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-5">
                  <div>
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Date *</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                      <input name="reservation_date" value={form.reservation_date} onChange={handleChange} type="date"
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full bg-bg-main border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-primary outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Time *</label>
                    <div className="relative">
                      <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                      <input name="reservation_time" value={form.reservation_time} onChange={handleChange} type="time"
                        className="w-full bg-bg-main border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-primary outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Guests *</label>
                    <div className="relative">
                      <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                      <select name="party_size" value={form.party_size} onChange={handleChange}
                        className="w-full bg-bg-main border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-primary outline-none">
                        {[1,2,3,4,5,6,7,8,10,12,15,20].map(n => <option key={n} value={n}>{n} {n===1?'Guest':'Guests'}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Occasion</label>
                  <select name="occasion" value={form.occasion} onChange={handleChange}
                    className="w-full bg-bg-main border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary outline-none">
                    <option value="">Select an occasion (optional)</option>
                    {['Birthday','Anniversary','Business Dinner','Date Night','Family Gathering','Graduation','Other'].map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Special Requests</label>
                  <textarea name="special_requests" value={form.special_requests} onChange={handleChange} rows={3}
                    placeholder="Dietary restrictions, seating preferences, allergies..."
                    className="w-full bg-bg-main border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary outline-none resize-none" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 text-base">
                  {loading ? <Loader size={20} className="animate-spin" /> : <Calendar size={20} />}
                  {loading ? 'Booking...' : 'Reserve Table'}
                </button>
              </form>
            </motion.div>

            {/* Info sidebar */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              {[
                { icon: Clock, title: 'Hours', lines: ['Mon–Thu: 11am–10pm EST','Fri–Sat: 11am–11pm EST','Sun: 12pm–9pm EST'] },
                { icon: Phone, title: 'Contact', lines: ['+1 (555) 012-3456','reservations@spiceroute.com'] },
                { icon: Users, title: 'Large Groups', lines: ['For 15+ guests call us','Private dining available','Catering packages offered'] },
                { icon: Star, title: 'Why Spice Route', lines: ['Authentic Indian flavors','Premium Halal ingredients','Est. 2023 · 4.9★ on Google'] },
              ].map(card => (
                <div key={card.title} className="bg-secondary/20 border border-white/10 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <card.icon size={20} className="text-primary" />
                    <h4 className="font-bold text-white">{card.title}</h4>
                  </div>
                  {card.lines.map(l => <p key={l} className="text-text-muted text-sm">{l}</p>)}
                </div>
              ))}
            </motion.div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Reservations;
