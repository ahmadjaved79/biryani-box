import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/useContextHooks';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck, Loader, ChefHat,Truck  } from 'lucide-react';

const ROLE_CREDENTIALS = {
  owner:   { email: 'owner@spiceroute.com',   hint: 'password123' },
  manager: { email: 'manager@spiceroute.com', hint: 'password123' },
  captain: { email: 'captain@spiceroute.com', hint: 'password123' },
  cook:    { email: 'cook@spiceroute.com',     hint: 'password123' },
  delivery: { email: 'delivery@spiceroute.com', hint: 'password123' },
};

const Login = () => {
  const { login, loading, authError } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('owner');
  const [formData, setFormData] = useState({ email: ROLE_CREDENTIALS.owner.email, password: '' });
  const [error, setError] = useState('');

  const handleTabChange = (role) => {
    setActiveTab(role);
    setFormData({ email: ROLE_CREDENTIALS[role].email, password: '' });
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.password) { setError('Password required'); return; }
    const result = await login(formData.email, formData.password);
    if (result.success) {
      const role = result.user.role;
      if (role === 'cook') navigate('/cook-dashboard');
      else if (role === 'delivery') navigate('/delivery/hub');
      else navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  const roles = [
    { id: 'owner',   label: 'Owner',   icon: ShieldCheck, desc: 'Full business control' },
    { id: 'manager', label: 'Manager', icon: User,         desc: 'Daily operations' },
    { id: 'captain', label: 'Captain', icon: User,         desc: 'Table & order management' },
    { id: 'cook',    label: 'Cook',    icon: ChefHat,      desc: 'Kitchen & food prep' },
    { id: 'delivery', label: 'Delivery', icon: Truck,       desc: 'Order delivery' },

  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-main relative p-6">
      <div className="absolute inset-0 z-0 opacity-10">
        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-primary blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-accent blur-3xl rounded-full translate-x-1/2 translate-y-1/2" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg glass p-10 rounded-lg relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-1">
            <span className="text-primary">SPICE</span>
            <span className="text-white">ROUTE</span>
          </h1>
          <p className="text-text-muted text-sm">Staff Management Portal</p>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-8">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleTabChange(role.id)}
              className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === role.id ? 'bg-primary text-white' : 'bg-white/5 border border-white/10 hover:border-primary/50 text-text-muted'}`}
            >
              <role.icon size={16} />
              {role.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">Email</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={18} />
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                className="w-full bg-bg-main border border-white/10 p-4 pl-12 rounded-sm focus:border-primary outline-none text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
              Password <span className="text-primary/60 normal-case font-normal">(hint: password123)</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={18} />
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                placeholder="Enter password"
                className="w-full bg-bg-main border border-white/10 p-4 pl-12 rounded-sm focus:border-primary outline-none text-white"
              />
            </div>
          </div>

          {(error || authError) && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error || authError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-3 disabled:opacity-60"
          >
            {loading ? <Loader size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
            {loading ? 'AUTHENTICATING...' : `LOGIN AS ${activeTab.toUpperCase()}`}
          </button>
        </form>

        <div className="flex justify-center gap-3 mt-5">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 border border-white/20 rounded-lg hover:bg-white/10 transition-all text-xs font-black uppercase tracking-widest"
          >
            Back To Home
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-all text-xs font-black uppercase tracking-widest"
          >
            Customer Login
          </button>
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          Authorized personnel only · Secure JWT connection
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
