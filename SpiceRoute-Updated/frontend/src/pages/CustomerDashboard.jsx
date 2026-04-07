import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Clock, Star, Gift, RefreshCw, ChevronRight,
  CheckCircle2, AlertCircle, Package, Flame, TrendingUp,
  MessageSquare, Tag, Award, Loader, RotateCcw, MapPin,
  Utensils, CreditCard, X, Plus, Minus, Sparkles, Calendar,
  ChevronDown, CheckCheck,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth, useCart } from '../context/useContextHooks';
import { customerDashboardAPI, feedbackAPI, menuAPI, reservationsAPI, cateringAPI } from '../api/index.js';

const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric', timeZone:'America/New_York' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', timeZone:'America/New_York' });

const TIER_CONFIG = {
  Bronze:   { color:'text-orange-400',  bg:'bg-orange-500/10',  border:'border-orange-500/30',  next:500  },
  Silver:   { color:'text-slate-300',   bg:'bg-slate-500/10',   border:'border-slate-400/30',   next:2000 },
  Gold:     { color:'text-yellow-400',  bg:'bg-yellow-500/10',  border:'border-yellow-500/30',  next:5000 },
  Platinum: { color:'text-purple-400',  bg:'bg-purple-500/10',  border:'border-purple-500/30',  next:null },
};

const ORDER_TIMELINE = [
  { status:'pending',   label:'Placed',    icon:Package     },
  { status:'confirmed', label:'Confirmed', icon:CheckCircle2 },
  { status:'preparing', label:'Preparing', icon:Flame       },
  { status:'ready',     label:'Ready',     icon:Utensils    },
  { status:'served',    label:'Served',    icon:Star        },
  { status:'paid',      label:'Done',      icon:CreditCard  },
];

const Section = ({ title, icon: Icon, action, children }) => (
  <div className="bg-[#111] border border-white/8 rounded-2xl overflow-hidden w-full">
    <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/5">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon size={16} className="text-primary flex-shrink-0" />}
        <h2 className="text-sm font-bold text-white uppercase tracking-wider truncate">{title}</h2>
      </div>
      {action && <div className="flex-shrink-0 ml-2">{action}</div>}
    </div>
    <div className="p-4 sm:p-6 w-full overflow-hidden">{children}</div>
  </div>
);

const EmptyState = ({ icon: Icon, text }) => (
  <div className="flex flex-col items-center py-10 text-center gap-3">
    <Icon size={36} className="text-white/10" />
    <p className="text-text-muted text-sm">{text}</p>
  </div>
);

/* ─── Customer Overview ─────────────────────────────────────────────────────── */
const CustomerOverview = ({ profile }) => {
  const tier = profile?.loyalty_tier || 'Bronze';
  const tc   = TIER_CONFIG[tier] || TIER_CONFIG.Bronze;
  const progress = tc.next ? Math.min(100, ((profile?.loyalty_points || 0) / tc.next) * 100) : 100;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className={`sm:col-span-1 rounded-2xl p-5 border ${tc.border} ${tc.bg} flex flex-col gap-3 overflow-hidden`}>
        <div className="flex items-center gap-3">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.name||'guest'}`} className="w-12 h-12 rounded-full border-2 border-primary flex-shrink-0 bg-white/10" alt="" />
          <div className="min-w-0"><p className="text-xs text-text-muted uppercase tracking-widest">Welcome back</p><p className="text-white font-bold text-base truncate">{profile?.name?.split(' ')[0]||'—'}</p></div>
        </div>
        <div className={`flex items-center gap-2 self-start px-3 py-1 rounded-full border text-xs font-bold ${tc.color} ${tc.border} bg-black/30 whitespace-nowrap`}>
          <Award size={12} className="flex-shrink-0" /> {tier} Member
        </div>
        {tc.next && (
          <div className="w-full">
            <div className="flex justify-between text-[10px] text-text-muted mb-1 gap-2"><span className="flex-shrink-0">{profile?.loyalty_points||0} pts</span><span className="truncate text-right">{tc.next} pts for {profile?.tier_benefits?.nextTier}</span></div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-full"><div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width:`${progress}%` }} /></div>
          </div>
        )}
      </div>
      {[
        { label:'Total Orders', value:profile?.total_orders||0, icon:Package, color:'text-blue-400', bg:'bg-blue-500/10', border:'border-blue-500/20' },
        { label:'Total Spent',  value:fmt(profile?.total_spent), icon:CreditCard, color:'text-green-400', bg:'bg-green-500/10', border:'border-green-500/20' },
      ].map((s,i) => (
        <div key={i} className={`rounded-2xl p-5 border ${s.border} ${s.bg} flex flex-col justify-between overflow-hidden`}>
          <div className="flex items-center justify-between mb-3 gap-2"><p className="text-xs font-bold text-text-muted uppercase tracking-wider truncate">{s.label}</p><s.icon size={16} className={`${s.color} flex-shrink-0`} /></div>
          <p className={`text-3xl sm:text-4xl font-black ${s.color} truncate`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
};

/* ─── Quick Actions ──────────────────────────────────────────────────────────── */
const QuickActions = ({ navigate, cartCount, lastOrder }) => {
  const actions = [
    { icon:ShoppingCart, label:'View Cart',    badge:cartCount>0?cartCount:null, desc:cartCount>0?`${cartCount} items`:'Empty',         onClick:()=>navigate('/cart'),          active:cartCount>0 },
    { icon:Utensils,     label:'Order Now',    badge:null, desc:'Browse full menu',                                                       onClick:()=>navigate('/#menu'),         active:true },
    { icon:RotateCcw,    label:'Reorder',      badge:null, desc:lastOrder?'Repeat last order':'No previous orders',                       onClick:()=>navigate('/customer/history'), active:!!lastOrder },
    { icon:Calendar,     label:'Reservations', badge:null, desc:'Book a table',                                                           onClick:()=>navigate('/reservations'),  active:true },
    { icon:MessageSquare,label:'Feedback',     badge:null, desc:'Rate your experience',                                                   onClick:()=>navigate('/feedback'),      active:true },
    { icon:Gift,         label:'Gift Cards',   badge:null, desc:'Send a gift',                                                            onClick:()=>navigate('/gift-cards'),    active:true },
  ];
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
      {actions.map((a,i) => (
        <button key={i} onClick={a.onClick}
          className={`relative flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-2xl border transition-all group ${a.active?'border-white/10 bg-white/3 hover:border-primary/50 hover:bg-primary/5':'border-white/5 bg-white/2 opacity-50 cursor-not-allowed'}`}>
          {a.badge && <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center z-10">{a.badge}</span>}
          <a.icon size={18} className={`transition-all flex-shrink-0 ${a.active?'text-primary':'text-white/30'}`} />
          <p className="text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-wider text-center leading-tight w-full">{a.label}</p>
          <p className="text-[8px] sm:text-[9px] text-text-muted text-center leading-tight hidden sm:block">{a.desc}</p>
        </button>
      ))}
    </div>
  );
};

/* ─── Animated Order Tracker ─────────────────────────────────────────────────── */
const OrderTracker = ({ order }) => {
  if (!order) return <EmptyState icon={Package} text="No active order. Place an order from the menu." />;
  const currentIdx = ORDER_TIMELINE.findIndex(s => s.status === order.status);
  const items = order.order_items || [];

  return (
    <div className="space-y-6">
      {/* Animated status timeline */}
      <div className="w-full overflow-x-auto pb-2">
        <div className="flex items-start min-w-[480px] relative">
          {ORDER_TIMELINE.map((step, i) => {
            const done   = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <div key={step.status} className="flex-1 flex flex-col items-center relative">
                {i < ORDER_TIMELINE.length - 1 && (
                  <div className="absolute top-4 left-1/2 w-full h-0.5 bg-white/10 z-0">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: done ? '100%' : '0%' }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                    />
                  </div>
                )}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: active ? 1.15 : 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center z-10 flex-shrink-0 transition-all ${active ? 'bg-primary shadow-lg shadow-primary/50' : done ? 'bg-primary/40' : 'bg-white/10'}`}
                >
                  {done && !active ? (
                    <CheckCheck size={14} className="text-white" />
                  ) : (
                    <step.icon size={14} className={done ? 'text-white' : 'text-white/30'} />
                  )}
                  {active && (
                    <motion.div
                      className="absolute w-9 h-9 rounded-full bg-primary/30"
                      animate={{ scale: [1, 1.6, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 + 0.2 }}
                  className={`text-[9px] font-bold mt-2 text-center uppercase tracking-wider px-1 ${active ? 'text-primary' : done ? 'text-white/60' : 'text-white/20'}`}
                >
                  {step.label}
                </motion.p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status message */}
      <motion.div
        key={order.status}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2 ${
          order.status === 'preparing' ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400' :
          order.status === 'ready'     ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
          order.status === 'served'    ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400' :
          order.status === 'paid'      ? 'bg-primary/10 border border-primary/30 text-primary' :
          'bg-white/5 border border-white/10 text-white/60'
        }`}
      >
        {order.status === 'pending'   && <><Package size={15}/> Order placed — waiting for confirmation</>}
        {order.status === 'confirmed' && <><CheckCircle2 size={15}/> Order confirmed — heading to kitchen!</>}
        {order.status === 'preparing' && <><Flame size={15} className="animate-pulse"/> Your food is being prepared 🔥</>}
        {order.status === 'ready'     && <><Utensils size={15}/> Food is ready — captain will serve you soon!</>}
        {order.status === 'served'    && <><Star size={15}/> Enjoy your meal! 🌟</>}
        {order.status === 'paid'      && <><CreditCard size={15}/> Order complete — thank you!</>}
      </motion.div>

      {/* Order details */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3 gap-2">
          <p className="font-mono text-xs font-bold text-primary truncate">{order.id}</p>
          <div className="flex items-center gap-1 text-xs text-text-muted flex-shrink-0"><Clock size={11} /> {fmtTime(order.created_at)}</div>
        </div>
        <div className="space-y-1 mb-3">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-xs gap-2">
              <span className="text-white truncate">{item.menu_item_name}</span>
              <span className="text-text-muted flex-shrink-0">×{item.quantity}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t border-white/5 pt-2 text-sm font-bold">
          <span className="text-text-muted">Total</span>
          <span className="text-primary">{fmt(order.total)}</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Reservation Status ─────────────────────────────────────────────────────── */
const MyReservations = ({ user }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    reservationsAPI.getAll({ email: user.email })
      .then(r => { setReservations((r.data || []).slice(0, 5)); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const statusConfig = {
    pending:   { color:'text-yellow-400', bg:'bg-yellow-500/10', border:'border-yellow-500/30', label:'Pending' },
    confirmed: { color:'text-blue-400',   bg:'bg-blue-500/10',   border:'border-blue-500/30',   label:'Confirmed ✓' },
    seated:    { color:'text-green-400',  bg:'bg-green-500/10',  border:'border-green-500/30',  label:'Seated 🪑' },
    completed: { color:'text-primary',    bg:'bg-primary/10',    border:'border-primary/30',    label:'Completed' },
    cancelled: { color:'text-red-400',    bg:'bg-red-500/10',    border:'border-red-500/30',    label:'Cancelled' },
    'no-show': { color:'text-red-400',    bg:'bg-red-500/10',    border:'border-red-500/30',    label:'No Show' },
  };

  if (loading) return <div className="flex justify-center py-6"><Loader size={18} className="animate-spin text-primary" /></div>;
  if (!reservations.length) return (
    <div className="flex flex-col items-center py-8 text-center gap-3">
      <Calendar size={32} className="text-white/10" />
      <p className="text-text-muted text-sm">No reservations yet.</p>
      <a href="/reservations" className="text-primary text-xs hover:underline">Book a table →</a>
    </div>
  );

  return (
    <div className="space-y-3">
      {reservations.map((r, i) => {
        const sc = statusConfig[r.status] || statusConfig.pending;
        return (
          <motion.div key={r.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay: i * 0.06 }}
            className={`rounded-xl border ${sc.border} ${sc.bg} p-4 overflow-hidden`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase ${sc.color} ${sc.border} ${sc.bg}`}>{sc.label}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                  <span className="flex items-center gap-1"><Calendar size={10} className="text-primary" />{r.reservation_date}</span>
                  <span className="flex items-center gap-1"><Clock size={10} className="text-primary" />{r.reservation_time}</span>
                  <span className="flex items-center gap-1"><Utensils size={10} className="text-primary" />{r.party_size} guests</span>
                </div>
                {r.special_requests && <p className="text-yellow-300 text-xs mt-1">📝 {r.special_requests}</p>}
                {r.occasion && <p className="text-primary text-xs mt-1">🎉 {r.occasion}</p>}
              </div>
            </div>
            {r.status === 'confirmed' && (
              <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-xs text-blue-300">
                ✓ Your reservation is confirmed! We look forward to seeing you.
              </div>
            )}
            {r.status === 'pending' && (
              <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 text-xs text-yellow-300">
                ⏳ Your reservation is pending confirmation from our team.
              </div>
            )}
          </motion.div>
        );
      })}
      <a href="/reservations" className="block text-center text-primary text-xs hover:underline pt-1">+ New Reservation</a>
    </div>
  );
};

/* ─── Recommendations ────────────────────────────────────────────────────────── */
const Recommendations = ({ items, onAddToCart }) => {
  if (!items.length) return <EmptyState icon={Sparkles} text="Recommendations load after your first order." />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map(item => (
        <div key={item.id} className="relative bg-white/3 border border-white/8 rounded-xl p-4 flex flex-col gap-3 hover:border-primary/30 transition-all overflow-hidden">
          {item.is_reorder && <span className="absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded-full uppercase whitespace-nowrap">Your Fave</span>}
          <div className="flex items-center gap-3 pr-16"><span className="text-2xl flex-shrink-0">{item.image_emoji||'🍽️'}</span><div className="flex-1 min-w-0"><p className="font-bold text-white text-sm truncate">{item.name}</p><p className="text-text-muted text-[10px] truncate">{item.category}</p></div></div>
          <div className="flex items-center gap-2 text-[10px] text-text-muted flex-wrap"><span className="flex items-center gap-1"><Star size={10} className="text-yellow-400 fill-yellow-400" /> {item.rating}</span>{item.is_veg&&<span className="text-green-400">Veg</span>}<span>{'🌶'.repeat(item.spice_level||1)}</span></div>
          <div className="flex items-center justify-between mt-auto gap-2"><p className="text-primary font-bold">{fmt(item.price)}</p><button onClick={()=>onAddToCart(item)} className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap flex-shrink-0"><Plus size={11} /> Add</button></div>
        </div>
      ))}
    </div>
  );
};

/* ─── Active Offers ──────────────────────────────────────────────────────────── */
const ActiveOffers = ({ offers }) => {
  if (!offers.length) return <EmptyState icon={Tag} text="No offers available right now. Keep ordering to unlock rewards!" />;
  const typeStyle = { new_customer:'border-green-500/30 bg-green-500/5', loyalty:'border-primary/30 bg-primary/5', freebie:'border-purple-500/30 bg-purple-500/5', announcement:'border-blue-500/30 bg-blue-500/5' };
  return (
    <div className="grid grid-cols-1 gap-4">
      {offers.map(offer => (
        <div key={offer.id} className={`rounded-xl border p-4 overflow-hidden ${typeStyle[offer.type]||typeStyle.announcement}`}>
          <div className="flex items-start justify-between gap-2 mb-2"><p className="font-bold text-white text-sm flex-1 min-w-0">{offer.title}</p><div className="flex-shrink-0">{offer.discount_pct>0&&<span className="text-[10px] font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full whitespace-nowrap">{offer.discount_pct}% OFF</span>}{offer.free_item&&<span className="text-[10px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">FREE</span>}</div></div>
          <p className="text-text-muted text-xs mb-3">{offer.description}</p>
          {offer.min_order>0&&<p className="text-[10px] text-text-muted">Min. order: {fmt(offer.min_order)}</p>}
          {offer.code&&(<div className="mt-3 flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2"><Tag size={11} className="text-primary flex-shrink-0" /><span className="font-mono text-xs font-bold text-primary tracking-widest truncate">{offer.code}</span></div>)}
          {offer.expires&&<p className="text-[9px] text-text-muted/50 mt-2">Expires {fmtDate(offer.expires)}</p>}
        </div>
      ))}
    </div>
  );
};

/* ─── Cart Snapshot ──────────────────────────────────────────────────────────── */
const CartSnapshot = ({ cart, total, updateQuantity, removeFromCart, navigate }) => {
  if (!cart.length) return <EmptyState icon={ShoppingCart} text="Your cart is empty. Explore the menu to add items." />;
  return (
    <div className="space-y-3">
      {cart.map(item => (
        <div key={item.id} className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-3 sm:px-4 py-3 overflow-hidden">
          <span className="text-xl flex-shrink-0">{item.image_emoji||'🍽️'}</span>
          <div className="flex-1 min-w-0"><p className="font-bold text-white text-sm truncate">{item.name}</p><p className="text-text-muted text-xs">{fmt(item.price)} each</p></div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={()=>updateQuantity(item.id,item.quantity-1)} className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:border-primary hover:text-primary transition-all"><Minus size={11} /></button>
            <span className="text-white font-bold text-sm w-5 text-center">{item.quantity}</span>
            <button onClick={()=>updateQuantity(item.id,item.quantity+1)} className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:border-primary hover:text-primary transition-all"><Plus size={11} /></button>
          </div>
          <p className="text-primary font-bold text-sm w-14 text-right flex-shrink-0">{fmt(item.price*item.quantity)}</p>
          <button onClick={()=>removeFromCart(item.id)} className="text-red-400 hover:text-red-300 transition-colors ml-1 flex-shrink-0"><X size={14} /></button>
        </div>
      ))}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-white/5">
        <div><p className="text-text-muted text-xs">Subtotal</p><p className="text-2xl font-black text-primary">{fmt(total)}</p></div>
        <button onClick={()=>navigate('/checkout')} className="btn-primary w-full sm:w-auto px-8 py-3 flex items-center justify-center gap-2 text-sm font-bold">Checkout <ChevronRight size={16} /></button>
      </div>
    </div>
  );
};

/* ─── Order History ──────────────────────────────────────────────────────────── */
const OrderHistory = ({ orders, onReorder }) => {
  const [expanded, setExpanded] = useState(null);
  if (!orders.length) return <EmptyState icon={Clock} text="No orders yet. Place your first order!" />;
  const statusColor = { paid:'text-green-400', served:'text-blue-400', cancelled:'text-red-400', preparing:'text-orange-400', ready:'text-yellow-400' };
  return (
    <div className="space-y-3">
      {orders.map(order => {
        const items = order.order_items || [];
        const isOpen = expanded === order.id;
        return (
          <div key={order.id} className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
            <button onClick={()=>setExpanded(isOpen?null:order.id)} className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-white/3 transition-all text-left">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap"><p className="font-mono text-xs font-bold text-primary truncate max-w-[120px] sm:max-w-none">{order.id}</p><span className={`text-[9px] font-bold uppercase flex-shrink-0 ${statusColor[order.status]||'text-text-muted'}`}>{order.status}</span></div>
                <p className="text-text-muted text-xs truncate">{items.slice(0,2).map(i=>i.menu_item_name).join(', ')}{items.length>2?` +${items.length-2} more`:''}</p>
              </div>
              <div className="text-right flex-shrink-0"><p className="text-white font-bold text-sm">{fmt(order.total)}</p><p className="text-text-muted text-[10px]">{fmtDate(order.created_at)}</p></div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.2}}>
                  <div className="px-4 sm:px-5 pb-4 border-t border-white/5 pt-3">
                    <div className="space-y-1 mb-4">{items.map((item,i)=>(<div key={i} className="flex justify-between text-xs gap-2"><span className="text-white truncate">{item.menu_item_name} <span className="text-text-muted">×{item.quantity}</span></span><span className="text-text-muted flex-shrink-0">{fmt(item.unit_price*item.quantity)}</span></div>))}</div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={()=>onReorder(items)} className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 rounded-lg text-xs font-bold transition-all"><RotateCcw size={12} /> Reorder</button>
                      <button onClick={()=>window.open(`/feedback?order=${order.id}`,'_self')} className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-text-muted border border-white/10 rounded-lg text-xs font-bold transition-all"><MessageSquare size={12} /> Feedback</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Feedback Widget ────────────────────────────────────────────────────────── */
const FeedbackWidget = ({ user }) => {
  const [form, setForm] = useState({ feedback_type:'general', message:'', rating:0 });
  const [hover, setHover] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!form.message.trim()) return;
    setLoading(true);
    try { await feedbackAPI.submit({ ...form, customer_name:user?.name, customer_email:user?.email, rating:form.rating||null }); setDone(true); }
    catch(e) { console.error(e); }
    setLoading(false);
  };
  if (done) return (
    <div className="flex flex-col items-center gap-3 py-8 text-center"><CheckCircle2 size={40} className="text-green-400" /><p className="text-white font-bold">Thank you for your feedback!</p><p className="text-text-muted text-sm">Our team will review it shortly.</p><button onClick={()=>setDone(false)} className="text-primary text-xs hover:underline mt-2">Submit another</button></div>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[{id:'complaint',label:'😠 Complaint'},{id:'suggestion',label:'💡 Suggest'},{id:'compliment',label:'😊 Compliment'},{id:'general',label:'📝 General'}].map(t=>(
          <button key={t.id} onClick={()=>setForm(p=>({...p,feedback_type:t.id}))} className={`py-2 px-1 rounded-xl border text-[10px] font-bold transition-all text-center ${form.feedback_type===t.id?'border-primary bg-primary/10 text-primary':'border-white/10 bg-white/3 text-text-muted hover:border-primary/40'}`}>{t.label}</button>
        ))}
      </div>
      <div className="flex gap-1">{[1,2,3,4,5].map(s=>(<button key={s} onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(0)} onClick={()=>setForm(p=>({...p,rating:s}))}><Star size={22} className={`transition-all ${s<=(hover||form.rating)?'text-yellow-400 fill-yellow-400':'text-white/20'}`}/></button>))}</div>
      <textarea value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} rows={3} placeholder="Tell us about your experience…" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary resize-none"/>
      <button onClick={submit} disabled={loading||!form.message.trim()} className="btn-primary px-6 py-2.5 flex items-center gap-2 text-sm font-bold disabled:opacity-50">{loading?<Loader size={15} className="animate-spin"/>:<MessageSquare size={15}/>} Submit Feedback</button>
    </div>
  );
};

/* ─── Loyalty Display ────────────────────────────────────────────────────────── */
const LoyaltyDisplay = ({ profile }) => {
  const tier = profile?.loyalty_tier||'Bronze';
  const tc   = TIER_CONFIG[tier]||TIER_CONFIG.Bronze;
  const pts  = profile?.loyalty_points||0;
  const benefits = profile?.tier_benefits||{};
  const allTiers = ['Bronze','Silver','Gold','Platinum'];
  return (
    <div className="space-y-5">
      <div className={`rounded-2xl border ${tc.border} ${tc.bg} p-5 text-center overflow-hidden`}>
        <p className="text-text-muted text-xs uppercase tracking-widest mb-2">Your Points</p>
        <motion.p key={pts} initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} className={`text-5xl sm:text-6xl font-black ${tc.color}`}>{pts.toLocaleString()}</motion.p>
        <p className={`text-sm font-bold mt-1 ${tc.color}`}>{tier} Member</p>
        {benefits.nextTier&&<p className="text-text-muted text-xs mt-3">{benefits.pointsNeeded>0?`${benefits.pointsNeeded} pts to reach ${benefits.nextTier}`:`You've reached ${tier}!`}</p>}
        {benefits.discount>0&&<div className="mt-4 inline-block px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-bold">{benefits.discount}% discount active on all orders</div>}
      </div>
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {allTiers.map(t=>{ const cfg=TIER_CONFIG[t]; const active=t===tier; const pointMap={Bronze:0,Silver:500,Gold:2000,Platinum:5000}; return (
          <div key={t} className={`rounded-xl border p-2 sm:p-3 text-center transition-all overflow-hidden ${active?`${cfg.border} ${cfg.bg}`:'border-white/5 bg-white/2 opacity-50'}`}>
            <p className={`text-[10px] sm:text-xs font-black uppercase truncate ${active?cfg.color:'text-text-muted'}`}>{t}</p>
            <p className="text-[8px] sm:text-[9px] text-text-muted mt-1">{pointMap[t].toLocaleString()} pts</p>
            {active&&<div className="w-2 h-2 rounded-full bg-primary mx-auto mt-1.5"/>}
          </div>
        );})}
      </div>
      <div className="bg-white/3 border border-white/8 rounded-xl p-4 sm:p-5">
        <p className="text-sm font-bold text-white mb-3">How to Earn Points</p>
        <div className="space-y-2 text-xs text-text-muted">
          {[['Every $1 spent','+10 pts'],['Write feedback','+50 pts'],['Birthday bonus','+200 pts'],['Refer a friend','+500 pts']].map(([l,v])=>(<div key={l} className="flex justify-between gap-2"><span>{l}</span><span className="text-primary font-bold flex-shrink-0">{v}</span></div>))}
        </div>
      </div>
    </div>
  );
};

/* ─── Popular Now ────────────────────────────────────────────────────────────── */
const PopularNow = ({ onAddToCart }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { menuAPI.getAll({ available:'true' }).then(r=>{ const sorted=(r.data||[]).sort((a,b)=>parseFloat(b.rating)-parseFloat(a.rating)).slice(0,4); setItems(sorted); }).catch(()=>{}).finally(()=>setLoading(false)); }, []);
  if (loading) return <div className="flex justify-center py-6"><Loader size={20} className="animate-spin text-primary" /></div>;
  if (!items.length) return <EmptyState icon={TrendingUp} text="Menu data loading…" />;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {items.map(item=>(
        <div key={item.id} className="bg-white/3 border border-white/8 rounded-xl p-3 sm:p-4 flex flex-col gap-2 hover:border-primary/30 transition-all overflow-hidden group">
          <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform">{item.image_emoji||'🍽️'}</span>
          <p className="font-bold text-white text-sm truncate">{item.name}</p>
          <div className="flex items-center gap-1 text-[10px] text-text-muted flex-wrap"><span className="flex items-center gap-0.5"><Star size={10} className="text-yellow-400 fill-yellow-400" /> {item.rating}</span><span className="truncate">· {item.category}</span></div>
          <div className="flex items-center justify-between mt-auto gap-1"><p className="text-primary font-bold text-sm">{fmt(item.price)}</p><button onClick={()=>onAddToCart(item)} className="px-2 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap flex-shrink-0">+ Add</button></div>
        </div>
      ))}
    </div>
  );
};

/* ─── MAIN PAGE ──────────────────────────────────────────────────────────────── */
const CustomerDashboardPage = () => {
  const { user, logout }  = useAuth();
  const { cart, total, addToCart, updateQuantity, removeFromCart } = useCart();
  const navigate          = useNavigate();

  const [profile,          setProfile]          = useState(null);
  const [orderHistory,     setOrderHistory]      = useState([]);
  const [activeOrder,      setActiveOrder]       = useState(null);
  const [recommendations,  setRecommendations]   = useState([]);
  const [offers,           setOffers]            = useState([]);
  const [loadingProfile,   setLoadingProfile]    = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (user.role !== 'customer') { navigate('/dashboard'); return; }
  }, [user]);

  const loadAll = useCallback(async () => {
    if (!user || user.role !== 'customer') return;
    try {
      const [prof,hist,active,recs,offrs] = await Promise.allSettled([
        customerDashboardAPI.getProfile(),
        customerDashboardAPI.getOrderHistory(),
        customerDashboardAPI.getActiveOrder(),
        customerDashboardAPI.getRecommendations(),
        customerDashboardAPI.getOffers(),
      ]);
      if (prof.status   ==='fulfilled') setProfile(prof.value.data);
      if (hist.status   ==='fulfilled') setOrderHistory(hist.value.data||[]);
      if (active.status ==='fulfilled') setActiveOrder(active.value.data);
      if (recs.status   ==='fulfilled') setRecommendations(recs.value.data||[]);
      if (offrs.status  ==='fulfilled') setOffers(offrs.value.data||[]);
    } catch(e) { console.error(e); }
    finally { setLoadingProfile(false); }
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh active order every 15s
  useEffect(() => {
    if (!activeOrder || ['paid','cancelled'].includes(activeOrder?.status)) return;
    const t = setInterval(async () => {
      try { const r = await customerDashboardAPI.getActiveOrder(); setActiveOrder(r.data); } catch {}
    }, 15000);
    return () => clearInterval(t);
  }, [activeOrder]);

  const handleReorder = (items) => {
    items.forEach(item => addToCart({ id:item.menu_item_id||Math.random(), name:item.menu_item_name, price:parseFloat(item.unit_price), quantity:1 }));
    navigate('/cart');
  };

  if (!user || user.role !== 'customer') return null;

  if (loadingProfile) return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center">
      <div className="text-center"><Loader size={40} className="text-primary animate-spin mx-auto mb-4" /><p className="text-text-muted text-sm">Loading your dashboard…</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-main text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-20 space-y-4 sm:space-y-6 w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pt-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-white">My Dashboard</h1>
            <p className="text-text-muted text-sm mt-0.5 hidden sm:block">{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'America/New_York'})}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button onClick={loadAll} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted hover:text-primary transition-all"><RefreshCw size={14} /></button>
            <button onClick={()=>{ logout(); navigate('/'); }} className="px-3 sm:px-4 py-2 border border-white/10 rounded-xl text-xs font-bold text-text-muted hover:border-red-500/30 hover:text-red-400 transition-all whitespace-nowrap">Sign Out</button>
          </div>
        </div>

        {/* 1. Overview */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.05}}><CustomerOverview profile={profile} /></motion.div>

        {/* 2. Quick Actions */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.1}}>
          <Section title="Quick Actions" icon={Flame}><QuickActions navigate={navigate} cartCount={cart.length} lastOrder={orderHistory[0]} /></Section>
        </motion.div>

        {/* 3. Animated Order Tracking */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.15}}>
          <Section title="Live Order Tracking" icon={MapPin}
            action={activeOrder&&<button onClick={loadAll} className="text-xs text-primary hover:underline flex items-center gap-1"><RefreshCw size={11} /> Refresh</button>}>
            <OrderTracker order={activeOrder} />
          </Section>
        </motion.div>

        {/* 4. My Reservations */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.18}}>
          <Section title="My Reservations" icon={Calendar}
            action={<a href="/reservations" className="text-xs text-primary hover:underline flex items-center gap-1">Book Table <ChevronRight size={11}/></a>}>
            <MyReservations user={user} />
          </Section>
        </motion.div>

        {/* 5+6. Recommendations & Offers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.2}}>
            <Section title="Recommended For You" icon={Sparkles}><Recommendations items={recommendations} onAddToCart={addToCart} /></Section>
          </motion.div>
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.25}}>
            <Section title="Your Offers" icon={Tag}><ActiveOffers offers={offers} /></Section>
          </motion.div>
        </div>

        {/* 7. Cart */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.3}}>
          <Section title={`Cart (${cart.length})`} icon={ShoppingCart}
            action={cart.length>0&&<button onClick={()=>navigate('/checkout')} className="text-xs text-primary hover:underline flex items-center gap-1">Checkout <ChevronRight size={11}/></button>}>
            <CartSnapshot cart={cart} total={total} updateQuantity={updateQuantity} removeFromCart={removeFromCart} navigate={navigate} />
          </Section>
        </motion.div>

        {/* 8. Order History */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.35}}>
          <Section title="Order History" icon={Clock}
            action={<button onClick={()=>navigate('/history')} className="text-xs text-primary hover:underline flex items-center gap-1">View all <ChevronRight size={11}/></button>}>
            <OrderHistory orders={orderHistory} onReorder={handleReorder} />
          </Section>
        </motion.div>

        {/* 9+10. Loyalty + Feedback */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.4}}>
            <Section title="Loyalty & Rewards" icon={Award}><LoyaltyDisplay profile={profile} /></Section>
          </motion.div>
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.45}}>
            <Section title="Quick Feedback" icon={MessageSquare}><FeedbackWidget user={user} /></Section>
          </motion.div>
        </div>

        {/* 11. Popular Now */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.5}}>
          <Section title="Popular Right Now" icon={TrendingUp}><PopularNow onAddToCart={addToCart} /></Section>
        </motion.div>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;