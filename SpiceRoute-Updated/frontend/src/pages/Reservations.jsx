import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, User, Clock, Users, CheckCircle, Phone, Mail,
  Loader, Star, LayoutGrid, RefreshCw, AlertCircle, XCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { reservationsAPI, tablesAPI } from '../api/index.js';

const Reservations = () => {
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    party_size: 2, reservation_date: '', reservation_time: '',
    special_requests: '', occasion: '', table_ids: [],
  });
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Available tables
  const [availableTables, setAvailableTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(true);

  // My reservations (status tracking)
  const [myReservations, setMyReservations] = useState([]);
  const [myResLoading, setMyResLoading] = useState(false);

  useEffect(() => {
    tablesAPI.getAll()
      .then(r => {
        const avail = (r.data || []).filter(t => t.status === 'available');
        setAvailableTables(avail);
        setTablesLoading(false);
      })
      .catch(() => setTablesLoading(false));
  }, []);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const toggleTable = (tableId) => {
    setForm(p => ({
      ...p,
      table_ids: p.table_ids.includes(tableId)
        ? p.table_ids.filter(id => id !== tableId)
        : [...p.table_ids, tableId],
    }));
  };

  const fetchMyReservations = async (email) => {
    if (!email) return;
    setMyResLoading(true);
    try {
      const res = await reservationsAPI.getAll({ email });
      setMyReservations(res.data || []);
    } catch { }
    setMyResLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_phone || !form.reservation_date || !form.reservation_time) {
      setError('Please fill all required fields.'); return;
    }
    setLoading(true); setError('');
    try {
      const payload = {
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email,
        party_size: form.party_size,
        reservation_date: form.reservation_date,
        reservation_time: form.reservation_time,
        special_requests: form.special_requests,
        occasion: form.occasion,
        // Store first selected table id (schema uses single table_id)
        table_id: form.table_ids.length > 0 ? form.table_ids[0] : null,
        // Store all selected table numbers as string in notes
        selected_tables: form.table_ids
          .map(id => availableTables.find(t => t.id === id)?.table_number)
          .filter(Boolean)
          .join(', '),
      };
      const res = await reservationsAPI.create(payload);
      setSubmittedData(res.data);
      setSubmitted(true);
      // Fetch status if email given
      if (form.customer_email) await fetchMyReservations(form.customer_email);
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed. Please try again.');
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    setSubmitted(false);
    setSubmittedData(null);
    setForm({ customer_name:'', customer_phone:'', customer_email:'', party_size:2, reservation_date:'', reservation_time:'', special_requests:'', occasion:'', table_ids:[] });
  };

  // Status config
  const statusConfig = {
    pending:   { color:'text-amber-400',   bg:'bg-amber-500/10',   border:'border-amber-500/30',  icon:Clock,        label:'Pending Review', desc:'Our team is reviewing your reservation.' },
    confirmed: { color:'text-emerald-400', bg:'bg-emerald-500/10', border:'border-emerald-500/30', icon:CheckCircle,  label:'Confirmed ✓',    desc:'Your reservation is confirmed! We look forward to seeing you.' },
    seated:    { color:'text-blue-400',    bg:'bg-blue-500/10',    border:'border-blue-500/30',    icon:Users,        label:'Seated',         desc:'You are currently seated.' },
    completed: { color:'text-purple-400',  bg:'bg-purple-500/10',  border:'border-purple-500/30',  icon:Star,         label:'Completed',      desc:'Thank you for dining with us!' },
    cancelled: { color:'text-red-400',     bg:'bg-red-500/10',     border:'border-red-500/30',     icon:XCircle,      label:'Cancelled',      desc:'This reservation was cancelled.' },
    'no-show': { color:'text-red-400',     bg:'bg-red-500/10',     border:'border-red-500/30',     icon:AlertCircle,  label:'No Show',        desc:'This reservation was marked as no-show.' },
  };

  const getTableLabel = () => {
    if (form.table_ids.length === 0) return 'No table selected';
    return form.table_ids.map(id => {
      const t = availableTables.find(tbl => tbl.id === id);
      return t ? `T${t.table_number}` : id;
    }).join(', ');
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

        <AnimatePresence mode="wait">
          {submitted ? (
            /* ── Success + Status View ── */
            <motion.div key="success" initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
              className="space-y-6 max-w-2xl mx-auto">

              {/* Confirmation card */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center">
                <CheckCircle size={56} className="text-emerald-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Reservation Submitted!</h2>
                <p className="text-text-muted mb-1">We've received your booking, <strong className="text-white">{form.customer_name}</strong>.</p>
                <p className="text-text-muted text-sm">📅 {form.reservation_date} at {form.reservation_time} · {form.party_size} guests</p>
                {form.table_ids.length > 0 && (
                  <p className="text-primary text-sm mt-1 font-bold">🪑 Tables: {getTableLabel()}</p>
                )}
                {form.occasion && <p className="text-text-muted text-sm mt-1">🎉 {form.occasion}</p>}
              </div>

              {/* Live status tracker */}
              {submittedData && (
                <div className="bg-secondary/20 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-white">Reservation Status</h3>
                    <button onClick={() => fetchMyReservations(form.customer_email)}
                      disabled={myResLoading}
                      className="flex items-center gap-2 text-xs text-primary hover:underline font-bold">
                      <RefreshCw size={13} className={myResLoading ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>

                  {/* Current reservation status */}
                  {(() => {
                    const current = myReservations.find(r => r.id === submittedData.id) || submittedData;
                    const sc = statusConfig[current.status] || statusConfig.pending;
                    const StatusIcon = sc.icon;
                    return (
                      <div className={`${sc.bg} border ${sc.border} rounded-xl p-5`}>
                        <div className="flex items-center gap-3 mb-3">
                          <StatusIcon size={22} className={sc.color} />
                          <div>
                            <p className={`font-black text-base ${sc.color}`}>{sc.label}</p>
                            <p className="text-text-muted text-xs">{sc.desc}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div><p className="text-text-muted uppercase tracking-wider mb-0.5">Date</p><p className="text-white font-bold">{current.reservation_date}</p></div>
                          <div><p className="text-text-muted uppercase tracking-wider mb-0.5">Time</p><p className="text-white font-bold">{current.reservation_time}</p></div>
                          <div><p className="text-text-muted uppercase tracking-wider mb-0.5">Guests</p><p className="text-white font-bold">{current.party_size}</p></div>
                          {current.restaurant_tables && (
                            <div><p className="text-text-muted uppercase tracking-wider mb-0.5">Table</p><p className="text-white font-bold">T{current.restaurant_tables.table_number} (seats {current.restaurant_tables.capacity})</p></div>
                          )}
                        </div>
                        {current.status === 'pending' && (
                          <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-300">
                            ⏳ Your reservation is under review. We'll notify you shortly.
                          </div>
                        )}
                        {current.status === 'confirmed' && (
                          <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-xs text-emerald-300">
                            ✅ Your table is reserved! Please arrive 10 mins early.
                          </div>
                        )}
                        {(current.status === 'cancelled') && (
                          <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-300">
                            ❌ This reservation was not accepted. Please contact us or book again.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* All my reservations (if email provided) */}
              {myReservations.length > 1 && (
                <div className="bg-secondary/20 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Your Other Reservations</h3>
                  <div className="space-y-3">
                    {myReservations.filter(r => r.id !== submittedData?.id).slice(0, 5).map(r => {
                      const sc = statusConfig[r.status] || statusConfig.pending;
                      return (
                        <div key={r.id} className={`${sc.bg} border ${sc.border} rounded-xl px-4 py-3 flex items-center justify-between gap-3`}>
                          <div>
                            <p className="text-white text-xs font-bold">{r.reservation_date} at {r.reservation_time}</p>
                            <p className="text-text-muted text-[10px]">{r.party_size} guests{r.restaurant_tables ? ` · T${r.restaurant_tables.table_number}` : ''}</p>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${sc.color} ${sc.border} ${sc.bg}`}>{sc.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button onClick={resetForm} className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all">
                Make Another Reservation
              </button>
            </motion.div>
          ) : (
            /* ── Booking Form ── */
            <motion.div key="form" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <div className="grid lg:grid-cols-3 gap-10">
                {/* Form */}
                <div className="lg:col-span-2 bg-secondary/20 border border-white/10 rounded-2xl p-8">
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
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Email <span className="text-text-muted/60">(to track your reservation)</span></label>
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

                    {/* ── Table Selection from DB ── */}
                    <div>
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2 flex items-center gap-2">
                        <LayoutGrid size={13} className="text-primary" />
                        Select Table(s) <span className="text-text-muted/60">(optional)</span>
                        {form.table_ids.length > 0 && <span className="text-primary font-black">· {form.table_ids.length} selected</span>}
                      </label>
                      {tablesLoading ? (
                        <div className="flex items-center gap-2 py-2 text-text-muted text-xs"><Loader size={13} className="animate-spin text-primary" />Loading available tables...</div>
                      ) : availableTables.length === 0 ? (
                        <p className="text-amber-400 text-xs py-2">No tables available at the moment. We'll assign one for you.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {availableTables.map(t => {
                            const selected = form.table_ids.includes(t.id);
                            return (
                              <button key={t.id} type="button" onClick={() => toggleTable(t.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${selected ? 'bg-primary text-white border-primary' : 'bg-bg-main text-text-muted border-white/10 hover:border-white/30 hover:text-white'}`}>
                                T{t.table_number}
                                {t.section && t.section !== 'main' && <span className="ml-1 opacity-70">({t.section})</span>}
                                <span className="ml-1 opacity-60">👥{t.capacity}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {form.table_ids.length > 0 && (
                        <p className="text-primary text-xs mt-2 font-bold">Selected: {getTableLabel()}</p>
                      )}
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
                </div>

                {/* Info sidebar */}
                <div className="space-y-5">
                  {[
                    { icon:Clock,  title:'Hours',       lines:['Mon–Thu: 11am–10pm','Fri–Sat: 11am–11pm','Sun: 12pm–9pm'] },
                    { icon:Phone,  title:'Contact',     lines:['+1 (555) 012-3456','reservations@spiceroute.com'] },
                    { icon:Users,  title:'Large Groups',lines:['For 15+ guests call us','Private dining available','Catering packages offered'] },
                    { icon:Star,   title:'Why Spice Route',lines:['Authentic Indian flavors','Premium Halal ingredients','Est. 2023 · 4.9★ on Google'] },
                  ].map(card => (
                    <div key={card.title} className="bg-secondary/20 border border-white/10 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-3"><card.icon size={20} className="text-primary" /><h4 className="font-bold text-white">{card.title}</h4></div>
                      {card.lines.map(l => <p key={l} className="text-text-muted text-sm">{l}</p>)}
                    </div>
                  ))}

                  {/* Status tracker for returning customers */}
                  <div className="bg-secondary/20 border border-white/10 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3"><RefreshCw size={18} className="text-primary" /><h4 className="font-bold text-white">Track Your Reservation</h4></div>
                    <p className="text-text-muted text-xs mb-3">Enter your email to see existing reservations</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="your@email.com"
                        className="flex-1 bg-bg-main border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:border-primary outline-none"
                        onKeyDown={e => { if (e.key === 'Enter') fetchMyReservations(e.target.value); }}
                        id="track-email"
                      />
                      <button onClick={() => fetchMyReservations(document.getElementById('track-email')?.value)}
                        className="px-3 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-hover transition-all">
                        {myResLoading ? <Loader size={12} className="animate-spin" /> : 'Track'}
                      </button>
                    </div>
                    {myReservations.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {myReservations.slice(0, 3).map(r => {
                          const sc = statusConfig[r.status] || statusConfig.pending;
                          const StatusIcon = sc.icon;
                          return (
                            <div key={r.id} className={`${sc.bg} border ${sc.border} rounded-xl px-3 py-3`}>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-white text-xs font-bold">{r.reservation_date} · {r.reservation_time}</p>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${sc.color} ${sc.border}`}>{sc.label}</span>
                              </div>
                              <p className="text-text-muted text-[10px]">{r.party_size} guests{r.restaurant_tables ? ` · Table T${r.restaurant_tables.table_number}` : ''}</p>
                              {r.status === 'confirmed' && <p className="text-emerald-400 text-[10px] mt-1 font-bold">✅ Confirmed — please arrive 10 mins early</p>}
                              {r.status === 'cancelled' && <p className="text-red-400 text-[10px] mt-1">❌ Not accepted — please contact us</p>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
};

export default Reservations;