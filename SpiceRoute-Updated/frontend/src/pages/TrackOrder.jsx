import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CheckCircle, Clock, ChefHat, Truck, Star, Package,
  RefreshCw, Utensils, AlertCircle, Bell, ClipboardList, MapPin,
  CreditCard, Printer, Bike
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { trackingAPI } from '../api/index.js';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/useContextHooks';

const TRACK_STEPS = [
  { key: 'pending',   label: 'Order Placed',          icon: ClipboardList, color: '#f59e0b', desc: 'Your order has been received.' },
  { key: 'confirmed', label: 'Order Confirmed',        icon: CheckCircle,   color: '#3b82f6', desc: 'Our team confirmed your order.' },
  { key: 'preparing', label: 'Being Prepared',         icon: ChefHat,       color: '#f97316', desc: 'Our chef is cooking your food fresh.' },
  { key: 'ready',     label: 'Ready for Service',      icon: Bell,          color: '#22c55e', desc: 'Food is ready! Captain is on the way.' },
  { key: 'served',    label: 'Out for Delivery',       icon: Truck,         color: '#a855f7', desc: 'Your order is on its way!' },
  { key: 'paid',      label: 'Completed',              icon: Star,          color: '#e63946', desc: 'Enjoy your meal. Thank you!' },
];

const statusIndex = (status) => {
  const idx = TRACK_STEPS.findIndex(s => s.key === status);
  return idx === -1 ? 0 : idx;
};

// ── Animated Progress Bar ──────────────────────────────────────────────────────
const LiveProgressBar = ({ currentStep, total }) => {
  const pct = Math.round((currentStep / (total - 1)) * 100);
  return (
    <div className="relative w-full h-3 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: 'linear-gradient(90deg, #e63946, #f97316)' }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      {/* Shimmer */}
      <motion.div
        className="absolute inset-y-0 w-20 bg-white/20 skew-x-12"
        animate={{ x: ['-100%', '500%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
      />
    </div>
  );
};

// ── Bike Delivery Tracker ──────────────────────────────────────────────────────
const DeliveryTracker = ({ currentStep, totalSteps, isDelivery }) => {
  const pct = (currentStep / (totalSteps - 1)) * 100;

  return (
    <div className="relative w-full py-8">
      {/* Road */}
      <div className="relative h-2 bg-white/10 rounded-full mx-10">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: 'linear-gradient(90deg, #e63946 0%, #f97316 50%, #22c55e 100%)' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
        {/* Step dots */}
        {TRACK_STEPS.map((step, i) => {
          const pos = (i / (TRACK_STEPS.length - 1)) * 100;
          const done = i <= currentStep;
          return (
            <motion.div
              key={step.key}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${pos}%` }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 transition-all duration-500 ${
                  done ? 'border-transparent' : 'border-white/30 bg-bg-main'
                }`}
                style={done ? { backgroundColor: step.color, boxShadow: `0 0 12px ${step.color}80` } : {}}
              />
              {i === currentStep && (
                <motion.div
                  className="absolute -top-1 -left-1 w-6 h-6 rounded-full opacity-40"
                  style={{ backgroundColor: step.color }}
                  animate={{ scale: [1, 1.8, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.div>
          );
        })}

        {/* Moving vehicle icon */}
        <motion.div
          className="absolute top-1/2 -translate-y-[calc(50%+18px)] -translate-x-1/2 z-10 pointer-events-none"
          animate={{ left: `${pct}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        >
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
            className="text-2xl filter drop-shadow-lg"
          >
            {isDelivery ? '🛵' : '🍽️'}
          </motion.div>
        </motion.div>
      </div>

      {/* Step labels */}
      <div className="flex justify-between mt-6 px-6">
        {TRACK_STEPS.map((step, i) => {
          const done = i <= currentStep;
          const active = i === currentStep;
          return (
            <div key={step.key} className="flex flex-col items-center gap-1 flex-1">
              <p className={`text-[9px] font-bold uppercase tracking-wider text-center leading-tight transition-all ${
                active ? 'text-white' : done ? 'text-white/60' : 'text-white/20'
              }`}>
                {step.label.split(' ').slice(0, 2).join('\n')}
              </p>
              {active && (
                <motion.div
                  className="w-1 h-1 rounded-full"
                  style={{ backgroundColor: step.color }}
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Step Timeline ──────────────────────────────────────────────────────────────
const StepTimeline = ({ currentStep, order }) => (
  <div className="space-y-3">
    {TRACK_STEPS.map((step, idx) => {
      const done   = idx <= currentStep;
      const active = idx === currentStep;
      return (
        <motion.div
          key={step.key}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: done ? 1 : 0.35, x: 0 }}
          transition={{ delay: idx * 0.06 }}
          className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
            active
              ? 'border-white/20 bg-white/5'
              : done
              ? 'border-white/5 bg-white/2'
              : 'border-transparent'
          }`}
        >
          {/* Icon */}
          <div className="relative flex-shrink-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center border-2"
              style={{
                borderColor: done ? step.color : 'rgba(255,255,255,0.1)',
                backgroundColor: done ? `${step.color}20` : 'transparent',
              }}
            >
              <step.icon size={16} style={{ color: done ? step.color : '#6b7280' }} />
            </div>
            {active && (
              <motion.span
                className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
                style={{ backgroundColor: step.color }}
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            )}
          </div>
          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className={`font-bold text-sm ${done ? 'text-white' : 'text-text-muted'}`}>{step.label}</p>
              {active && (
                <span
                  className="text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider flex-shrink-0"
                  style={{ color: step.color, borderColor: `${step.color}40`, backgroundColor: `${step.color}15` }}
                >
                  Now
                </span>
              )}
              {done && !active && <CheckCircle size={14} className="text-green-400 flex-shrink-0" />}
            </div>
            {done && <p className="text-text-muted text-xs mt-0.5">{step.desc}</p>}
            {idx === 2 && order?.cook?.name && done && (
              <p className="text-orange-400 text-xs mt-1 font-semibold">👨‍🍳 Chef: {order.cook.name}</p>
            )}
            {idx === 3 && order?.captain?.name && done && (
              <p className="text-green-400 text-xs mt-1 font-semibold">🪑 Captain: {order.captain.name}</p>
            )}
          </div>
        </motion.div>
      );
    })}
  </div>
);

// ── Skeleton ───────────────────────────────────────────────────────────────────
const Skeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[1,2,3].map(i => (
      <div key={i} className="h-16 bg-white/5 rounded-2xl"/>
    ))}
  </div>
);

// ── Main ───────────────────────────────────────────────────────────────────────
const TrackOrder = ({ orderId: propOrderId }) => {
  const params     = useParams();
  const resolvedId = propOrderId || params.id || '';
  const { user }   = useAuth();
  const [searchId,     setSearchId]     = useState(resolvedId);
  const [order,        setOrder]        = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => { if (resolvedId) fetchOrder(resolvedId); }, [resolvedId]);

  const fetchOrder = async (id) => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      const res = await trackingAPI.track(id);
      setOrder(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.error || 'Order not found.');
      setOrder(null);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (order && !['paid','cancelled'].includes(order.status)) {
      intervalRef.current = setInterval(() => fetchOrder(order.id), 20000);
    }
    return () => clearInterval(intervalRef.current);
  }, [order?.status, order?.id]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchId.trim()) fetchOrder(searchId.trim().toUpperCase());
  };

  const currentStep   = order ? statusIndex(order.status) : -1;
  const isCancelled   = order?.status === 'cancelled';
  const isDelivery    = order?.order_type === 'delivery';
  const activeSC      = currentStep >= 0 ? TRACK_STEPS[currentStep] : null;

  const getETA = () => {
    if (!order) return null;
    if (['served','paid'].includes(order.status)) return 'Completed';
    if (order.status === 'ready') return 'Ready now!';
    const elapsed = Math.floor((Date.now() - new Date(order.created_at)) / 60000);
    const totalItems = (order.order_items||[]).reduce((s,i)=>s+i.quantity,0);
    const est = Math.max(15, totalItems*5);
    const rem = est - elapsed;
    return rem > 0 ? `~${rem} min` : 'Any moment...';
  };

  return (
    <div className="min-h-screen bg-bg-main text-white">
      <Navbar />
      <div className="container max-w-2xl mx-auto px-4 pt-28 pb-20">

        {/* Header */}
        <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} className="text-center mb-8">
          <span className="text-primary font-black uppercase tracking-[0.4em] text-[11px] mb-3 block">Real-Time</span>
          <h1 className="text-4xl md:text-5xl font-black mb-3">
            Track Your <span className="text-primary">Order</span>
          </h1>
          <p className="text-text-muted text-sm">Live updates every 20 seconds</p>
        </motion.div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={searchId}
              onChange={e => setSearchId(e.target.value.toUpperCase())}
              placeholder="e.g. ORD_1234567890"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pl-10 text-white placeholder-text-muted focus:outline-none focus:border-primary text-sm"
            />
          </div>
          <button type="submit" disabled={loading || !searchId.trim()}
            className="px-5 py-3.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center gap-2">
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
            Track
          </button>
        </form>

        {error && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 mb-5 text-red-400 text-sm">
            <AlertCircle size={16} className="flex-shrink-0"/>{error}
          </motion.div>
        )}

        {loading && !order && <Skeleton />}

        {order && (
          <AnimatePresence>
            <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="space-y-4">

              {/* ── LIVE STATUS HERO ── */}
              {!isCancelled && (
                <motion.div
                  className="rounded-3xl overflow-hidden border border-white/10"
                  style={{
                    background: activeSC
                      ? `linear-gradient(135deg, ${activeSC.color}18 0%, #0c0c0f 60%)`
                      : 'rgba(255,255,255,0.03)',
                  }}
                >
                  {/* Status header */}
                  <div className="px-6 pt-6 pb-2">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Live Status</p>
                        <motion.h2
                          key={order.status}
                          initial={{ opacity:0, y:8 }}
                          animate={{ opacity:1, y:0 }}
                          className="text-2xl font-black text-white"
                        >
                          {activeSC?.label || order.status}
                        </motion.h2>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-text-muted uppercase tracking-widest mb-1">ETA</p>
                        <p className="text-xl font-black text-primary">{getETA()}</p>
                      </div>
                    </div>

                    {/* Progress % */}
                    <div className="flex items-center gap-3 mb-3">
                      <LiveProgressBar currentStep={currentStep} total={TRACK_STEPS.length} />
                      <span className="text-primary font-black text-sm flex-shrink-0">
                        {Math.round((currentStep / (TRACK_STEPS.length - 1)) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Animated delivery tracker */}
                  <div className="px-4 pb-4">
                    <DeliveryTracker
                      currentStep={currentStep}
                      totalSteps={TRACK_STEPS.length}
                      isDelivery={isDelivery}
                    />
                  </div>

                  {/* Pulse badge */}
                  {!['paid','cancelled'].includes(order.status) && (
                    <div className="px-6 pb-5 flex items-center gap-2">
                      <motion.span
                        className="w-2 h-2 rounded-full bg-green-400"
                        animate={{ opacity: [1,0.3,1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <span className="text-green-400 text-xs font-bold uppercase tracking-wider">
                        Live — Auto-refreshing
                      </span>
                      {lastUpdated && (
                        <span className="text-text-muted text-xs ml-auto">
                          {lastUpdated.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Cancelled */}
              {isCancelled && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
                  <AlertCircle size={44} className="text-red-400 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-white mb-1">Order Cancelled</h3>
                  <p className="text-text-muted text-sm">Please contact us if you have questions.</p>
                </div>
              )}

              {/* Order info strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label:'Order ID',  value: order.id.slice(0,12)+'…' },
                  { label:'Type',      value: order.order_type },
                  { label:'Table',     value: order.table_number || 'N/A' },
                  { label:'Total',     value: `$${parseFloat(order.total).toFixed(2)}` },
                ].map((item,i) => (
                  <div key={i} className="bg-white/3 border border-white/8 rounded-xl p-3">
                    <p className="text-text-muted text-[10px] uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="font-bold text-white text-sm truncate capitalize">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Step timeline */}
              {!isCancelled && (
                <div className="bg-white/2 border border-white/8 rounded-2xl p-5">
                  <h3 className="font-bold text-white mb-4 text-sm flex items-center gap-2">
                    <ClipboardList size={14} className="text-primary"/> Order Journey
                  </h3>
                  <StepTimeline currentStep={currentStep} order={order} />
                </div>
              )}

              {/* Items */}
              <div className="bg-white/2 border border-white/8 rounded-2xl p-5">
                <h3 className="font-bold text-white mb-4 text-sm flex items-center gap-2">
                  <Utensils size={14} className="text-primary"/> Your Items
                </h3>
                <div className="space-y-2">
                  {(order.order_items || []).map((item,i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 bg-primary/20 rounded-full text-xs font-bold text-primary flex items-center justify-center flex-shrink-0">
                          {item.quantity}
                        </span>
                        <span className="text-sm text-white truncate">{item.menu_item_name}</span>
                        {item.cook_status === 'ready' && (
                          <span className="text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-bold flex-shrink-0">Ready</span>
                        )}
                      </div>
                      <span className="text-primary font-bold text-sm flex-shrink-0 ml-2">
                        ${(parseFloat(item.unit_price)*item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/10 mt-3 pt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-text-muted"><span>Subtotal</span><span>${parseFloat(order.subtotal||0).toFixed(2)}</span></div>
                  <div className="flex justify-between text-text-muted"><span>Tax</span><span>${parseFloat(order.tax||0).toFixed(2)}</span></div>
                  <div className="flex justify-between font-black text-base pt-1 border-t border-white/10">
                    <span>Total</span><span className="text-primary">${parseFloat(order.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Feedback CTA */}
              {['served','paid'].includes(order.status) && (
                <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                  className="bg-primary/10 border border-primary/20 rounded-2xl p-6 text-center">
                  <Star size={28} className="text-primary mx-auto mb-3"/>
                  <h3 className="font-bold text-white mb-1">How was your experience?</h3>
                  <p className="text-text-muted text-sm mb-4">Your feedback helps us improve</p>
                  <a href="/feedback"
                    className="inline-block px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-all text-sm">
                    Leave Feedback →
                  </a>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {!order && !error && !loading && (
          <div className="text-center py-16 text-text-muted">
            <Package size={48} className="mx-auto mb-4 opacity-20"/>
            <p className="font-bold text-white mb-1">Track any order</p>
            <p className="text-sm">Enter your order ID from the receipt or confirmation email</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default TrackOrder;