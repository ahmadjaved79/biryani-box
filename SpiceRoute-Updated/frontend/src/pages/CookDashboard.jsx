import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChefHat, Clock, CheckCircle2, AlertCircle, Flame, Bell,
  Package, LogOut, RefreshCw, Star, Utensils,
  TrendingUp, Minus, X, UserCheck, Menu as MenuIcon,
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
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className={`border rounded-xl p-5 bg-bg-main/80 ${cfg.color}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${cfg.dot} animate-pulse`} />
          <div>
            <p className="font-bold text-white text-sm uppercase tracking-wider">
              {order.table_number ? `Table ${order.table_number}` : order.order_type?.toUpperCase()}
            </p>
            <p className="text-xs text-text-muted truncate max-w-[120px]">{order.id}</p>
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
      <div className="space-y-2 mb-4">
        {items.map((item, i) => {
          const itemName = item.menu_item_name || item.name;
          const cookStatus = item.cook_status || 'pending';
          return (
            <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg flex-shrink-0">{item.menu_items?.image_emoji || '🍽️'}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{itemName}</p>
                  {item.special_request && <p className="text-xs text-yellow-400">⚠ {item.special_request}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-primary font-bold text-sm">×{item.quantity}</span>
                {order.status === 'preparing' && (
                  <button onClick={() => onItemReady(order.id, item.id, cookStatus === 'ready' ? 'pending' : 'ready')}
                    className={`text-xs px-2 py-1 rounded font-bold transition-all ${cookStatus === 'ready' ? 'bg-green-500 text-white' : 'bg-white/10 text-text-muted hover:bg-green-500/20 hover:text-green-400'}`}>
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
      <div className="flex gap-2">
        {(order.status === 'pending' || order.status === 'confirmed') && (
          <button onClick={() => onStartCooking(order.id)}
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all">
            <Flame size={14} /> {order.status === 'confirmed' ? 'Begin Prep' : 'Start Cooking'}
          </button>
        )}
        {order.status === 'preparing' && (
          <button onClick={() => onMarkReady(order.id)}
            className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all">
            <CheckCircle2 size={14} /> Mark Ready
          </button>
        )}
        {order.status === 'ready' && (
          <div className="flex-1 py-2.5 bg-green-500/20 border border-green-500/40 text-green-400 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
            <CheckCircle2 size={14} /> Ready for Service
          </div>
        )}
      </div>
    </motion.div>
  );
};

const UseIngredientModal = ({ ingredient, onClose, onUse }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const handleUse = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    if (val > parseFloat(ingredient.stock)) { alert('Amount exceeds available stock!'); return; }
    setLoading(true);
    await onUse(ingredient.id, val);
    setLoading(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-bg-main border border-white/10 rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold">Use Ingredient</h3>
          <button onClick={onClose}><X size={18} className="text-text-muted hover:text-white" /></button>
        </div>
        <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 mb-4">
          <p className="text-white font-bold">{ingredient.name}</p>
          <p className="text-text-muted text-xs mt-0.5">
            Available: <span className="text-white font-bold">{parseFloat(ingredient.stock).toFixed(1)} {ingredient.unit}</span>
            {' '}· Min: <span className={parseFloat(ingredient.stock) <= parseFloat(ingredient.min_stock) ? 'text-red-400 font-bold' : 'text-text-muted'}>{ingredient.min_stock} {ingredient.unit}</span>
          </p>
        </div>
        <div className="mb-4">
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Amount Used ({ingredient.unit})</label>
          <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0.00" autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-white/10 rounded-xl text-xs font-bold text-text-muted hover:bg-white/5">Cancel</button>
          <button onClick={handleUse} disabled={loading || !amount || parseFloat(amount) <= 0}
            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? '...' : <><Minus size={14} /> Confirm Use</>}
          </button>
        </div>
      </motion.div>
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
  const [useModal, setUseModal] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeShift, setActiveShift] = useState(null);
  const [shiftLoading, setShiftLoading] = useState(false);

  const showAlert = (msg, type = 'success') => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const fetchQueue = useCallback(async () => {
    try { const res = await ordersAPI.getCookQueue(); setActiveQueue(res.data); } catch (e) { console.error(e); }
  }, []);
  const fetchCompletedCount = useCallback(async () => {
    try { const res = await ordersAPI.getAll({ status: 'ready' }); setCompletedToday(res.data.length); } catch {}
  }, []);
  const fetchIngredients = useCallback(async () => {
    try { const res = await ingredientsAPI.getAll(); setIngredients(res.data); } catch {}
  }, []);
  const fetchNotifications = useCallback(async () => {
    try { const res = await notificationsAPI.getAll(); setNotifications(res.data.filter(n => !n.is_read)); } catch {}
  }, []);
  const fetchMyShift = useCallback(async () => {
    try { const res = await shiftsAPI.getMy(); const open = (res.data || []).find(s => !s.clock_out); setActiveShift(open || null); } catch {}
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchQueue(), fetchCompletedCount(), fetchIngredients(), fetchNotifications(), fetchMyShift()]);
      setLoading(false);
    };
    init();
    const interval = setInterval(fetchQueue, 15000);
    return () => clearInterval(interval);
  }, []);

  useSocket(user?.role, {
    'new-order-received': (data) => { showAlert(`New order: ${data.id || ''}`, 'info'); fetchQueue(); },
    'order-status-changed': () => fetchQueue(),
  });

  const handleStartCooking = async (orderId) => {
    try { await ordersAPI.updateStatus(orderId, 'preparing'); setActiveQueue(prev => prev.map(o => o.id === orderId ? { ...o, status: 'preparing' } : o)); showAlert('Started cooking!'); }
    catch { showAlert('Failed to update status', 'error'); }
  };
  const handleMarkReady = async (orderId) => {
    try { await ordersAPI.updateStatus(orderId, 'ready'); setActiveQueue(prev => prev.filter(o => o.id !== orderId)); setCompletedToday(c => c + 1); showAlert('Order marked ready!'); }
    catch { showAlert('Failed to update status', 'error'); }
  };
  const handleItemReady = async (orderId, itemId, cook_status) => {
    try {
      await ordersAPI.updateItemStatus(orderId, itemId, cook_status);
      setActiveQueue(prev => prev.map(o => o.id !== orderId ? o : { ...o, order_items: (o.order_items || []).map(i => i.id === itemId ? { ...i, cook_status } : i) }));
    } catch { console.error('item status failed'); }
  };
  const handleUseIngredient = async (id, amount) => {
    try {
      const res = await ingredientsAPI.use(id, amount);
      setIngredients(prev => prev.map(i => i.id === id ? { ...i, stock: res.data.stock, needs_reorder: res.data.needs_reorder } : i));
      if (res.data.needs_reorder) showAlert(`⚠️ Low stock — manager notified!`, 'info');
      else showAlert('Stock updated!');
    } catch (e) { showAlert(e.response?.data?.error || 'Failed', 'error'); }
  };
  const handleClockIn = async () => {
    setShiftLoading(true);
    try { const res = await shiftsAPI.clockIn(); setActiveShift(res.data); showAlert('Clocked in! Have a great shift 👨‍🍳'); }
    catch (e) { showAlert(e.response?.data?.error || 'Clock in failed', 'error'); }
    setShiftLoading(false);
  };
  const handleClockOut = async () => {
    if (!activeShift) return;
    setShiftLoading(true);
    try { await shiftsAPI.clockOut(activeShift.id, ''); setActiveShift(null); showAlert('Clocked out! Great work today.'); }
    catch (e) { showAlert(e.response?.data?.error || 'Clock out failed', 'error'); }
    setShiftLoading(false);
  };

  const filteredQueue = filter === 'all' ? activeQueue : activeQueue.filter(o => o.status === filter);
  const lowStock = ingredients.filter(i => i.needs_reorder || parseFloat(i.stock) <= parseFloat(i.min_stock));
  const tabs = [
    { id: 'queue',       label: 'Order Queue',  icon: Utensils,  badge: activeQueue.length },
    { id: 'ingredients', label: 'Ingredients',  icon: Package,   badge: lowStock.length },
    { id: 'shift',       label: 'My Shift',     icon: UserCheck, badge: null },
    { id: 'history',     label: 'Stats Today',  icon: Star,      badge: null },
  ];

  if (loading) return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center">
      <div className="text-center">
        <ChefHat size={48} className="text-primary mx-auto mb-4 animate-pulse" />
        <p className="text-white font-bold text-lg">Loading Kitchen Dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-main text-white">
      <AnimatePresence>
        {alert && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
            className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl font-bold text-sm shadow-xl ${alert.type === 'error' ? 'bg-red-500' : alert.type === 'info' ? 'bg-blue-500' : 'bg-green-500'} text-white`}>
            {alert.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {useModal && <UseIngredientModal ingredient={useModal} onClose={() => setUseModal(null)} onUse={handleUseIngredient} />}
      </AnimatePresence>

      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-screen w-64 bg-bg-main border-r border-white/5 flex flex-col z-40 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <div className="flex items-center gap-3 bg-primary/10 p-3 rounded-xl border border-primary/20 flex-1">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0"><ChefHat size={18} className="text-white" /></div>
            <div><p className="text-white font-bold text-sm">SPICE ROUTE</p><p className="text-primary text-[9px] font-bold uppercase tracking-widest">Kitchen</p></div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-white/30 hover:text-white flex-shrink-0"><X size={16} /></button>
        </div>

        <div className="px-4 py-2 border-b border-white/5">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${activeShift ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-white/5 border border-white/10 text-white/40'}`}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${activeShift ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
            {activeShift ? `Clocked in · ${new Date(activeShift.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 'Not clocked in'}
          </div>
        </div>

        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
            <div className="w-9 h-9 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0"><ChefHat size={18} className="text-orange-400" /></div>
            <div className="min-w-0"><p className="text-white font-bold text-sm truncate">{user?.name || 'Cook'}</p><p className="text-orange-400 text-xs font-bold uppercase">Chef</p></div>
          </div>
        </div>

        <div className="p-3 border-b border-white/5">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 text-center">
              <p className="text-xl font-bold text-orange-400">{activeQueue.length}</p>
              <p className="text-[10px] text-text-muted uppercase">Active</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2.5 text-center">
              <p className="text-xl font-bold text-green-400">{completedToday}</p>
              <p className="text-[10px] text-text-muted uppercase">Done</p>
            </div>
          </div>
          {lowStock.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2 text-center mt-2">
              <p className="text-lg font-bold text-red-400">{lowStock.length}</p>
              <p className="text-[10px] text-text-muted uppercase">Low Stock</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileOpen(false); }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-primary text-white' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}>
              <div className="flex items-center gap-3"><tab.icon size={16} />{tab.label}</div>
              {tab.badge != null && tab.badge > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === tab.id ? 'bg-white/20' : 'bg-primary/20 text-primary'}`}>{tab.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5 space-y-1">
          <button onClick={fetchQueue} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-text-muted hover:text-white hover:bg-white/5 transition-all">
            <RefreshCw size={15} /> Refresh Queue
          </button>
          <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-bg-main/90 backdrop-blur-xl sticky top-0 z-20">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white">
            <MenuIcon size={16} />
          </button>
          <span className="text-white font-bold text-sm">
            {tabs.find(t => t.id === activeTab)?.label || 'Kitchen'}
          </span>
          <span className={`w-2 h-2 rounded-full ${activeShift ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
        </div>

        <div className="flex-1 p-4 lg:p-8">
          {/* Desktop header */}
          <div className="hidden lg:flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">{tabs.find(t => t.id === activeTab)?.label}</h1>
              <p className="text-text-muted text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' })} · EST</p>
            </div>
            <div className="flex items-center gap-3">
              {notifications.length > 0 && (
                <div className="relative">
                  <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted hover:text-white">
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs font-bold uppercase">Kitchen Online</span>
              </div>
            </div>
          </div>

          {/* ORDER QUEUE */}
          {activeTab === 'queue' && (
            <div>
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {['all', 'pending', 'confirmed', 'preparing'].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex-shrink-0 ${filter === f ? 'bg-primary text-white' : 'bg-white/5 text-text-muted hover:text-white border border-white/10'}`}>
                    {f === 'all' ? `All (${activeQueue.length})` : f}
                  </button>
                ))}
              </div>
              {filteredQueue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <ChefHat size={56} className="text-primary/30 mb-4" />
                  <h3 className="text-lg font-bold text-white/50 mb-2">No Orders in Queue</h3>
                  <p className="text-text-muted text-sm">All caught up! Awaiting new orders...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {filteredQueue.map(order => (
                      <OrderCard key={order.id} order={order} onStartCooking={handleStartCooking} onMarkReady={handleMarkReady} onItemReady={handleItemReady} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* INGREDIENTS — USE only (cook decreases stock) */}
          {activeTab === 'ingredients' && (
            <div>
              {lowStock.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5 flex items-center gap-3">
                  <AlertCircle className="text-red-400 flex-shrink-0" size={18} />
                  <div>
                    <p className="text-red-300 font-bold text-sm">{lowStock.length} ingredient(s) are low — manager notified!</p>
                    <p className="text-red-400/60 text-xs mt-0.5">Managers can restock from the main dashboard.</p>
                  </div>
                </div>
              )}
              <p className="text-text-muted text-sm mb-5">Tap <strong className="text-orange-400">Use Ingredient</strong> to decrease stock when you use items. Low stock alerts fire automatically to managers.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {ingredients.map(ing => {
                  const isLow = parseFloat(ing.stock) <= parseFloat(ing.min_stock);
                  const pct = Math.min(100, (parseFloat(ing.stock) / (parseFloat(ing.min_stock) * 3 || 1)) * 100);
                  return (
                    <div key={ing.id} className={`bg-bg-main border rounded-xl p-5 ${isLow ? 'border-red-500/40' : 'border-white/10'}`}>
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{ing.name}</p>
                          <p className="text-text-muted text-xs mt-0.5">{ing.unit}</p>
                        </div>
                        {isLow && <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-full font-bold flex-shrink-0 whitespace-nowrap">⚠ LOW</span>}
                      </div>
                      <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span className={`font-bold ${isLow ? 'text-red-400' : 'text-green-400'}`}>{parseFloat(ing.stock).toFixed(1)} {ing.unit}</span>
                          <span className="text-text-muted">Min: {ing.min_stock} {ing.unit}</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${isLow ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <button onClick={() => setUseModal(ing)} disabled={parseFloat(ing.stock) <= 0}
                        className="w-full py-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                        <Minus size={14} /> Use Ingredient
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SHIFT TAB */}
          {activeTab === 'shift' && (
            <div className="max-w-md mx-auto">
              <div className="bg-white/3 border border-white/10 rounded-2xl p-6 mb-5 text-center">
                <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ChefHat size={36} className="text-orange-400" />
                </div>
                <h2 className="text-xl font-bold text-white">{user?.name}</h2>
                <p className="text-orange-400 text-sm font-bold uppercase tracking-widest mt-1">Chef / Cook</p>
              </div>
              <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-5 flex items-center gap-2"><UserCheck size={16} className="text-primary" /> Shift Management</h3>
                {activeShift ? (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-green-400 text-sm font-bold">Currently Clocked In</span>
                      </div>
                      <p className="text-text-muted text-xs">Since {new Date(activeShift.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <button onClick={handleClockOut} disabled={shiftLoading}
                      className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-60">
                      {shiftLoading ? 'Processing...' : 'Clock Out'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
                      <p className="text-text-muted text-sm">Not clocked in</p>
                    </div>
                    <button onClick={handleClockIn} disabled={shiftLoading}
                      className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-60">
                      {shiftLoading ? 'Processing...' : 'Clock In'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STATS */}
          {activeTab === 'history' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <TrendingUp size={56} className="text-primary/30 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">{completedToday} Orders Completed Today</h3>
              <p className="text-text-muted">Great work, chef! Keep it up.</p>
              <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-8 text-left w-full max-w-sm">
                <div className="grid grid-cols-2 gap-6">
                  <div><p className="text-3xl font-bold text-green-400">{completedToday}</p><p className="text-text-muted text-sm">Orders Done</p></div>
                  <div><p className="text-3xl font-bold text-orange-400">{activeQueue.length}</p><p className="text-text-muted text-sm">Still Cooking</p></div>
                  <div><p className="text-3xl font-bold text-blue-400">{completedToday + activeQueue.length}</p><p className="text-text-muted text-sm">Total Today</p></div>
                  <div><p className="text-3xl font-bold text-red-400">{lowStock.length}</p><p className="text-text-muted text-sm">Low Stock Items</p></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookDashboard;