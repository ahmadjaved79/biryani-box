import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CheckCircle, Clock, ChefHat, Truck, Star, Package,
  RefreshCw, MapPin, Phone, CreditCard, Utensils, AlertCircle,
  Bell, ClipboardList, UserCheck
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { trackingAPI } from '../api/index.js';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/useContextHooks';

// Full realistic order journey — every step a customer cares about
const TRACK_STEPS = [
  {
    key: 'pending',
    label: 'Order Placed',
    icon: ClipboardList,
    desc: 'Your order has been received and is awaiting confirmation.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
  },
  {
    key: 'confirmed',
    label: 'Order Confirmed',
    icon: CheckCircle,
    desc: 'Our team has confirmed your order and sent it to the kitchen.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  {
    key: 'preparing',
    label: 'Being Prepared',
    icon: ChefHat,
    desc: 'Our chef is now cooking your food fresh with care.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  },
  {
    key: 'ready',
    label: 'Ready for Service',
    icon: Bell,
    desc: 'Your food is ready! Our captain is bringing it to you.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  {
    key: 'served',
    label: 'Served / Out for Delivery',
    icon: Truck,
    desc: 'Your order has been served. Enjoy your meal!',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
  {
    key: 'paid',
    label: 'Completed',
    icon: Star,
    desc: 'Payment received. Thank you for dining with us!',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
  },
];

const statusIndex = (status) => {
  const idx = TRACK_STEPS.findIndex(s => s.key === status);
  return idx === -1 ? 0 : idx;
};

const TrackOrder = ({ orderId: propOrderId }) => {
  const params = useParams();
  const resolvedId = propOrderId || params.id || '';
  const { user } = useAuth();
  const [searchId, setSearchId] = useState(resolvedId);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  // Auto-fetch if order ID comes from URL
  useEffect(() => { if (resolvedId) fetchOrder(resolvedId); }, [resolvedId]);

  const fetchOrder = async (id) => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      const res = await trackingAPI.track(id);
      setOrder(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.error || 'Order not found. Please check the order ID.');
      setOrder(null);
    } finally { setLoading(false); }
  };

  // Auto-refresh every 20 seconds while order is active
  useEffect(() => {
    if (order && !['paid', 'cancelled'].includes(order.status)) {
      intervalRef.current = setInterval(() => fetchOrder(order.id), 20000);
    }
    return () => clearInterval(intervalRef.current);
  }, [order?.status, order?.id]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchId.trim()) fetchOrder(searchId.trim().toUpperCase());
  };

  const currentStep = order ? statusIndex(order.status) : -1;
  const isCancelled = order?.status === 'cancelled';

  const getETA = (order) => {
    if (!order) return null;
    const created = new Date(order.created_at);
    const now = new Date();
    const elapsed = Math.floor((now - created) / 60000);
    const totalItems = (order.order_items || []).reduce((s, i) => s + i.quantity, 0);
    const estimatedMins = Math.max(15, totalItems * 5);
    const remaining = estimatedMins - elapsed;
    if (order.status === 'served' || order.status === 'paid') return 'Completed';
    if (order.status === 'ready') return 'Ready now!';
    return remaining > 0 ? `~${remaining} min remaining` : 'Any moment now...';
  };

  return (
    <div className="min-h-screen bg-bg-main text-white">
      <Navbar />
      <div className="container max-w-3xl mx-auto px-6 pt-28 pb-20">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <span className="text-primary font-black uppercase tracking-[0.4em] text-[12px] mb-4 block">Real-Time</span>
          <h1 className="text-5xl font-black mb-4">Track Your <span className="text-primary">Order</span></h1>
          <p className="text-text-muted">Enter your order ID to see live status updates</p>
        </motion.div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={searchId}
              onChange={e => setSearchId(e.target.value.toUpperCase())}
              placeholder="Enter Order ID — e.g. ORD_1234567890"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 pl-11 text-white placeholder-text-muted focus:outline-none focus:border-primary text-sm"
            />
          </div>
          <button type="submit" disabled={loading || !searchId.trim()}
            className="px-6 py-4 bg-primary text-white rounded-xl font-bold uppercase text-sm hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center gap-2">
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
            Track
          </button>
        </form>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 mb-6 text-red-400 text-sm">
            <AlertCircle size={18} />{error}
          </motion.div>
        )}

        {order && (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

              {/* Order Summary Card */}
              <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
                <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Order ID</p>
                    <p className="text-xl font-black text-white">{order.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Total</p>
                    <p className="text-2xl font-black text-primary">${parseFloat(order.total).toFixed(2)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {[
                    { label: 'Type', value: order.order_type },
                    { label: 'Table', value: order.table_number || 'N/A' },
                    { label: 'Payment', value: order.payment_status },
                    { label: 'ETA', value: getETA(order) },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-3">
                      <p className="text-text-muted uppercase tracking-wider mb-1">{item.label}</p>
                      <p className="font-bold text-white capitalize">{item.value}</p>
                    </div>
                  ))}
                </div>
                {lastUpdated && (
                  <p className="text-text-muted text-xs mt-3 flex items-center gap-1">
                    <RefreshCw size={10} /> Last updated: {lastUpdated.toLocaleTimeString()}
                    {!['paid', 'cancelled'].includes(order.status) && ' · Auto-refreshes every 20s'}
                  </p>
                )}
              </div>

              {/* Timeline */}
              {isCancelled ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
                  <AlertCircle size={48} className="text-red-400 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-white mb-1">Order Cancelled</h3>
                  <p className="text-text-muted text-sm">This order has been cancelled. Please contact us if you have questions.</p>
                </div>
              ) : (
                <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
                  <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                    <ClipboardList size={16} className="text-primary" /> Order Journey
                  </h3>
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-white/10" />
                    <div
                      className="absolute left-5 top-5 w-0.5 bg-primary transition-all duration-1000"
                      style={{ height: `${Math.min(100, (currentStep / (TRACK_STEPS.length - 1)) * 100)}%` }}
                    />
                    <div className="space-y-6">
                      {TRACK_STEPS.map((step, idx) => {
                        const done = idx <= currentStep;
                        const active = idx === currentStep;
                        return (
                          <motion.div key={step.key}
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`flex items-start gap-4 relative ${!done ? 'opacity-40' : ''}`}>
                            {/* Icon */}
                            <div className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              done ? `${step.border} ${step.bg}` : 'border-white/10 bg-bg-main'
                            } ${active ? 'ring-4 ring-primary/20' : ''}`}>
                              <step.icon size={16} className={done ? step.color : 'text-text-muted'} />
                              {active && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                              )}
                            </div>
                            {/* Content */}
                            <div className="flex-1 pt-1">
                              <div className="flex items-center justify-between">
                                <p className={`font-bold text-sm ${done ? 'text-white' : 'text-text-muted'}`}>{step.label}</p>
                                {active && <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-bold uppercase">Current</span>}
                                {done && !active && <CheckCircle size={14} className="text-green-400" />}
                              </div>
                              {(done || active) && (
                                <p className="text-text-muted text-xs mt-0.5">{step.desc}</p>
                              )}
                              {idx === 2 && order.cook?.name && done && (
                                <p className="text-orange-400 text-xs mt-1 font-semibold">
                                  👨‍🍳 Chef: {order.cook.name}
                                </p>
                              )}
                              {idx === 3 && order.captain?.name && done && (
                                <p className="text-green-400 text-xs mt-1 font-semibold">
                                  🪑 Captain: {order.captain.name}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Utensils size={16} className="text-primary" /> Your Items
                </h3>
                <div className="space-y-2">
                  {(order.order_items || []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-primary/20 rounded-full text-xs font-bold text-primary flex items-center justify-center">{item.quantity}</span>
                        <span className="text-sm text-white">{item.menu_item_name}</span>
                        {item.cook_status === 'ready' && (
                          <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-bold">Ready</span>
                        )}
                        {item.cook_status === 'preparing' && (
                          <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-bold">Cooking</span>
                        )}
                      </div>
                      <span className="text-primary font-bold text-sm">${(parseFloat(item.unit_price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/10 mt-3 pt-3 space-y-1">
                  <div className="flex justify-between text-sm text-text-muted">
                    <span>Subtotal</span><span>${parseFloat(order.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-text-muted">
                    <span>Tax (8%)</span><span>${parseFloat(order.tax || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-white pt-1 border-t border-white/10">
                    <span>Total</span><span className="text-primary">${parseFloat(order.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Rate & Feedback (only after served/paid) */}
              {['served', 'paid'].includes(order.status) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/10 border border-primary/20 rounded-2xl p-6 text-center">
                  <Star size={32} className="text-primary mx-auto mb-3" />
                  <h3 className="font-bold text-white mb-1">How was your experience?</h3>
                  <p className="text-text-muted text-sm mb-4">Your feedback helps us improve</p>
                  <a href={`/feedback`}
                    className="inline-block px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-all text-sm">
                    Leave Feedback →
                  </a>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Guest usage tip */}
        {!order && !error && !loading && (
          <div className="text-center py-12 text-text-muted">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold text-white mb-1">Track any order</p>
            <p className="text-sm">Enter the order ID from your receipt or confirmation</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default TrackOrder;
