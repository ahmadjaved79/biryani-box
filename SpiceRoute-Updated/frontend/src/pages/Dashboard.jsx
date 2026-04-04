import StaffManagement from '../components/StaffManagement.jsx';
import {
  staffAPI, menuAPI, ingredientsAPI, feedbackAPI, ordersAPI,  // add ordersAPI
  announcementsAPI, shiftsAPI, paymentsAPI, wasteAPI, analyticsAPI
} from '../api/index.js';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
const MotionDiv = motion.div;
import {
  LayoutDashboard, ShoppingCart, Utensils, Users, LogOut, Plus, Trash2,
  Bell, Monitor, Command, PieChart, ShoppingBag as OrderIcon, Target, Award,
  BarChart3, TrendingDown, Calendar, DollarSign, Flame, Eye, ChefHat,
  Clock, CheckCircle2, AlertCircle, FileText, Edit2, X, Save, RefreshCw,
  MessageSquare, TrendingUp, Package, CreditCard, Megaphone, Loader,
  UserCheck, ClipboardList, Star, Filter, Search
} from 'lucide-react';
import { useAuth, useOrders } from '../context/useContextHooks';
import { useNavigate } from 'react-router-dom';
import POS from '../components/POS';

import { useSocket } from '../api/socket.js';

/* ─────────────── SIDEBAR ─────────────── */
const Sidebar = ({ activeTab, setActiveTab, user, unreadCount }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const allItems = [
    { id: 'overview',       label: 'Command Hub',     icon: PieChart,       roles: ['owner','manager'] },
    { id: 'pos',            label: 'Order Booking',   icon: OrderIcon,      roles: ['owner','manager','captain'] },
    { id: 'orders',         label: 'Live Orders',     icon: Monitor,        roles: ['owner','manager','captain'] },
    { id: 'menu',           label: 'Menu Master',     icon: FileText,       roles: ['owner','manager'] },
    { id: 'inventory',      label: 'Inventory',       icon: Package,        roles: ['owner','manager'] },
    { id: 'tables',         label: 'Table Status',    icon: LayoutDashboard,roles: ['owner','manager','captain'] },
    { id: 'reservations',   label: 'Reservations',    icon: Calendar,       roles: ['owner','manager','captain'] },
    { id: 'feedback',       label: 'Feedback Box',    icon: MessageSquare,  roles: ['owner','manager'] },
    { id: 'announcements',  label: 'Announcements',   icon: Megaphone,      roles: ['owner','manager'] },
    { id: 'payments',       label: 'Payments',        icon: CreditCard,     roles: ['owner','manager'] },
    { id: 'shifts',         label: 'Shift Logs',      icon: UserCheck,      roles: ['owner','manager'] },
    { id: 'staff', label: 'Staff Management', icon: Users, roles: ['owner','manager'] },
  ];

  const items = allItems.filter(i => i.roles.includes(user.role));

  return (
    <div className="w-64 bg-bg-main border-r border-white/5 h-screen fixed left-0 top-0 flex flex-col z-50 overflow-y-auto">
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3 bg-primary/10 p-3 rounded-xl border border-primary/20">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center"><Command size={18} className="text-white" /></div>
          <div><p className="text-white font-bold text-sm">SPICE ROUTE</p><p className="text-primary text-[10px] font-bold uppercase tracking-widest">SYSTEM.v2</p></div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-1">
        {items.map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl text-xs font-bold transition-all ${activeTab === item.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}>
            <div className="flex items-center gap-3">
              <item.icon size={16} className={activeTab === item.id ? 'text-white' : 'text-primary/70'} />
              {item.label}
            </div>
            {item.id === 'feedback' && unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-white/5">
        <div className="bg-white/5 rounded-xl p-3 mb-2 text-xs text-text-muted">
          <p className="font-bold text-white truncate">{user.name}</p>
          <p className="text-primary uppercase tracking-wider text-[10px]">{user.role}</p>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }}
          className="w-full flex items-center gap-2 p-3 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
};

/* ─────────────── HEADER ─────────────── */
const Header = ({ title, notifications, onMarkAllRead, onRefresh }) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const unread = notifications.filter(n => !n.is_read);

  // ── Click-outside ref for notification dropdown ─────────────────────────────
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    if (showNotifs) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifs]);
  // ───────────────────────────────────────────────────────────────────────────  

  
  return (
    <div className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-bg-main/80 backdrop-blur-xl sticky top-0 z-40">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="flex items-center gap-3">
        <button onClick={onRefresh} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted hover:text-primary transition-all">
          <RefreshCw size={14} />
        </button>
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(s => !s)}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted hover:text-white relative"
          >
            <Bell size={16} />
            {unread.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                {unread.length}
              </span>
            )}
          </button>
          <AnimatePresence>
            {showNotifs && (
              <MotionDiv
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-11 w-80 bg-bg-main border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <p className="text-sm font-bold text-white">Notifications</p>
                  <button
                    onClick={() => { onMarkAllRead(); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                  {notifications.length === 0 ? (
                    <p className="text-text-muted text-xs text-center py-6">No notifications</p>
                  ) : notifications.slice(0, 15).map(n => (
                    <div key={n.id} className={`px-4 py-3 ${!n.is_read ? 'bg-primary/5' : ''}`}>
                      <p className="text-xs font-bold text-white">{n.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-text-muted/50 mt-1">{new Date(n.created_at).toLocaleTimeString()}</p>
                    </div>
                  ))}
                </div>
              </MotionDiv>
            )}
          </AnimatePresence>
        </div>
        <p className="text-xs text-text-muted hidden md:block">
          {new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'America/New_York'})}
        </p>
      </div>
    </div>
  );
};

/* ─────────────── OVERVIEW TAB ─────────────── */
const OverviewTab = ({ orders, dashStats, menu, ingredients, topItems }) => {
  const stats = dashStats?.today || {};
  const cards = [
    { label: "Today's Revenue",  value: `$${(stats.revenue||0).toFixed(2)}`, icon: DollarSign, color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
    { label: 'Total Orders',     value: stats.orders||0,                      icon: OrderIcon,  color: 'text-primary',   bg: 'bg-primary/10',    border: 'border-primary/20' },
    { label: 'Pending / Active', value: stats.pending||0,                     icon: Clock,      color: 'text-yellow-400',bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    { label: 'Month Revenue',    value: `$${(dashStats?.month?.revenue||0).toFixed(0)}`, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  ];
  const lowStock = ingredients.filter(i => parseFloat(i.stock) <= parseFloat(i.min_stock));
  const liveOrders = orders.filter(o => ['pending','confirmed','preparing'].includes(o.status));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c,i) => (
          <div key={i} className={`${c.bg} border ${c.border} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider">{c.label}</p>
              <c.icon size={18} className={c.color} />
            </div>
            <p className={`text-3xl font-black ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Live orders */}
        <div className="lg:col-span-2 bg-white/3 border border-white/10 rounded-2xl p-5">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Flame size={16} className="text-primary" /> Live Orders ({liveOrders.length})</h3>
          {liveOrders.length === 0 ? <p className="text-text-muted text-sm text-center py-8">No active orders</p> : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {liveOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-white">{o.id}</p>
                    <p className="text-xs text-text-muted">{o.table_number ? `Table ${o.table_number}` : o.order_type} · ${parseFloat(o.total).toFixed(2)}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase border ${
                    o.status==='pending'?'border-yellow-500/30 text-yellow-400 bg-yellow-500/10':
                    o.status==='confirmed'?'border-blue-500/30 text-blue-400 bg-blue-500/10':
                    'border-orange-500/30 text-orange-400 bg-orange-500/10'}`}>{o.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts panel */}
        <div className="space-y-4">
          <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2"><AlertCircle size={16} className="text-red-400" /> Low Stock ({lowStock.length})</h3>
            {lowStock.length === 0 ? <p className="text-text-muted text-xs">All stock levels OK</p> : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {lowStock.map(i => (
                  <div key={i.id} className="flex justify-between text-xs bg-red-500/10 rounded-lg px-3 py-2">
                    <span className="text-white font-bold">{i.name}</span>
                    <span className="text-red-400">{i.stock} {i.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Star size={16} className="text-yellow-400" /> Top Items</h3>
            {topItems.length === 0 ? <p className="text-text-muted text-xs">No data yet</p> : (
              <div className="space-y-2">
                {topItems.slice(0,5).map((item,i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-white">{item.name}</span>
                    <span className="text-primary font-bold">{item.count}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────── LIVE ORDERS TAB ─────────────── */
const OrdersTab = ({ orders, updateOrderStatus, deleteOrder, user,claimOrder }) => {
  const [filter, setFilter] = useState('all');
  const [paying, setPaying] = useState(null);
  const [payMethod, setPayMethod] = useState('cash');
  const { paymentsAPI: pAPI } = { paymentsAPI };
  

  const statusColors = {
    pending:   'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
    confirmed: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
    preparing: 'border-orange-500/30 text-orange-400 bg-orange-500/10',
    ready:     'border-green-500/30 text-green-400 bg-green-500/10',
    served:    'border-purple-500/30 text-purple-400 bg-purple-500/10',
    paid:      'border-primary/30 text-primary bg-primary/10',
    cancelled: 'border-red-500/30 text-red-400 bg-red-500/10',
  };
  
  const nextStatus = { pending:'confirmed', confirmed:'preparing', preparing:'ready', ready:'served', served:'paid' };
  const captainVisibleStatuses = ['ready', 'served', 'paid'];
  const isCaptain = user.role === 'captain';
  const baseOrders = isCaptain ? orders.filter(o => captainVisibleStatuses.includes(o.status)) : orders;
  const filters = isCaptain
  ? ['all', 'ready', 'served', 'paid']
  : ['all','pending','confirmed','preparing','ready','served','paid'];
  const filtered = filter === 'all' ? baseOrders : baseOrders.filter(o => o.status === filter);

  const handlePayment = async (order) => {
    try {
      await paymentsAPI.create({ order_id: order.id, amount: order.total, method: payMethod });
      setPaying(null);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${filter===f?'bg-primary text-white':'bg-white/5 text-text-muted border border-white/10 hover:text-white'}`}>
            {f==='all'?`All (${baseOrders.length})`:f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-text-muted">No orders found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const items = order.order_items || order.items || [];
            return (
              <div key={order.id} className="bg-white/3 border border-white/10 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3 gap-4 flex-wrap">
                  <div>
                    <p className="font-bold text-white text-sm">{order.id}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {order.table_number ? `Table ${order.table_number}` : order.order_type}
                      {order.customer_name ? ` · ${order.customer_name}` : ''}
                      {' · '}{new Date(order.created_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',timeZone:'America/New_York'})} EST
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase ${statusColors[order.status]||''}`}>{order.status}</span>
                    <p className="text-primary font-bold">${parseFloat(order.total).toFixed(2)}</p>
                  </div>
                </div>
                 {isCaptain && order.status === 'ready' && (
                 <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2 mb-3 animate-pulse">
                   <span className="text-lg">🍽️</span>
                    <p className="text-green-400 text-xs font-bold uppercase tracking-wider">Food Ready — Collect & Serve</p>
                  </div>
                  )}
                <div className="flex flex-wrap gap-2 text-xs text-text-muted mb-4">
                  {items.map((item,i) => (
                    <span key={i} className="bg-white/5 rounded-lg px-2 py-1">
                      {item.menu_item_name||item.name} ×{item.quantity}
                    </span>
                  ))}
                </div>

                {order.special_instructions && (
                  <p className="text-xs text-yellow-300 bg-yellow-500/10 rounded-lg px-3 py-2 mb-3">📝 {order.special_instructions}</p>
                )}

                <div className="flex gap-2 flex-wrap">
                  {user.role === 'captain' && !order.captain_id && (
  <button onClick={() => claimOrder(order.id)}
    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold uppercase transition-all">
    ✋ Claim Order
  </button>
)}
                  {nextStatus[order.status] && (
                    <button onClick={() => updateOrderStatus(order.id, nextStatus[order.status])}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold uppercase transition-all">
                      → {nextStatus[order.status]}
                    </button>
                  )}
                  {order.status === 'served' && (
                    <button onClick={() => setPaying(order)}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1">
                      <CreditCard size={12} /> Collect Payment
                    </button>
                  )}
                  {['owner','manager'].includes(user.role) && order.status !== 'paid' && (
                    <button onClick={() => deleteOrder(order.id)}
                      className="px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-all">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      {paying && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-main border border-white/10 rounded-2xl p-8 w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-2">Collect Payment</h3>
            <p className="text-text-muted text-sm mb-6">Order {paying.id} · <span className="text-primary font-bold text-lg">${parseFloat(paying.total).toFixed(2)}</span></p>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {['cash','card','upi'].map(m => (
                <button key={m} onClick={() => setPayMethod(m)}
                  className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${payMethod===m?'bg-primary text-white':'bg-white/5 text-text-muted border border-white/10 hover:border-primary'}`}>
                  {m}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPaying(null)} className="flex-1 py-3 border border-white/20 rounded-xl text-xs font-bold text-text-muted hover:bg-white/5">Cancel</button>
              <button onClick={() => handlePayment(paying)} className="flex-1 py-3 bg-green-500 text-white rounded-xl text-xs font-bold uppercase hover:bg-green-600 transition-all">
                Confirm {payMethod.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────── MENU MASTER TAB ─────────────── */
const MenuTab = ({ menu, toggleMenuAvailability, fetchMenu }) => {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = menu.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (adding) await menuAPI.create(form);
      else await menuAPI.update(editing.id, form);
      await fetchMenu();
      setEditing(null); setAdding(false); setForm({});
    } catch(e) { alert(e.response?.data?.error || 'Save failed'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this menu item?')) return;
    await menuAPI.delete(id);
    await fetchMenu();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search menu..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 pl-9 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary" />
        </div>
        <button onClick={() => { setAdding(true); setForm({ name:'', price:'', category:'Biryani', description:'', prep_time:20, spice_level:2, is_veg:false, is_halal:true, image_emoji:'🍽️', is_available:true }); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold uppercase hover:bg-primary-hover transition-all">
          <Plus size={14} /> Add Item
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="bg-white/3 border border-white/10 rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{item.image_emoji||'🍽️'}</span>
                <div>
                  <p className="font-bold text-white text-sm">{item.name}</p>
                  <p className="text-xs text-text-muted">{item.category}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.is_available?'border-green-500/30 text-green-400 bg-green-500/10':'border-red-500/30 text-red-400 bg-red-500/10'}`}>
                {item.is_available ? 'Available' : 'Off'}
              </span>
            </div>
            <p className="text-primary font-bold text-lg mb-1">${parseFloat(item.price).toFixed(2)}</p>
            <p className="text-text-muted text-xs mb-3 line-clamp-2">{item.description}</p>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(item); setForm({...item}); }}
                className="flex-1 py-1.5 bg-white/5 border border-white/10 text-xs font-bold text-white rounded-lg hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-1">
                <Edit2 size={11}/> Edit
              </button>
              <button onClick={() => toggleMenuAvailability(item.id)}
                className="flex-1 py-1.5 bg-white/5 border border-white/10 text-xs font-bold text-text-muted rounded-lg hover:border-yellow-500 hover:text-yellow-400 transition-all">
                Toggle
              </button>
              <button onClick={() => handleDelete(item.id)}
                className="py-1.5 px-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-all">
                <Trash2 size={12}/>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Add Modal */}
      {(editing || adding) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-bg-main border border-white/10 rounded-2xl p-6 w-full max-w-lg my-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">{adding ? 'Add Menu Item' : 'Edit Item'}</h3>
              <button onClick={() => { setEditing(null); setAdding(false); }}><X size={18} className="text-text-muted hover:text-white" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['name','Item Name','text'],['price','Price ($)','number'],['category','Category','text'],['image_emoji','Emoji','text'],['prep_time','Prep Time (min)','number'],['spice_level','Spice Level (1-5)','number']].map(([k,label,type]) => (
                <div key={k}>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">{label}</label>
                  <input type={type} value={form[k]||''} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Description</label>
                <textarea value={form.description||''} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-text-muted">Veg</label>
                <input type="checkbox" checked={!!form.is_veg} onChange={e=>setForm(p=>({...p,is_veg:e.target.checked}))} className="w-4 h-4 accent-primary" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-text-muted">Halal</label>
                <input type="checkbox" checked={!!form.is_halal} onChange={e=>setForm(p=>({...p,is_halal:e.target.checked}))} className="w-4 h-4 accent-primary" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setEditing(null); setAdding(false); }} className="flex-1 py-3 border border-white/20 rounded-xl text-xs font-bold text-text-muted">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 bg-primary text-white rounded-xl text-xs font-bold uppercase hover:bg-primary-hover flex items-center justify-center gap-2">
                {saving ? <Loader size={14} className="animate-spin"/> : <Save size={14}/>} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────── INVENTORY TAB ─────────────── */
const InventoryTab = ({ ingredients, updateIngredientStock, fetchIngredients }) => {
  const [restocking, setRestocking] = useState({});
  const [wastes, setWastes] = useState([]);
  const [wasteForm, setWasteForm] = useState({ ingredient_id:'', quantity:'', reason:'spillage' });
  const [showWaste, setShowWaste] = useState(false);

  useEffect(() => {
    wasteAPI.getToday().then(r => setWastes(r.data)).catch(()=>{});
  }, []);

  const handleRestock = async (id, amount) => {
    try {
      await ingredientsAPI.restock(id, parseFloat(amount));
      await fetchIngredients();
    } catch(e) { console.error(e); }
  };

  const handleLogWaste = async () => {
    if (!wasteForm.ingredient_id || !wasteForm.quantity) return;
    const ing = ingredients.find(i => i.id == wasteForm.ingredient_id);
    try {
      await wasteAPI.log({ ...wasteForm, ingredient_name: ing?.name, unit: ing?.unit });
      await fetchIngredients();
      const r = await wasteAPI.getToday(); setWastes(r.data);
      setWasteForm({ ingredient_id:'', quantity:'', reason:'spillage' });
    } catch(e) { console.error(e); }
  };

  const lowStock = ingredients.filter(i => parseFloat(i.stock) <= parseFloat(i.min_stock));

  return (
    <div className="space-y-6">
      {lowStock.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0" size={18}/>
          <p className="text-red-300 text-sm font-bold">{lowStock.length} ingredient(s) are below minimum stock!</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ingredients.map(ing => {
          const isLow = parseFloat(ing.stock) <= parseFloat(ing.min_stock);
          const pct = Math.min(100, (ing.stock / (ing.min_stock * 3 || 1)) * 100);
          return (
            <div key={ing.id} className={`border rounded-2xl p-4 bg-white/3 ${isLow?'border-red-500/40':'border-white/10'}`}>
              <div className="flex justify-between items-start mb-2">
                <p className="font-bold text-white text-sm">{ing.name}</p>
                {isLow && <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">LOW</span>}
              </div>
              <p className="text-text-muted text-xs mb-2">{ing.stock} {ing.unit} / Min: {ing.min_stock} {ing.unit}</p>
              <div className="h-1.5 bg-white/10 rounded-full mb-3 overflow-hidden">
                <div className={`h-full rounded-full ${isLow?'bg-red-500':'bg-green-500'}`} style={{width:`${pct}%`}}/>
              </div>
              <div className="flex gap-1">
                {[5,10,25,50].map(amt => (
                  <button key={amt} onClick={() => handleRestock(ing.id, amt)}
                    className="flex-1 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 rounded-lg text-[10px] font-bold transition-all">
                    +{amt}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Waste Log */}
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white flex items-center gap-2"><Trash2 size={14} className="text-red-400"/> Today's Waste Log</h3>
          <button onClick={() => setShowWaste(s=>!s)} className="text-xs text-primary font-bold hover:underline">+ Log Waste</button>
        </div>
        {showWaste && (
          <div className="grid md:grid-cols-4 gap-3 mb-4 bg-white/3 border border-white/10 rounded-xl p-4">
            <select value={wasteForm.ingredient_id} onChange={e=>setWasteForm(p=>({...p,ingredient_id:e.target.value}))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
              <option value="">Select ingredient</option>
              {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <input type="number" placeholder="Quantity" value={wasteForm.quantity} onChange={e=>setWasteForm(p=>({...p,quantity:e.target.value}))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"/>
            <select value={wasteForm.reason} onChange={e=>setWasteForm(p=>({...p,reason:e.target.value}))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
              {['expired','overcooked','spillage','quality','other'].map(r=><option key={r} value={r}>{r}</option>)}
            </select>
            <button onClick={handleLogWaste} className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold uppercase hover:bg-red-600">Log</button>
          </div>
        )}
        {wastes.length === 0 ? <p className="text-text-muted text-xs">No waste logged today</p> : (
          <div className="space-y-2">
            {wastes.map(w => (
              <div key={w.id} className="flex items-center justify-between bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2 text-xs">
                <span className="text-white font-bold">{w.ingredient_name}</span>
                <span className="text-text-muted">{w.quantity} {w.unit} · {w.reason}</span>
                <span className="text-text-muted/50">{new Date(w.created_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────── FEEDBACK TAB ─────────────── */
const FeedbackTab = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    feedbackAPI.getAll().then(r => { setFeedbacks(r.data); setLoading(false); }).catch(()=>setLoading(false));
  }, []);

  const handleReply = async () => {
    if (!reply.trim()) return;
    try {
      await feedbackAPI.reply(selected.id, { staff_reply: reply, status: 'resolved', customer_email: selected.customer_email });
      setFeedbacks(prev => prev.map(f => f.id===selected.id ? {...f, staff_reply:reply, status:'resolved'} : f));
      setSelected(null); setReply('');
    } catch(e) { console.error(e); }
  };

  const typeColors = { complaint:'border-red-500/30 text-red-400 bg-red-500/10', suggestion:'border-blue-500/30 text-blue-400 bg-blue-500/10', compliment:'border-green-500/30 text-green-400 bg-green-500/10', general:'border-white/20 text-text-muted bg-white/5' };
  const filtered = filter === 'all' ? feedbacks : feedbacks.filter(f => f.feedback_type === filter || f.status === filter);

  if (loading) return <div className="flex justify-center py-20"><Loader className="animate-spin text-primary" size={32}/></div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['all','complaint','suggestion','compliment','open','resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${filter===f?'bg-primary text-white':'bg-white/5 text-text-muted border border-white/10 hover:text-white'}`}>
            {f}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? <p className="text-center text-text-muted py-16">No feedback yet</p> : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(fb => (
            <div key={fb.id} className="bg-white/3 border border-white/10 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-white text-sm">{fb.customer_name || 'Anonymous'}</p>
                  {fb.customer_email && <a href={`mailto:${fb.customer_email}`} className="text-primary text-xs hover:underline">{fb.customer_email}</a>}
                  {fb.customer_phone && <a href={`tel:${fb.customer_phone}`} className="text-text-muted text-xs block">{fb.customer_phone}</a>}
                  <p className="text-text-muted text-xs">{new Date(fb.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${typeColors[fb.feedback_type]||typeColors.general}`}>{fb.feedback_type}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${fb.status==='resolved'?'border-green-500/30 text-green-400 bg-green-500/10':'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'}`}>{fb.status}</span>
                </div>
              </div>
              {fb.rating && <div className="flex gap-0.5 mb-2">{[1,2,3,4,5].map(s=><Star key={s} size={12} className={s<=fb.rating?'text-yellow-400 fill-yellow-400':'text-white/20'}/>)}</div>}
              {fb.subject && <p className="font-semibold text-white text-sm mb-1">{fb.subject}</p>}
              <p className="text-text-muted text-sm mb-3">{fb.message}</p>
              {fb.staff_reply && <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-xs text-white mb-2"><span className="text-primary font-bold">Reply: </span>{fb.staff_reply}</div>}
              {fb.status !== 'resolved' && (
                <button onClick={() => setSelected(fb)} className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all">Reply</button>
              )}
            </div>
          ))}
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-main border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-white mb-2">Reply to {selected.customer_name}</h3>
            <p className="text-text-muted text-sm mb-4">"{selected.message}"</p>
            <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={4} placeholder="Write your reply..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary resize-none mb-4"/>
            <div className="flex gap-3">
              <button onClick={() => setSelected(null)} className="flex-1 py-3 border border-white/20 rounded-xl text-xs font-bold text-text-muted">Cancel</button>
              <button onClick={handleReply} className="flex-1 py-3 bg-primary text-white rounded-xl text-xs font-bold uppercase hover:bg-primary-hover">Send Reply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────── ANNOUNCEMENTS TAB ─────────────── */
const AnnouncementsTab = ({ user }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({ title:'', message:'', type:'info', target:'all', send_email: false });
  const [saving, setSaving] = useState(false);

  const load = () => announcementsAPI.getAll().then(r => setAnnouncements(r.data)).catch(()=>{});
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.message) return;
    setSaving(true);
    try { await announcementsAPI.create(form); await load(); setForm({ title:'', message:'', type:'info', target:'all' }); }
    catch(e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await announcementsAPI.delete(id); 87-await load();
  };

  const typeColors = { info:'border-blue-500/30 text-blue-400 bg-blue-500/10', promo:'border-green-500/30 text-green-400 bg-green-500/10', special:'border-yellow-500/30 text-yellow-400 bg-yellow-500/10', warning:'border-red-500/30 text-red-400 bg-red-500/10' };

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <h3 className="font-bold text-white mb-4">Create Announcement</h3>
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Title"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"/>
          <div className="flex gap-2">
            <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary">
              {['info','promo','special','warning'].map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.target} onChange={e=>setForm(p=>({...p,target:e.target.value}))} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary">
              {['all','staff','customer'].map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <textarea value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} rows={2} placeholder="Message..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary resize-none mb-3"/>
        <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
        <input type="checkbox" checked={form.send_email} onChange={e=>setForm(p=>({...p,send_email:e.target.checked}))}
         className="accent-primary" />
             Also send email to customers
        </label>
        <button onClick={handleCreate} disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold uppercase hover:bg-primary-hover flex items-center gap-2">
          {saving?<Loader size={12} className="animate-spin"/>:<Megaphone size={12}/>} Publish
        </button>
      </div>
      <div className="space-y-3">
        {announcements.map(a => (
          <div key={a.id} className={`border rounded-2xl p-4 ${typeColors[a.type]||typeColors.info}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-white">{a.title}</p>
                <p className="text-sm mt-1 text-text-muted">{a.message}</p>
                <p className="text-[10px] text-text-muted/50 mt-2">Target: {a.target} · {new Date(a.created_at).toLocaleDateString()}</p>
              </div>
              {user.role === 'owner' && (
                <button onClick={() => handleDelete(a.id)} className="text-red-400 hover:text-red-300 ml-4"><X size={16}/></button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────── SHIFT LOGS TAB ─────────────── */
const ShiftsTab = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setLoading(true);
    shiftsAPI.getAll({ date }).then(r => { setShifts(r.data); setLoading(false); }).catch(()=>setLoading(false));
  }, [date]);

  const totalHours = shifts.reduce((s,sh) => s + (sh.duration_minutes||0)/60, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"/>
        <p className="text-text-muted text-sm">Total: <span className="text-primary font-bold">{totalHours.toFixed(1)} hours</span></p>
      </div>
      {loading ? <div className="flex justify-center py-16"><Loader className="animate-spin text-primary" size={24}/></div> : (
        <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-5 px-5 py-3 bg-white/5 text-[10px] font-bold text-text-muted uppercase tracking-widest">
            <div>Staff</div><div>Role</div><div>Clock In</div><div>Clock Out</div><div>Duration</div>
          </div>
          {shifts.length === 0 ? <p className="text-center text-text-muted py-10 text-sm">No shifts on this date</p> : shifts.map(s => (
            <div key={s.id} className="grid grid-cols-5 px-5 py-4 border-t border-white/5 hover:bg-white/3 text-sm">
              <p className="font-bold text-white">{s.users?.name||'—'}</p>
              <p className="text-primary uppercase text-xs font-bold">{s.users?.role||'—'}</p>
              <p className="text-text-muted">{s.clock_in ? new Date(s.clock_in).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : '—'}</p>
              <p className="text-text-muted">{s.clock_out ? new Date(s.clock_out).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : <span className="text-yellow-400">Active</span>}</p>
              <p className="text-white font-bold">{s.duration_minutes ? `${Math.floor(s.duration_minutes/60)}h ${s.duration_minutes%60}m` : '—'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────── TABLES TAB ─────────────── */
const TablesTab = ({ user }) => {
  const [tables, setTables] = useState([]);
  useEffect(() => {
    import('../api/index.js').then(({ tablesAPI }) => tablesAPI.getAll().then(r=>setTables(r.data)).catch(()=>{}));
  }, []);

  const updateStatus = async (id, status) => {
    const { tablesAPI } = await import('../api/index.js');
    await tablesAPI.updateStatus(id, status);
    setTables(prev => prev.map(t => t.id===id ? {...t, status} : t));
  };

  const statusColors = { available:'border-green-500/30 text-green-400 bg-green-500/10', occupied:'border-red-500/30 text-red-400 bg-red-500/10', reserved:'border-blue-500/30 text-blue-400 bg-blue-500/10', cleaning:'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {tables.map(t => (
        <div key={t.id} className={`border rounded-2xl p-4 text-center cursor-pointer hover:scale-105 transition-all ${statusColors[t.status]||'border-white/10 text-white bg-white/3'}`}>
          <p className="text-2xl font-black mb-1">{t.table_number}</p>
          <p className="text-xs font-bold uppercase mb-2">{t.status}</p>
          <p className="text-[10px] text-text-muted mb-3">Seats {t.capacity}</p>
          {['owner','manager','captain'].includes(user.role) && (
            <select value={t.status} onChange={e=>updateStatus(t.id, e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-primary">
              {['available','occupied','reserved','cleaning'].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
      ))}
    </div>
  );
};

/* ─────────────── RESERVATIONS TAB ─────────────── */
const ReservationsTab = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('../api/index.js').then(({ reservationsAPI }) =>
      reservationsAPI.getAll().then(r=>{setReservations(r.data);setLoading(false);}).catch(()=>setLoading(false))
    );
  }, []);

  const updateStatus = async (id, status) => {
    const { reservationsAPI } = await import('../api/index.js');
    await reservationsAPI.updateStatus(id, status);
    setReservations(prev => prev.map(r => r.id===id ? {...r, status} : r));
  };

  const statusColors = { pending:'bg-yellow-500/10 border-yellow-500/30 text-yellow-400', confirmed:'bg-blue-500/10 border-blue-500/30 text-blue-400', seated:'bg-green-500/10 border-green-500/30 text-green-400', completed:'bg-primary/10 border-primary/30 text-primary', cancelled:'bg-red-500/10 border-red-500/30 text-red-400' };

  if (loading) return <div className="flex justify-center py-16"><Loader className="animate-spin text-primary" size={24}/></div>;

  return (
    <div className="space-y-3">
      {reservations.length === 0 ? <p className="text-center text-text-muted py-16">No reservations found</p> : reservations.map(r => (
        <div key={r.id} className="bg-white/3 border border-white/10 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-bold text-white">{r.customer_name}</p>
              <p className="text-text-muted text-xs mt-0.5">{r.customer_phone} {r.customer_email?`· ${r.customer_email}`:''}</p>
              <div className="flex gap-4 mt-2 text-xs text-text-muted">
                <span><Calendar size={10} className="inline mr-1 text-primary"/>{r.reservation_date}</span>
                <span><Clock size={10} className="inline mr-1 text-primary"/>{r.reservation_time}</span>
                <span><Users size={10} className="inline mr-1 text-primary"/>{r.party_size} guests</span>
              </div>
              {r.special_requests && <p className="text-yellow-300 text-xs mt-1">📝 {r.special_requests}</p>}
              {r.occasion && <p className="text-primary text-xs mt-1">🎉 {r.occasion}</p>}
            </div>
            <div className="flex flex-col gap-2 items-end">
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase ${statusColors[r.status]||'border-white/20 text-text-muted'}`}>{r.status}</span>
              <select value={r.status} onChange={e=>updateStatus(r.id, e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-primary">
                {['pending','confirmed','seated','completed','cancelled','no-show'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─────────────── PROFILE TAB ─────────────── */
const ProfileTab = ({ user }) => {
  const [myShift, setMyShift] = useState(null);
  const [activeShift, setActiveShift] = useState(null);

  const handleClockIn = async () => {
    const r = await shiftsAPI.clockIn();
    setActiveShift(r.data);
  };
  const handleClockOut = async () => {
    if (!activeShift) return;
    await shiftsAPI.clockOut(activeShift.id, '');
    setActiveShift(null);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-8 text-center">
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="" className="w-24 h-24 rounded-full border-4 border-primary mx-auto mb-4"/>
        <h2 className="text-2xl font-bold text-white">{user.name}</h2>
        <p className="text-primary font-bold uppercase tracking-widest text-sm">{user.role}</p>
        <p className="text-text-muted text-sm mt-1">{user.email}</p>
      </div>
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Clock size={14} className="text-primary"/> Shift Management</h3>
        {activeShift ? (
          <div className="space-y-3">
            <p className="text-green-400 text-sm font-bold">✓ Clocked in since {new Date(activeShift.clock_in).toLocaleTimeString()}</p>
            <button onClick={handleClockOut} className="w-full py-3 bg-red-500 text-white rounded-xl text-sm font-bold uppercase hover:bg-red-600 transition-all">Clock Out</button>
          </div>
        ) : (
          <button onClick={handleClockIn} className="w-full py-3 bg-green-500 text-white rounded-xl text-sm font-bold uppercase hover:bg-green-600 transition-all">Clock In</button>
        )}
      </div>
    </div>
  );
};

const claimOrder = async (orderId) => {
  try {
    await ordersAPI.claim(orderId);
    fetchOrders();
  } catch (e) { console.error('claimOrder', e); }
  };
/* ─────────────── MAIN DASHBOARD ─────────────── */
const Dashboard = () => {
  const { user } = useAuth();
  const {
    orders, menu, ingredients, dashStats,
    fetchOrders, fetchMenu, fetchIngredients, fetchDashStats,
    updateOrderStatus, deleteOrder, toggleMenuAvailability,
  } = useOrders();

  const [activeTab, setActiveTab] = useState(user.role === 'captain' ? 'pos' : 'overview');
  const [notifications, setNotifications] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [feedbackCount, setFeedbackCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      const { notificationsAPI } = await import('../api/index.js');
      const r = await notificationsAPI.getAll();
      setNotifications(r.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchOrders(); fetchMenu(); fetchIngredients();
    if (['owner','manager'].includes(user.role)) {
      fetchDashStats();
      analyticsAPI.getTopItems().then(r => setTopItems(r.data)).catch(()=>{});
      feedbackAPI.getAll({ status: 'open' }).then(r => setFeedbackCount(r.data.length)).catch(()=>{});
    }
    loadNotifications();
    const interval = setInterval(() => { fetchOrders(); loadNotifications(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  useSocket(user?.role, {
    'new-order-received': () => { fetchOrders(); fetchDashStats(); loadNotifications(); },
    'order-status-changed': () => { fetchOrders(); },
  });

  const handleMarkAllRead = async () => {
    const { notificationsAPI } = await import('../api/index.js');
    await notificationsAPI.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleRefresh = () => {
    fetchOrders(); fetchMenu(); fetchIngredients();
    if (['owner','manager'].includes(user.role)) fetchDashStats();
    loadNotifications();
  };

  const tabTitles = {
    overview:'Command Hub', pos:'Order Booking', orders:'Live Orders', menu:'Menu Master',
    inventory:'Inventory', tables:'Table Status', reservations:'Reservations',
    feedback:'Feedback Box', announcements:'Announcements', payments:'Payments',
    shifts:'Shift Logs', staff:'My Profile',
  };

  return (
    <div className="min-h-screen bg-bg-main text-white">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} unreadCount={feedbackCount} />
      <div className="pl-64 flex flex-col min-h-screen">
        <Header
          title={tabTitles[activeTab] || 'Dashboard'}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
          onRefresh={handleRefresh}
        />
        <main className="flex-1 px-8 py-8">
          <AnimatePresence mode="wait">
            <MotionDiv key={activeTab} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:0.15}}>
              {activeTab === 'overview'     && <OverviewTab orders={orders} dashStats={dashStats} menu={menu} ingredients={ingredients} topItems={topItems}/>}
              {activeTab === 'pos'          && <POS user={user} />}
              {activeTab === 'orders'       && <OrdersTab orders={orders} updateOrderStatus={updateOrderStatus} deleteOrder={deleteOrder} claimOrder={claimOrder} user={user}/>}
              {activeTab === 'menu'         && <MenuTab menu={menu} toggleMenuAvailability={toggleMenuAvailability} fetchMenu={fetchMenu}/>}
              {activeTab === 'inventory'    && <InventoryTab ingredients={ingredients} updateIngredientStock={() => {}} fetchIngredients={fetchIngredients}/>}
              {activeTab === 'tables'       && <TablesTab user={user}/>}
              {activeTab === 'reservations' && <ReservationsTab/>}
              {activeTab === 'feedback'     && <FeedbackTab/>}
              {activeTab === 'announcements'&& <AnnouncementsTab user={user}/>}
              {activeTab === 'shifts'       && <ShiftsTab/>}
              {activeTab === 'staff' && <StaffManagement currentUser={user}/>}
            </MotionDiv>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;