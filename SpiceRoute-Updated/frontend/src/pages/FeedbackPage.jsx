import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Star, Send, CheckCircle, User, Mail, Phone, Loader } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { feedbackAPI } from '../api/index.js';

const FeedbackPage = () => {
  const [form, setForm] = useState({
    customer_name: '', customer_email: '', customer_phone: '',
    feedback_type: 'general', subject: '', message: '', rating: 0, staff_involved: '',
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) { setError('Please enter your feedback message.'); return; }
    setLoading(true); setError('');
    try {
      await feedbackAPI.submit({ ...form, rating: form.rating || null });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally { setLoading(false); }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-text-muted focus:outline-none focus:border-primary transition-colors text-sm";

  const types = [
    { id: 'complaint',   label: '😠 Complaint',   desc: 'Report a problem or bad experience' },
    { id: 'suggestion',  label: '💡 Suggestion',  desc: 'Help us improve our service' },
    { id: 'compliment',  label: '😊 Compliment',  desc: 'Share a great experience' },
    { id: 'general',     label: '📝 General',     desc: 'General feedback or query' },
  ];

  return (
    <div className="min-h-screen bg-bg-main text-white">
      <Navbar />
      <div className="container max-w-3xl mx-auto px-6 pt-28 pb-20">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="text-center mb-12">
          <span className="text-primary font-black uppercase tracking-[0.4em] text-[12px] mb-4 block">Your Voice Matters</span>
          <h1 className="text-5xl font-black mb-4">Feedback & <span className="text-primary">Complaints</span></h1>
          <p className="text-text-muted max-w-xl mx-auto">We read every message. Your feedback directly reaches our management team.</p>
        </motion.div>

        {submitted ? (
          <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}
            className="text-center py-16 bg-green-500/10 border border-green-500/30 rounded-2xl">
            <CheckCircle size={64} className="text-green-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Thank You!</h2>
            <p className="text-text-muted">Your feedback has been received. Our team will review it shortly.</p>
            {form.customer_email && <p className="text-text-muted text-sm mt-1">We'll reply to {form.customer_email} if needed.</p>}
            <button onClick={() => { setSubmitted(false); setForm({ customer_name:'', customer_email:'', customer_phone:'', feedback_type:'general', subject:'', message:'', rating:0, staff_involved:'' }); }}
              className="mt-8 px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-all">
              Submit Another
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="bg-white/3 border border-white/10 rounded-2xl p-8">
            {/* Feedback Type */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {types.map(t => (
                <button key={t.id} type="button" onClick={() => setForm(p => ({...p, feedback_type: t.id}))}
                  className={`p-3 rounded-xl border text-left transition-all ${form.feedback_type===t.id?'border-primary bg-primary/10':'border-white/10 bg-white/5 hover:border-primary/50'}`}>
                  <p className="text-sm font-bold text-white mb-0.5">{t.label}</p>
                  <p className="text-[10px] text-text-muted leading-tight">{t.desc}</p>
                </button>
              ))}
            </div>

            {/* Star Rating */}
            <div className="mb-6">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Overall Rating (optional)</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button" onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => setForm(p => ({...p, rating: s}))}>
                    <Star size={28} className={`transition-all ${s <= (hoverRating || form.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} />
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="relative">
                  <User size={14} className="absolute left-3 top-3.5 text-primary"/>
                  <input name="customer_name" value={form.customer_name} onChange={handleChange} placeholder="Your name" className={`${inputClass} pl-9`}/>
                </div>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-3.5 text-primary"/>
                  <input name="customer_email" type="email" value={form.customer_email} onChange={handleChange} placeholder="Email (for reply)" className={`${inputClass} pl-9`}/>
                </div>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-3.5 text-primary"/>
                  <input name="customer_phone" value={form.customer_phone} onChange={handleChange} placeholder="Phone (optional)" className={`${inputClass} pl-9`}/>
                </div>
              </div>

              <input name="subject" value={form.subject} onChange={handleChange} placeholder="Subject (brief summary)" className={inputClass}/>
              <input name="staff_involved" value={form.staff_involved} onChange={handleChange} placeholder="Staff member involved (optional)" className={inputClass}/>

              <textarea name="message" value={form.message} onChange={handleChange} required rows={5} placeholder="Please describe your experience in detail..."
                className={`${inputClass} resize-none`}/>

              {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>}

              <button type="submit" disabled={loading}
                className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-base disabled:opacity-60">
                {loading ? <Loader size={18} className="animate-spin"/> : <Send size={18}/>}
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Info */}
        <div className="grid md:grid-cols-3 gap-4 mt-10">
          {[
            { icon: MessageSquare, title: 'Direct to Management', text: 'All feedback is read personally by our restaurant owner and manager.' },
            { icon: Star, title: 'We Respond', text: 'Provide your email and we will personally reply within 24 hours.' },
            { icon: CheckCircle, title: 'We Take Action', text: 'Every complaint is logged, reviewed, and acted upon immediately.' },
          ].map((c,i) => (
            <div key={i} className="bg-white/3 border border-white/10 rounded-xl p-5 text-center">
              <c.icon size={28} className="text-primary mx-auto mb-2"/>
              <p className="font-bold text-white text-sm mb-1">{c.title}</p>
              <p className="text-text-muted text-xs">{c.text}</p>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default FeedbackPage;
