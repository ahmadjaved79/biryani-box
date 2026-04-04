import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, MapPin, Phone, Mail, User, Package, CheckCircle2,
  RefreshCw, Loader, LogOut, Navigation, ChevronDown,
  ChevronUp, CreditCard, Banknote, Smartphone, Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useContextHooks';
import { deliveryAPI } from '../api/index.js';

const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const StatusBadge = ({ status }) => {
  const map = {
    confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    preparing: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    ready:     'bg-green-500/20 text-green-400 border-green-500/30',
    served:    'bg-purple-500/20 text-purple-400 border-purple-500/30',
    paid:      'bg-primary/20 text-primary border-primary/30',
  };
  const labels = {
    confirmed: 'Accepted', preparing: 'Preparing',
    ready: 'Ready for Pickup', served: 'Out for Delivery', paid: 'Delivered'
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${map[status] || 'bg-white/10 text-white/50 border-white/10'}`}>
      {labels[status] || status}
    </span>
  );
};

const CustomerContact = ({ order }) => (
  <div className="bg-white/3 border border-white/10 rounded-xl p-4 space-y-3">
    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Customer Details</p>
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
        <User size={16} className="text-primary" />
      </div>
      <p className="font-bold text-white text-sm">{order.customer_name || 'Customer'}</p>
    </div>
    <div className="space-y-2">
      {order.customer_phone && (
        <a href={`tel:${order.customer_phone}`}
          className="flex items-center gap-3 px-3 py-2.5 bg-green-500/10 border border-green-500/20 rounded-xl hover:bg-green-500/20 transition-all group">
          <Phone size={14} className="text-green-400" />
          <span className="text-green-400 font-bold text-sm">{order.customer_phone}</span>
          <span className="ml-auto text-[10px] text-green-400/60 group-hover:text-green-400 font-bold uppercase">Tap to Call</span>
        </a>
      )}
      {order.customer_email && (
        <a href={`mailto:${order.customer_email}`}
          className="flex items-center gap-3 px-3 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all group">
          <Mail size={14} className="text-blue-400" />
          <span className="text-blue-400 text-sm truncate">{order.customer_email}</span>
        </a>
      )}
      {order.delivery_address && (
        <a href={`https://maps.google.com/?q=${encodeURIComponent(order.delivery_address)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl hover:bg-orange-500/20 transition-all group">
          <Navigation size={14} className="text-orange-400" />
          <span className="text-orange-400 text-sm flex-1">{order.delivery_address}</span>
          <span className="text-[10px] text-orange-400/60 group-hover:text-orange-400 font-bold uppercase whitespace-nowrap">Open Maps</span>
        </a>
      )}
    </div>
  </div>
);

const OrderItems = ({ items }) => (
  <div className="space-y-1">
    {(items || []).map((item, i) => (
      <div key={i} className="flex justify-between text-xs">
        <span className="text-white">{item.menu_item_name} <span className="text-text-muted">×{item.quantity}</span></span>
        <span className="text-text-muted">{fmt(item.unit_price * item.quantity)}</span>
      </div>
    ))}
  </div>
);

const AvailableCard = ({ order, onAccept, accepting }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden hover:border-primary/30 transition-all">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-mono font-bold text-primary text-sm">{order.id}</p>
            <p className="text-text-muted text-xs mt-0.5">{fmtTime(order.created_at)}</p>
          </div>
          <div className="text-right">
            <p className="text-white font-black text-lg">{fmt(order.total)}</p>
            <p className="text-text-muted text-[10px]">{order.payment_method?.toUpperCase() || 'COD'}</p>
          </div>
        </div>

        {order.delivery_address && (
          <div className="flex items-start gap-2 mb-3">
            <MapPin size={13} className="text-primary mt-0.5 flex-shrink-0" />
            <p className="text-white text-xs">{order.delivery_address}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-text-muted text-xs hover:text-white transition-all">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {(order.order_items || []).length} items
          </button>
          <button onClick={() => onAccept(order.id)} disabled={accepting === order.id}
            className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold uppercase transition-all disabled:opacity-60">
            {accepting === order.id ? <Loader size={13} className="animate-spin" /> : <Truck size={13} />}
            Accept
          </button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <OrderItems items={order.order_items} />
            {order.special_instructions && (
              <p className="mt-2 text-xs text-yellow-400 bg-yellow-500/10 rounded-lg px-3 py-2">📝 {order.special_instructions}</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ActiveCard = ({ order, onPickedUp, onDelivered, loading }) => {
  const [expanded, setExpanded] = useState(true);
  const [payMethod, setPayMethod] = useState('cash');
  const [showPayModal, setShowPayModal] = useState(false);

  const deliverySteps = [
    { key: 'confirmed', label: 'Accepted' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'ready',     label: 'Ready' },
    { key: 'served',    label: 'On the way' },
    { key: 'paid',      label: 'Delivered' },
  ];
  const currentStep = deliverySteps.findIndex(s => s.key === order.status);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white/3 border border-primary/20 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-mono font-bold text-primary text-sm">{order.id}</p>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-white font-black text-lg">{fmt(order.total)}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center mb-5">
          {deliverySteps.map((step, i) => {
            const done = i <= currentStep;
            const active = i === currentStep;
            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black transition-all
                    ${active ? 'bg-primary shadow-lg shadow-primary/40 scale-110' : done ? 'bg-primary/40' : 'bg-white/10'}`}>
                    {done && !active ? '✓' : i + 1}
                  </div>
                  <p className={`text-[8px] font-bold whitespace-nowrap ${active ? 'text-primary' : done ? 'text-white/50' : 'text-white/20'}`}>
                    {step.label}
                  </p>
                </div>
                {i < deliverySteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-3 mx-1 ${i < currentStep ? 'bg-primary/50' : 'bg-white/10'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <CustomerContact order={order} />

        <button onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-text-muted text-xs hover:text-white transition-all mt-3">
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          Order items
        </button>
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <OrderItems items={order.order_items} />
          </div>
        )}

        <div className="mt-4 space-y-2">
          {order.status === 'ready' && (
            <button onClick={() => onPickedUp(order.id)} disabled={loading === order.id}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {loading === order.id ? <Loader size={14} className="animate-spin" /> : <Package size={14} />}
              Picked Up from Restaurant
            </button>
          )}
          {order.status === 'served' && (
            <button onClick={() => setShowPayModal(true)}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2">
              <CheckCircle2 size={14} /> Mark as Delivered
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showPayModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-white mb-1">Confirm Delivery</h3>
              <p className="text-text-muted text-sm mb-4">Order {order.id} · <span className="text-primary font-bold">{fmt(order.total)}</span></p>
              <p className="text-xs text-text-muted mb-3 font-bold uppercase tracking-wider">Payment Method</p>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { id: 'cash', icon: Banknote,    label: 'Cash' },
                  { id: 'card', icon: CreditCard,  label: 'Card' },
                  { id: 'upi',  icon: Smartphone,  label: 'UPI'  },
                ].map(m => (
                  <button key={m.id} onClick={() => setPayMethod(m.id)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-bold transition-all
                      ${payMethod === m.id ? 'bg-primary text-white border-primary' : 'bg-white/5 border-white/10 text-text-muted hover:border-primary/40'}`}>
                    <m.icon size={16} /> {m.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowPayModal(false)}
                  className="flex-1 py-3 border border-white/20 rounded-xl text-xs font-bold text-text-muted hover:bg-white/5">Cancel</button>
                <button onClick={() => { onDelivered(order.id, payMethod); setShowPayModal(false); }}
                  disabled={loading === order.id}
                  className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading === order.id ? <Loader size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const CompletedCard = ({ order }) => (
  <div className="bg-white/3 border border-white/8 rounded-xl p-4 flex items-center gap-4">
    <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
      <CheckCircle2 size={18} className="text-green-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-mono text-xs font-bold text-primary">{order.id}</p>
      <p className="text-text-muted text-xs truncate">{order.customer_name} · {order.delivery_address}</p>
      <p className="text-text-muted text-[10px]">{fmtDate(order.updated_at)} · {fmtTime(order.updated_at)}</p>
    </div>
    <div className="text-right flex-shrink-0">
      <p className="text-white font-bold text-sm">{fmt(order.total)}</p>
      <p className="text-text-muted text-[10px]">{order.payment_method?.toUpperCase() || 'COD'}</p>
    </div>
  </div>
);

const StatsBar = ({ stats }) => (
  <div className="grid grid-cols-4 gap-3">
    {[
      { label: 'Today',    value: stats.total_today || 0,                    color: 'text-white' },
      { label: 'Done',     value: stats.completed_today || 0,                color: 'text-green-400' },
      { label: 'Active',   value: stats.active || 0,                         color: 'text-primary' },
      { label: 'Earnings', value: `$${stats.earnings_today || '0.00'}`,      color: 'text-yellow-400' },
    ].map((s, i) => (
      <div key={i} className="bg-white/3 border border-white/8 rounded-xl p-3 text-center">
        <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
        <p className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">{s.label}</p>
      </div>
    ))}
  </div>
);

const DeliveryDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('available');
  const [available, setAvailable] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [accepting, setAccepting] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'delivery') { navigate('/login'); return; }
  }, [user]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [avail, mine, done, st] = await Promise.allSettled([
        deliveryAPI.getAvailable(),
        deliveryAPI.getMyOrders(),
        deliveryAPI.getCompleted(),
        deliveryAPI.getStats(),
      ]);
      if (avail.status === 'fulfilled') setAvailable(avail.value.data || []);
      if (mine.status === 'fulfilled') setMyOrders(mine.value.data || []);
      if (done.status === 'fulfilled') setCompleted(done.value.data || []);
      if (st.status  === 'fulfilled') setStats(st.value.data || {});
      setLastRefresh(new Date());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const handleAccept = async (orderId) => {
    setAccepting(orderId);
    try {
      await deliveryAPI.accept(orderId);
      await loadAll();
      setTab('active');
    } catch (e) { alert(e.response?.data?.error || 'Failed to accept'); }
    finally { setAccepting(null); }
  };

  const handlePickedUp = async (orderId) => {
    setActionLoading(orderId);
    try { await deliveryAPI.pickedUp(orderId); await loadAll(); }
    catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const handleDelivered = async (orderId, payMethod) => {
    setActionLoading(orderId);
    try { await deliveryAPI.delivered(orderId, payMethod); await loadAll(); setTab('completed'); }
    catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  if (!user || user.role !== 'delivery') return null;

  const tabs = [
    { id: 'available', label: 'Available', count: available.length },
    { id: 'active',    label: 'Active',    count: myOrders.length },
    { id: 'completed', label: 'Completed', count: completed.length },
  ];

  return (
    <div className="min-h-screen bg-bg-main text-white">
      {/* Header */}
      <div className="bg-[#0d0d0d] border-b border-white/8 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Truck size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Delivery Hub</p>
            <p className="text-text-muted text-[10px]">{user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <p className="text-text-muted text-[10px] hidden sm:block">Updated {fmtTime(lastRefresh)}</p>
          )}
          <button onClick={loadAll} disabled={loading}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-text-muted hover:text-white transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-text-muted hover:text-red-400 transition-all">
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <StatsBar stats={stats} />

        {available.length > 0 && tab !== 'available' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 cursor-pointer"
            onClick={() => setTab('available')}>
            <Bell size={16} className="text-primary animate-pulse" />
            <p className="text-primary text-sm font-bold">
              {available.length} new order{available.length > 1 ? 's' : ''} available!
            </p>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5
                ${tab === t.id ? 'bg-primary text-white' : 'text-text-muted hover:text-white'}`}>
              {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full
                  ${tab === t.id ? 'bg-white/20' : 'bg-primary/20 text-primary'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">  
          {tab === 'available' && (
            <motion.div key="available" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {available.length === 0 ? (
                <div className="text-center py-16">
                  <Package size={40} className="text-white/10 mx-auto mb-3" />
                  <p className="text-text-muted text-sm">No delivery orders available right now</p>
                  <p className="text-text-muted text-xs mt-1">Auto-refreshes every 30 seconds</p>
                </div>
              ) : available.map(order => (
                <AvailableCard key={order.id} order={order} onAccept={handleAccept} accepting={accepting} />
              ))}
            </motion.div>
          )}

          {tab === 'active' && (
            <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {myOrders.length === 0 ? (
                <div className="text-center py-16">
                  <Truck size={40} className="text-white/10 mx-auto mb-3" />
                  <p className="text-text-muted text-sm">No active deliveries</p>
                </div>
              ) : myOrders.map(order => (
                <ActiveCard key={order.id} order={order}
                  onPickedUp={handlePickedUp} onDelivered={handleDelivered} loading={actionLoading} />
              ))}
            </motion.div>
          )}

          {tab === 'completed' && (
            <motion.div key="completed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {completed.length === 0 ? (
                <div className="text-center py-16">
                  <CheckCircle2 size={40} className="text-white/10 mx-auto mb-3" />
                  <p className="text-text-muted text-sm">No completed deliveries yet</p>
                </div>
              ) : (
                <>
                  <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Recent Deliveries</p>
                  {completed.map(order => <CompletedCard key={order.id} order={order} />)}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DeliveryDashboard;