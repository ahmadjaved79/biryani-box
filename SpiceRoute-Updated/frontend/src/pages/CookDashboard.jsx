import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChefHat, Clock, CheckCircle2, AlertCircle, Flame, Bell, Minus, X,
  Package, LogOut, RefreshCw, Timer, Star, Utensils,
  TrendingUp, Coffee, Zap, Eye
} from 'lucide-react';
import { useAuth } from '../context/useContextHooks';
import { useNavigate } from 'react-router-dom';
import { ordersAPI, ingredientsAPI, notificationsAPI, shiftsAPI } from '../api/index.js';
import { useSocket } from '../api/socket.js';

const statusConfig = {
  pending:   { label: 'Incoming',  color: 'border-yellow-500 text-yellow-400 bg-yellow-500/10', dot: 'bg-yellow-400' },
  confirmed: { label: 'Confirmed', color: 'border-blue-500 text-blue-400 bg-blue-500/10',       dot: 'bg-blue-400' },
  preparing: { label: 'Cooking',   color: 'border-orange-500 text-orange-400 bg-orange-500/10', dot: 'bg-orange-400' },
  ready:     { label: 'Ready',     color: 'border-green-500 text-green-400 bg-green-500/10',     dot: 'bg-green-400' },
};

const TimerDisplay = ({ createdAt }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [createdAt]);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const urgent = mins >= 15;
  return (
    <span className={`font-mono text-sm font-bold ${urgent ? 'text-red-400 animate-pulse' : 'text-text-muted'}`}>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  );
};

const OrderCard = ({ order, onStartCooking, onMarkReady, onItemReady }) => {
  const cfg = statusConfig[order.status] || statusConfig.pending;
  const items = order.order_items || order.items || [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`border rounded-xl p-5 bg-bg-main/80 ${cfg.color}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${cfg.dot} animate-pulse`} />
          <div>
            <p className="font-bold text-white text-sm uppercase tracking-wider">
              {order.table_number ? `Table ${order.table_number}` : order.order_type?.toUpperCase()}
            </p>
            <p className="text-xs text-text-muted">{order.id}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${cfg.color}`}>{cfg.label}</span>
          <div className="flex items-center gap-1 mt-1 justify-end">
            <Clock size={12} className="text-text-muted" />
            <TimerDisplay createdAt={order.created_at} />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-4">
        {items.map((item, i) => {
          const itemName = item.menu_item_name || item.name;
          const qty = item.quantity;
          const cookStatus = item.cook_status || 'pending';
          return (
            <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.menu_items?.image_emoji || '🍽️'}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{itemName}</p>
                  {item.special_request && (
                    <p className="text-xs text-yellow-400">⚠ {item.special_request}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold text-sm">×{qty}</span>
                {order.status === 'preparing' && (
                  <button
                    onClick={() => onItemReady(order.id, item.id, cookStatus === 'ready' ? 'pending' : 'ready')}
                    className={`text-xs px-2 py-1 rounded font-bold transition-all ${cookStatus === 'ready' ? 'bg-green-500 text-white' : 'bg-white/10 text-text-muted hover:bg-green-500/20 hover:text-green-400'}`}
                  >
                    {cookStatus === 'ready' ? '✓ Done' : 'Mark Done'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {order.special_instructions && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 mb-4 text-xs text-yellow-300">
          📝 {order.special_instructions}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {order.status === 'pending' && (
          <button
            onClick={() => onStartCooking(order.id)}
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
          >
            <Flame size={14} />
            Start Cooking
          </button>
        )}
        {order.status === 'confirmed' && (
          <button
            onClick={() => onStartCooking(order.id)}
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
          >
            <Flame size={14} />
            Begin Prep
          </button>
        )}
        {order.status === 'preparing' && (
          <button
            onClick={() => onMarkReady(order.id)}
            className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
          >
            <CheckCircle2 size={14} />
            Mark Ready
          </button>
        )}
        {order.status === 'ready' && (
          <div className="flex-1 py-2.5 bg-green-500/20 border border-green-500/40 text-green-400 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
            <CheckCircle2 size={14} />
            Ready for Service
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ─── Clock In / Out widget for Cook sidebar ─── */
const ClockWidget = () => {
  const [activeShift, setActiveShift] = React.useState(null);
  const [loading,     setLoading]     = React.useState(false);

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const r = await shiftsAPI.clockIn();
      setActiveShift(r.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleClockOut = async () => {
    if (!activeShift) return;
    setLoading(true);
    try {
      await shiftsAPI.clockOut(activeShift.id, '');
      setActiveShift(null);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-1">
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 flex items-center gap-1">
        <Clock size={10}/> Shift
      </p>
      {activeShift ? (
        <div className="space-y-1.5">
          <p className="text-green-400 text-[10px] font-bold">
            ✓ Since {new Date(activeShift.clock_in).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
          </p>
          <button onClick={handleClockOut} disabled={loading}
            className="w-full py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold uppercase transition-all disabled:opacity-50">
            {loading ? '...' : 'Clock Out'}
          </button>
        </div>
      ) : (
        <button onClick={handleClockIn} disabled={loading}
          className="w-full py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg text-[10px] font-bold uppercase transition-all disabled:opacity-50">
          {loading ? '...' : 'Clock In'}
        </button>
      )}
    </div>
  );
};


const CookDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeQueue, setActiveQueue] = useState([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [ingredients, setIngredients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('queue');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [useModal, setUseModal] = useState(null);   // ingredient being used
  const [useAmt,   setUseAmt]   = useState('');       // amount to decrease
  const [useLoading, setUseLoading] = useState(false);

  const showAlert = (msg, type = 'success') => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const fetchQueue = useCallback(async () => {
    try {
      const res = await ordersAPI.getCookQueue();
      setActiveQueue(res.data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchCompletedCount = useCallback(async () => {
    try {
      const res = await ordersAPI.getAll({ status: 'ready' });
      setCompletedToday(res.data.length);
    } catch (e) { console.error(e); }
  }, []);

  const fetchIngredients = useCallback(async () => {
    try {
      const res = await ingredientsAPI.getAll();
      setIngredients(res.data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationsAPI.getAll();
      setNotifications(res.data.filter(n => !n.is_read));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchQueue(), fetchCompletedCount(), fetchIngredients(), fetchNotifications()]);
      setLoading(false);
    };
    init();
    const interval = setInterval(fetchQueue, 15000);
    return () => clearInterval(interval);
  }, []);

  // Real-time socket
  useSocket(user?.role, {
    'new-order-received': (data) => {
      showAlert(`New order received: ${data.id || ''}`, 'info');
      fetchQueue();
    },
    'order-status-changed': () => fetchQueue(),
  });

  const handleStartCooking = async (orderId) => {
    try {
      await ordersAPI.updateStatus(orderId, 'preparing');
      setActiveQueue(prev => prev.map(o => o.id === orderId ? { ...o, status: 'preparing' } : o));
      showAlert('Started cooking!');
    } catch { showAlert('Failed to update status', 'error'); }
  };

  const handleMarkReady = async (orderId) => {
    try {
      await ordersAPI.updateStatus(orderId, 'ready');
      setActiveQueue(prev => prev.filter(o => o.id !== orderId));
      setCompletedToday(c => c + 1);
      showAlert('Order marked ready — notified captain!');
    } catch { showAlert('Failed to update status', 'error'); }
  };

  const handleItemReady = async (orderId, itemId, cook_status) => {
    try {
      await ordersAPI.updateItemStatus(orderId, itemId, cook_status);
      setActiveQueue(prev => prev.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          order_items: (o.order_items || []).map(i => i.id === itemId ? { ...i, cook_status } : i)
        };
      }));
    } catch { console.error('item status failed'); }
  };

  const handleUse = async () => {
    if (!useModal || !useAmt || parseFloat(useAmt) <= 0) return;
    setUseLoading(true);
    try {
      const res = await ingredientsAPI.use(useModal.id, parseFloat(useAmt));
      setIngredients(prev => prev.map(i => i.id === useModal.id ? { ...i, stock: res.data.stock, needs_reorder: res.data.needs_reorder } : i));
      showAlert(`Used ${useAmt} ${useModal.unit} of ${useModal.name}`);
      setUseModal(null);
      setUseAmt('');
    } catch (e) {
      showAlert(e.response?.data?.error || 'Failed to update stock', 'error');
    } finally { setUseLoading(false); }
  };

  const filteredQueue = filter === 'all' ? activeQueue : activeQueue.filter(o => o.status === filter);
  const lowStock = ingredients.filter(i => i.needs_reorder || i.stock <= i.min_stock);

  const tabs = [
    { id: 'queue',       label: 'Order Queue',    icon: Utensils, badge: activeQueue.length },
    { id: 'ingredients', label: 'Ingredients',     icon: Package,  badge: lowStock.length },
    { id: 'history',     label: 'Completed Today', icon: Star,     badge: null },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="text-center">
          <ChefHat size={48} className="text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-white font-bold text-lg">Loading Kitchen Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main text-white">
      {/* Alert */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
            className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl font-bold text-sm shadow-xl ${
              alert.type === 'error' ? 'bg-red-500 text-white' :
              alert.type === 'info' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
            }`}
          >
            {alert.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-screen w-64 bg-bg-main border-r border-white/5 flex flex-col z-40">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 bg-primary/10 p-3 rounded-xl border border-primary/20">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <ChefHat size={22} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">SPICE ROUTE</p>
              <p className="text-primary text-xs font-bold uppercase tracking-widest">Kitchen</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
              <ChefHat size={20} className="text-orange-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{user?.name || 'Cook'}</p>
              <p className="text-orange-400 text-xs font-bold uppercase">Chef</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 space-y-3">
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-orange-400">{activeQueue.length}</p>
            <p className="text-xs text-text-muted uppercase tracking-wider">Active Orders</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{completedToday}</p>
            <p className="text-xs text-text-muted uppercase tracking-wider">Done Today</p>
          </div>
          {lowStock.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{lowStock.length}</p>
              <p className="text-xs text-text-muted uppercase tracking-wider">Low Stock</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id ? 'bg-primary text-white' : 'text-text-muted hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <tab.icon size={18} />
                {tab.label}
              </div>
              {tab.badge != null && tab.badge > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === tab.id ? 'bg-white/20' : 'bg-primary/20 text-primary'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 space-y-2">
          {/* Clock In / Out for Cook */}
          <ClockWidget />
          <button onClick={fetchQueue} className="w-full flex items-center gap-2 p-3 rounded-xl text-sm text-text-muted hover:text-white hover:bg-white/5 transition-all">
            <RefreshCw size={16} />Refresh Queue
          </button>
          <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center gap-2 p-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={16} />Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {activeTab === 'queue' ? '🍳 Kitchen Queue' : activeTab === 'ingredients' ? '📦 Ingredient Stock' : '✅ Completed Orders'}
            </h1>
            <p className="text-text-muted text-sm mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' })}
              {' '}· EST
            </p>
          </div>
          <div className="flex items-center gap-3">
            {notifications.length > 0 && (
              <div className="relative">
                <button className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted hover:text-white">
                  <Bell size={20} />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs font-bold uppercase">Kitchen Online</span>
            </div>
          </div>
        </div>

        {/* ORDER QUEUE TAB */}
        {activeTab === 'queue' && (
          <div>
            {/* Filter bar */}
            <div className="flex gap-2 mb-6">
              {['all', 'pending', 'confirmed', 'preparing'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    filter === f ? 'bg-primary text-white' : 'bg-white/5 text-text-muted hover:text-white border border-white/10'
                  }`}
                >
                  {f === 'all' ? `All (${activeQueue.length})` : f}
                </button>
              ))}
            </div>

            {filteredQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <ChefHat size={64} className="text-primary/30 mb-4" />
                <h3 className="text-xl font-bold text-white/50 mb-2">No Orders in Queue</h3>
                <p className="text-text-muted">All caught up! Awaiting new orders...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence>
                  {filteredQueue.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStartCooking={handleStartCooking}
                      onMarkReady={handleMarkReady}
                      onItemReady={handleItemReady}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* INGREDIENTS TAB */}
        {activeTab === 'ingredients' && (
          <div>
            {lowStock.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
                <AlertCircle className="text-red-400" size={20} />
                <p className="text-red-300 font-bold">{lowStock.length} ingredient(s) need restocking!</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {ingredients.map(ing => {
                const isLow = ing.stock <= ing.min_stock;
                return (
                  <div
                    key={ing.id}
                    className={`bg-bg-main border rounded-xl p-5 ${isLow ? 'border-red-500/40' : 'border-white/10'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-white">{ing.name}</p>
                        <p className="text-text-muted text-xs mt-0.5">{ing.unit}</p>
                      </div>
                      {isLow && (
                        <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-full font-bold">
                          LOW STOCK
                        </span>
                      )}
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-text-muted mb-1">
                        <span>Stock: {ing.stock} {ing.unit}</span>
                        <span>Min: {ing.min_stock} {ing.unit}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isLow ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, (ing.stock / (ing.min_stock * 3)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => { setUseModal(ing); setUseAmt(''); }}
                      className="w-full py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                    >
                      <Minus size={13}/> Use / Decrease Stock
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* USE INGREDIENT MODAL */}
        {useModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-bg-main border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-bold text-base">Use Ingredient</h3>
                <button onClick={() => setUseModal(null)}><X size={18} className="text-text-muted hover:text-white"/></button>
              </div>

              {/* Ingredient info */}
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <p className="text-white font-bold">{useModal.name}</p>
                <p className="text-text-muted text-sm mt-0.5">
                  Available: <span className={`font-bold ${parseFloat(useModal.stock) <= parseFloat(useModal.min_stock) ? 'text-red-400' : 'text-green-400'}`}>
                    {parseFloat(useModal.stock).toFixed(2)} {useModal.unit}
                  </span>
                </p>
                <p className="text-text-muted text-xs mt-0.5">Min stock: {useModal.min_stock} {useModal.unit}</p>
              </div>

              {/* Quick amounts */}
              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block mb-2">Quick Select</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0.5, 1, 2, 5].map(q => (
                    <button key={q} onClick={() => setUseAmt(String(q))}
                      className={`py-2 rounded-lg text-xs font-bold transition-all border ${useAmt === String(q) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white/5 text-text-muted border-white/10 hover:border-orange-500/50 hover:text-orange-400'}`}>
                      {q} {useModal.unit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual input */}
              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block mb-1">
                  Amount to Use ({useModal.unit})
                </label>
                <input
                  type="number" min="0.01" step="0.01"
                  value={useAmt}
                  onChange={e => setUseAmt(e.target.value)}
                  placeholder="Enter amount..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-text-muted"
                  autoFocus
                />
              </div>

              {/* Low stock warning if it will drop below min */}
              {useAmt && parseFloat(useModal.stock) - parseFloat(useAmt) <= parseFloat(useModal.min_stock) && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                  <AlertCircle size={14} className="text-red-400 flex-shrink-0"/>
                  <p className="text-red-300 text-xs font-bold">
                    This will trigger a LOW STOCK alert to the manager &amp; owner!
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setUseModal(null)}
                  className="flex-1 py-3 border border-white/20 rounded-xl text-xs font-bold text-text-muted hover:bg-white/5">
                  Cancel
                </button>
                <button onClick={handleUse} disabled={!useAmt || parseFloat(useAmt) <= 0 || useLoading}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                  {useLoading ? <><span className="animate-spin">⏳</span> Using...</> : <><Minus size={13}/> Confirm Use</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <TrendingUp size={64} className="text-primary/30 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{completedToday} Orders Completed Today</h3>
            <p className="text-text-muted">Great work, chef! Keep it up.</p>
            <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-8 text-left w-full max-w-md">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-3xl font-bold text-green-400">{completedToday}</p>
                  <p className="text-text-muted text-sm">Orders Done</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-orange-400">{activeQueue.length}</p>
                  <p className="text-text-muted text-sm">Still Cooking</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-400">{completedToday + activeQueue.length}</p>
                  <p className="text-text-muted text-sm">Total Today</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">{lowStock.length}</p>
                  <p className="text-text-muted text-sm">Low Stock Items</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CookDashboard;