import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Mail, Phone, Loader, ShieldCheck, ChefHat, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useContextHooks';
import { customersAPI } from '../api/index.js';
import Navbar from '../components/Navbar';

const CustomerAuth = () => {
  const { customerLogin, customerRegister, verifyOtp, loading, authError } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [error, setError] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'login') {
      const result = await customerLogin(form.email, form.password);
      if (result.success) navigate('/customer/dashboard');
      else setError(result.error);
    } else {
      if (!form.name.trim()) { setError('Please enter your name'); return; }
      const result = await customerRegister(form.name, form.email, form.password, form.phone);
      if (result.otpSent) { setPendingEmail(form.email); setStep('otp'); }
      else setError(result.error);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    const result = await verifyOtp(pendingEmail, otp);
    if (result.success) navigate('/customer/dashboard');
    else setError(result.error);
  };

  const handleResend = async () => {
    try { await customersAPI.resendOtp(pendingEmail); setError('OTP resent!'); }
    catch (err) { setError(err.response?.data?.error || 'Resend failed'); }
  };

  const ic = "w-full bg-bg-main border border-white/10 p-4 pl-12 rounded-lg focus:border-primary outline-none text-white placeholder-text-muted text-sm";

  return (
    <div className="min-h-screen bg-bg-main text-white">
      <Navbar />
      <div className="flex items-center justify-center min-h-screen px-6 pt-16">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass p-10 rounded-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/30">
              <ChefHat className="text-primary" size={28} />
            </div>
            <h1 className="text-3xl font-bold mb-1">
              <span className="text-primary">SPICE</span><span className="text-white">ROUTE</span>
            </h1>
            <p className="text-text-muted text-sm">Customer Portal</p>
          </div>

          {step === 'otp' ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-text-muted text-sm text-center">Enter the 6-digit OTP sent to <span className="text-primary">{pendingEmail}</span></p>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter OTP" maxLength={6} required className={ic} />
              </div>
              {(error || authError) && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error || authError}</div>}
              <button type="submit" disabled={loading} className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-sm font-bold uppercase disabled:opacity-60">
                {loading ? <Loader size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button type="button" onClick={handleResend} className="w-full text-xs text-text-muted hover:text-primary transition-all">Resend OTP</button>
            </form>
          ) : (
            <>
              <div className="flex gap-3 mb-8">
                {['login', 'register'].map(m => (
                  <button key={m} onClick={() => { setMode(m); setError(''); }}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${mode === m ? 'bg-primary text-white shadow-lg' : 'bg-white/5 border border-white/10 text-text-muted hover:border-primary/50'}`}>
                    {m === 'login' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                    <input name="name" value={form.name} onChange={handleChange} placeholder="Full Name" required className={ic} />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email Address" required className={ic} />
                </div>
                {mode === 'register' && (
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone Number (optional)" className={ic} />
                  </div>
                )}
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                  <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" required minLength={6} className={ic} />
                </div>
                {(error || authError) && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error || authError}</div>}
                <button type="submit" disabled={loading} className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-sm font-bold uppercase disabled:opacity-60">
                  {loading ? <Loader size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Send OTP'}
                </button>
              </form>
              <div className="mt-6 text-center space-y-2">
                <p className="text-text-muted text-xs">
                  {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                  <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="text-primary ml-1 font-bold hover:underline">
                    {mode === 'login' ? 'Register' : 'Sign In'}
                  </button>
                </p>
                <button onClick={() => navigate('/login')} className="text-xs text-text-muted hover:text-primary transition-all">Staff Login →</button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CustomerAuth;