import StaffManagement from '../components/StaffManagement.jsx';
import FinanceTab from './FinanceTab.jsx';
import {
  staffAPI, menuAPI, ingredientsAPI, feedbackAPI, ordersAPI,
  announcementsAPI, shiftsAPI, paymentsAPI, wasteAPI, analyticsAPI, cateringAPI,
} from '../api/index.js';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
const MotionDiv = motion.div;
import {
  LayoutDashboard, ShoppingCart, Utensils, Users, LogOut, Plus, Minus, Trash2,
  Bell, Monitor, Command, PieChart, ShoppingBag as OrderIcon, Target, Award,
  BarChart3, TrendingDown, Calendar, DollarSign, Flame, Eye, ChefHat,
  Clock, CheckCircle2, AlertCircle, FileText, Edit2, X, Save, RefreshCw,
  MessageSquare, TrendingUp, Package, CreditCard, Megaphone, Loader,
  UserCheck, ClipboardList, Star, Filter, Search, Mail, MapPin, Menu,
} from 'lucide-react';
import { useAuth, useOrders } from '../context/useContextHooks';
import { useNavigate } from 'react-router-dom';
import POS from '../components/POS';
import { useSocket } from '../api/socket.js';

/* ─── DESIGN TOKENS ─── */
const CSS = {
  sidebar: `fixed left-0 top-0 h-screen z-50 flex flex-col
    bg-[#0f1117] border-r border-indigo-500/10
    transition-transform duration-300 ease-in-out w-[260px]
    shadow-2xl shadow-black/40`,
  sidebarMobileHidden: `-translate-x-full`,
  sidebarMobileVisible: `translate-x-0`,

  navItem: (active) => `
    w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl
    text-[11px] font-bold tracking-wide transition-all duration-200
    ${active
      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-900/40'
      : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'}
  `,

  statCard: (bg, border) => `
    ${bg} border ${border} rounded-2xl p-5
    hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-default
    backdrop-blur-sm
  `,

  tableRow: `grid px-5 py-4 border-t border-white/[0.04] hover:bg-indigo-500/[0.03] text-sm transition-colors`,

  input: `
    w-full bg-[#1a1f2e] border border-white/[0.08] rounded-xl px-4 py-2.5
    text-sm text-white placeholder-slate-500
    focus:outline-none focus:border-indigo-500/60 focus:bg-[#1e2438]
    transition-all duration-200
  `,

  btnPrimary: `
    flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest
    bg-gradient-to-r from-indigo-600 to-blue-600 text-white
    hover:from-indigo-500 hover:to-blue-500
    shadow-lg shadow-indigo-900/30 hover:shadow-indigo-900/50
    transition-all duration-200 disabled:opacity-50 active:scale-95
  `,

  btnGhost: `
    flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest
    bg-white/[0.04] border border-white/[0.08] text-slate-400
    hover:bg-white/[0.08] hover:text-white hover:border-white/20
    transition-all duration-200
  `,

  btnDanger: `
    flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold
    bg-red-500/10 border border-red-500/20 text-red-400
    hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-900/20
    transition-all duration-200
  `,

  badge: (color) => {
    const map = {
      red:    'bg-red-500/10 border-red-500/30 text-red-400',
      green:  'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      blue:   'bg-blue-500/10 border-blue-500/30 text-blue-400',
      yellow: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
      gray:   'bg-white/5 border-white/20 text-slate-400',
      primary:'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
      orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    };
    return `text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${map[color] || map.gray}`;
  },

  panel: `bg-[#131825]/80 border border-white/[0.06] rounded-2xl backdrop-blur-sm`,
  panelHover: `bg-[#131825]/80 border border-white/[0.06] rounded-2xl backdrop-blur-sm hover:border-indigo-500/20 hover:shadow-lg hover:shadow-indigo-900/10 transition-all duration-300`,

  modal: `fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4`,
  modalBox: `bg-[#0f1117] border border-indigo-500/20 rounded-2xl p-6 w-full shadow-2xl shadow-black/60`,
};

/* ─── ANIMATED COUNTER ─── */
const CountUp = ({ value, prefix = '', suffix = '', decimals = 0, duration = 1200 }) => {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const frameRef = useRef(null);
  const target = parseFloat(value) || 0;

  useEffect(() => {
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * target);
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return (
    <span>
      {prefix}{decimals > 0 ? display.toFixed(decimals) : Math.floor(display).toLocaleString()}{suffix}
    </span>
  );
};

/* ─── SIDEBAR ─── */
const Sidebar = ({ activeTab, setActiveTab, user, unreadCount, mobileOpen, setMobileOpen }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const allItems = [
    { id: 'overview',      label: 'Command Hub',    icon: PieChart,        roles: ['owner','manager'] },
    { id: 'pos',           label: 'Order Booking',  icon: OrderIcon,       roles: ['owner','manager','captain'] },
    { id: 'orders',        label: 'Live Orders',    icon: Monitor,         roles: ['owner','manager','captain'] },
    { id: 'menu',          label: 'Menu Master',    icon: FileText,        roles: ['owner','manager'] },
    { id: 'inventory',     label: 'Inventory',      icon: Package,         roles: ['owner','manager','cook'] },
    { id: 'tables',        label: 'Table Status',   icon: LayoutDashboard, roles: ['owner','manager','captain'] },
    { id: 'reservations',  label: 'Reservations',   icon: Calendar,        roles: ['owner','manager','captain'] },
    { id: 'catering',      label: 'Catering',       icon: ChefHat,         roles: ['owner','manager'] },
    { id: 'feedback',      label: 'Feedback Box',   icon: MessageSquare,   roles: ['owner','manager'] },
    { id: 'announcements', label: 'Announcements',  icon: Megaphone,       roles: ['owner','manager'] },
    { id: 'finance',       label: 'Finance',        icon: DollarSign,      roles: ['owner','manager'] },
    { id: 'payments',      label: 'Payments',       icon: CreditCard,      roles: ['owner','manager'] },
    { id: 'shifts',        label: 'Shift Logs',     icon: UserCheck,       roles: ['owner','manager'] },
    { id: 'staff',         label: 'Staff',          icon: Users,           roles: ['owner','manager'] },
    { id: 'profile',       label: 'My Shift',       icon: Clock,           roles: ['captain','manager','cook'] },
  ];
  const items = allItems.filter(i => i.roles.includes(user.role));
  const handleNav = (id) => { setActiveTab(id); setMobileOpen(false); };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`${CSS.sidebar} ${mobileOpen ? CSS.sidebarMobileVisible : CSS.sidebarMobileHidden} lg:translate-x-0`}>

        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-indigo-600/15 to-blue-600/5 border border-indigo-500/20 flex-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-900/50 flex-shrink-0">
              <Command size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm tracking-widest">SPICEROUTE</p>
              <p className="text-indigo-400 text-[9px] font-bold uppercase tracking-[0.3em]">System v2</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden ml-2 text-white/30 hover:text-white flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-hide">
          {items.map(item => (
            <motion.button
              key={item.id}
              onClick={() => handleNav(item.id)}
              whileTap={{ scale: 0.97 }}
              className={CSS.navItem(activeTab === item.id)}
            >
              <div className="flex items-center gap-3">
                <item.icon size={15} className={activeTab === item.id ? 'text-white' : 'text-indigo-500/60'} />
                {item.label}
              </div>
              {item.id === 'feedback' && unreadCount > 0 && (
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="bg-indigo-500 text-white text-[9px] min-w-[18px] h-[18px] px-1 rounded-full font-black flex items-center justify-center"
                >
                  {unreadCount}
                </motion.span>
              )}
            </motion.button>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-white/[0.05] space-y-2">
          <div className="px-3 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600/40 to-blue-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-black text-indigo-300 flex-shrink-0">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-xs truncate">{user.name}</p>
                <p className="text-indigo-400 text-[9px] uppercase tracking-widest font-bold">{user.role}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

/* ─── HEADER ─── */
const Header = ({ title, notifications, onMarkAllRead, onRefresh, onMenuToggle }) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const unread = notifications.filter(n => !n.is_read);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    if (showNotifs) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifs]);

  return (
    <header className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-8 border-b border-white/[0.05] bg-[#0d1119]/95 backdrop-blur-xl sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <Menu size={16} />
        </button>
        <div>
          <h2 className="text-sm lg:text-base font-black text-white tracking-wide">{title}</h2>
          <p className="text-[10px] text-slate-500 hidden sm:block">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ rotate: 180 }}
          transition={{ duration: 0.4 }}
          onClick={onRefresh}
          className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
        >
          <RefreshCw size={14} />
        </motion.button>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(s => !s)}
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-500 hover:text-white hover:border-white/20 transition-all relative"
          >
            <Bell size={15} />
            {unread.length > 0 && (
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-indigo-500 rounded-full text-[9px] text-white flex items-center justify-center font-black px-1"
              >
                {unread.length}
              </motion.span>
            )}
          </button>

          <AnimatePresence>
            {showNotifs && (
              <MotionDiv
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-72 lg:w-80 bg-[#0f1117] border border-indigo-500/20 rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                  <p className="text-xs font-black text-white uppercase tracking-widest">Notifications</p>
                  <button onClick={onMarkAllRead} className="text-[10px] text-indigo-400 hover:underline font-bold">
                    Mark all read
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.04]">
                  {notifications.length === 0
                    ? <p className="text-slate-500 text-xs text-center py-6">No notifications</p>
                    : notifications.slice(0, 15).map(n => (
                      <div key={n.id} className={`px-4 py-3 ${!n.is_read ? 'bg-indigo-500/[0.06] border-l-2 border-l-indigo-500' : ''}`}>
                        <p className="text-xs font-bold text-white">{n.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{n.message}</p>
                        <p className="text-[10px] text-slate-600 mt-1">{new Date(n.created_at).toLocaleTimeString()}</p>
                      </div>
                    ))}
                </div>
              </MotionDiv>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

/* ─── OVERVIEW TAB ─── */
const OverviewTab = ({ orders, dashStats, menu, ingredients }) => {
  const stats = dashStats?.today || {};
  const cards = [
    { label:"Today's Revenue", value:`₹${(stats.revenue||0).toFixed(2)}`, rawValue: stats.revenue||0, prefix:'₹', decimals:0, icon:DollarSign, color:'text-emerald-400', bg:'bg-emerald-500/[0.08]', border:'border-emerald-500/20', glow:'shadow-emerald-900/20' },
    { label:'Total Orders',    value:stats.orders||0,                     rawValue: stats.orders||0,   prefix:'',  decimals:0, icon:OrderIcon,  color:'text-indigo-400',  bg:'bg-indigo-500/[0.08]', border:'border-indigo-500/20', glow:'shadow-indigo-900/20' },
    { label:'Pending/Active',  value:stats.pending||0,                    rawValue: stats.pending||0,  prefix:'',  decimals:0, icon:Clock,      color:'text-amber-400',   bg:'bg-amber-500/[0.08]',  border:'border-amber-500/20',  glow:'shadow-amber-900/20' },
    { label:'Month Revenue',   value:`₹${(dashStats?.month?.revenue||0).toFixed(0)}`, rawValue: dashStats?.month?.revenue||0, prefix:'₹', decimals:0, icon:TrendingUp, color:'text-sky-400', bg:'bg-sky-500/[0.08]', border:'border-sky-500/20', glow:'shadow-sky-900/20' },
  ];
  const lowStock = ingredients.filter(i => parseFloat(i.stock) <= parseFloat(i.min_stock));
  const liveOrders = orders.filter(o => ['pending','confirmed','preparing'].includes(o.status));

  const [period, setPeriod] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [topItems, setTopItems] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchTopItems = useCallback(async (p, from, to) => {
    setAnalyticsLoading(true);
    try {
      const params = { period: p };
      if (p === 'custom' && from && to) { params.from = from; params.to = to; }
      const res = await analyticsAPI.getTopItems(params);
      setTopItems(res.data || []);
    } catch { setTopItems([]); }
    setAnalyticsLoading(false);
  }, []);

  useEffect(() => { fetchTopItems(period, customFrom, customTo); }, [period]);

  const handleCustomApply = () => {
    if (customFrom && customTo) fetchTopItems('custom', customFrom, customTo);
  };

  const maxCount = topItems.length > 0 ? Math.max(...topItems.map(i => i.count), 1) : 1;
  const totalRevenue = topItems.reduce((s, i) => s + (i.revenue || 0), 0);
  const PIE_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

  const PieChartSVG = ({ data, size = 148 }) => {
    const valid = (data || []).filter(d => (d.revenue || 0) > 0).slice(0, 8);
    if (!valid.length) return <div className="flex items-center justify-center h-36 text-slate-500 text-xs">No revenue data</div>;
    const total = valid.reduce((s, d) => s + d.revenue, 0);
    let cumAngle = -Math.PI / 2;
    const cx = size / 2, cy = size / 2, r = size / 2 - 6;
    const slices = valid.map((d, i) => {
      const fraction = d.revenue / total;
      const angle = fraction * 2 * Math.PI;
      const x1 = cx + r * Math.cos(cumAngle), y1 = cy + r * Math.sin(cumAngle);
      cumAngle += angle;
      const x2 = cx + r * Math.cos(cumAngle), y2 = cy + r * Math.sin(cumAngle);
      return { path:`M${cx},${cy}L${x1},${y1}A${r},${r},0,${fraction>0.5?1:0},1,${x2},${y2}Z`, color:PIE_COLORS[i%PIE_COLORS.length], name:d.name, pct:(fraction*100).toFixed(1), revenue:d.revenue };
    });
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s,i) => <path key={i} d={s.path} fill={s.color} stroke="#0f1117" strokeWidth="2"><title>{s.name}: ₹{s.revenue.toFixed(0)} ({s.pct}%)</title></path>)}
        <circle cx={cx} cy={cy} r={r*0.4} fill="#0f1117"/>
        <text x={cx} y={cy-5} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">Revenue</text>
        <text x={cx} y={cy+8} textAnchor="middle" fill="#6366f1" fontSize="8">₹{(total/1000).toFixed(1)}k</text>
      </svg>
    );
  };

  return (
    <div className="space-y-5">
      {/* KPI cards with count-up animation */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className={`${c.bg} border ${c.border} rounded-2xl p-5 hover:scale-[1.03] hover:shadow-xl ${c.glow} transition-all duration-300 cursor-default`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{c.label}</p>
              <div className={`w-8 h-8 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
                <c.icon size={14} className={c.color} />
              </div>
            </div>
            <p className={`text-2xl lg:text-3xl font-black ${c.color}`}>
              <CountUp value={c.rawValue} prefix={c.prefix} decimals={c.decimals} />
            </p>
          </motion.div>
        ))}
      </div>

      {/* Live orders + sidebar */}
      <div className="grid lg:grid-cols-3 gap-4 lg:gap-5">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className={`lg:col-span-2 ${CSS.panel} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <Flame size={13} className="text-indigo-400"/>
            <h3 className="font-black text-white text-sm">Live Orders</h3>
            <span className={CSS.badge('primary')}>{liveOrders.length}</span>
          </div>
          {liveOrders.length === 0
            ? <p className="text-slate-500 text-sm text-center py-8">No active orders</p>
            : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {liveOrders.map(o => (
                  <motion.div key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-3 hover:bg-indigo-500/[0.05] transition-colors border border-white/[0.04] hover:border-indigo-500/20">
                    <div>
                      <p className="text-xs font-black text-white">{o.id}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{o.table_number?`Table ${o.table_number}`:o.order_type} · ₹{parseFloat(o.total).toFixed(2)}</p>
                    </div>
                    <span className={CSS.badge(o.status==='pending'?'yellow':o.status==='confirmed'?'blue':'orange')}>{o.status}</span>
                  </motion.div>
                ))}
              </div>
            )}
        </motion.div>

        <div className="space-y-3">
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className={`${CSS.panel} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={14} className="text-red-400"/>
              <h3 className="font-black text-white text-sm">Low Stock</h3>
              <span className={CSS.badge('red')}>{lowStock.length}</span>
            </div>
            {lowStock.length === 0
              ? <p className="text-slate-500 text-xs">All stock OK ✓</p>
              : (
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  {lowStock.map(i => (
                    <div key={i.id} className="flex justify-between items-center text-xs bg-red-500/[0.07] rounded-lg px-3 py-2 border border-red-500/10">
                      <span className="text-white font-bold truncate">{i.name}</span>
                      <span className="text-red-400 font-black">{i.stock}{i.unit}</span>
                    </div>
                  ))}
                </div>
              )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className={`${CSS.panel} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-emerald-400"/>
              <h3 className="font-black text-white text-sm">Summary</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Month Revenue</span><span className="text-emerald-400 font-black">₹{(dashStats?.month?.revenue||0).toFixed(0)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Month Orders</span><span className="text-sky-400 font-black">{dashStats?.month?.orders||0}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Today Reservations</span><span className="text-purple-400 font-black">{dashStats?.reservations?.todayCount||0}</span></div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Analytics */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className={`${CSS.panel} p-5`}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={15} className="text-indigo-400"/>
            <h3 className="font-black text-white text-sm">Menu Sales Analytics</h3>
            {analyticsLoading && <Loader size={13} className="animate-spin text-indigo-400"/>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[{id:'today',label:'Today'},{id:'week',label:'7 Days'},{id:'month',label:'30 Days'},{id:'custom',label:'Custom'}].map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period===p.id?'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-900/30':'bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:text-white'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-3 mb-4 flex-wrap bg-white/[0.02] rounded-xl p-3 border border-white/[0.06]">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest whitespace-nowrap">From:</label>
              <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} className="bg-[#1a1f2e] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/60"/>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest whitespace-nowrap">To:</label>
              <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} className="bg-[#1a1f2e] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/60"/>
            </div>
            <button onClick={handleCustomApply} disabled={!customFrom||!customTo}
              className={`${CSS.btnPrimary} disabled:opacity-40`}>Apply</button>
          </div>
        )}

        {analyticsLoading ? (
          <div className="flex justify-center items-center py-16"><Loader size={28} className="animate-spin text-indigo-400"/></div>
        ) : topItems.length === 0 ? (
          <div className="text-center py-12"><BarChart3 size={32} className="mx-auto mb-3 text-white/10"/><p className="text-slate-500 text-sm">No sales data for this period</p></div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Items Sold (Quantity)</p>
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {topItems.map((item, i) => {
                  const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-500 w-4 shrink-0 text-right">{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white truncate pr-2 max-w-[160px]">{item.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-black text-indigo-400">{item.count}×</span>
                            {(item.revenue||0) > 0 && <span className="text-[10px] text-emerald-400 font-bold">₹{(item.revenue||0).toFixed(0)}</span>}
                          </div>
                        </div>
                        <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            <div className="lg:col-span-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Revenue Distribution</p>
              <div className="flex justify-center mb-3"><PieChartSVG data={topItems} size={148}/></div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {topItems.slice(0,8).map((item,i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                    <span className="text-slate-400 truncate flex-1">{item.name}</span>
                    <span className="text-white font-black shrink-0">{totalRevenue>0?((( item.revenue||0)/totalRevenue)*100).toFixed(1):0}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1">
                <div className="flex justify-between text-xs"><span className="text-slate-400">Total Revenue</span><span className="text-emerald-400 font-black">₹{totalRevenue.toFixed(0)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-400">Total Qty Sold</span><span className="text-indigo-400 font-black">{topItems.reduce((s,i)=>s+i.count,0)}×</span></div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

/* ─── LIVE ORDERS TAB ─── */
const OrdersTab = ({ orders, updateOrderStatus, deleteOrder, user, claimOrder }) => {
  const [filter, setFilter] = useState('all');
  const [paying, setPaying] = useState(null);
  const [payMethod, setPayMethod] = useState('cash');

  const statusColors = {
    pending:   CSS.badge('yellow'),
    confirmed: CSS.badge('blue'),
    preparing: 'text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider bg-orange-500/10 border-orange-500/30 text-orange-400',
    ready:     CSS.badge('green'),
    served:    CSS.badge('purple'),
    paid:      CSS.badge('primary'),
    cancelled: CSS.badge('red'),
  };

  const isOwnerManager = ['owner','manager'].includes(user.role);
  const isCaptain = user.role === 'captain';
  const captainVisibleStatuses = ['ready', 'served', 'paid'];
  const baseOrders = isCaptain ? orders.filter(o => captainVisibleStatuses.includes(o.status)) : orders;
  const filters = isCaptain ? ['all','ready','served','paid'] : ['all','pending','confirmed','preparing','ready','served','paid'];
  const filtered = filter === 'all' ? baseOrders : baseOrders.filter(o => o.status === filter);

  const getNextStatus = (order) => {
    if (isOwnerManager) {
      if (order.status === 'pending') return 'confirmed';
      if (order.status === 'served') return 'paid';
      return null;
    }
    const map = { pending:'confirmed', confirmed:'preparing', preparing:'ready', ready:'served', served:'paid' };
    return map[order.status] || null;
  };

  const handlePayment = async (order) => {
    try { await paymentsAPI.create({ order_id: order.id, amount: order.total, method: payMethod }); setPaying(null); }
    catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <motion.button key={f} whileTap={{ scale: 0.95 }} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter===f?'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-900/30':'bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:text-white hover:border-white/20'}`}>
            {f === 'all' ? `All (${baseOrders.length})` : f}
          </motion.button>
        ))}
      </div>

      {isOwnerManager && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-2.5 text-xs text-indigo-300">
          ℹ️ As manager/owner: you confirm orders and collect payment. Cook handles preparation, captain handles serving.
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500"><OrderIcon size={32} className="mx-auto mb-3 opacity-20" /><p className="text-sm">No orders found</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order, idx) => {
            const items = order.order_items || order.items || [];
            const nextStatus = getNextStatus(order);
            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} className={`${CSS.panelHover} p-4 lg:p-5`}>
                <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                  <div>
                    <p className="font-black text-white text-sm">{order.id}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {order.table_number ? `Table ${order.table_number}` : order.order_type}
                      {order.customer_name ? ` · ${order.customer_name}` : ''}
                      {' · '}{new Date(order.created_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={statusColors[order.status] || CSS.badge('gray')}>{order.status}</span>
                    <p className="text-indigo-400 font-black text-sm">₹{parseFloat(order.total).toFixed(2)}</p>
                  </div>
                </div>

                {isCaptain && order.status === 'ready' && (
                  <div className="flex items-center gap-2 bg-emerald-500/[0.07] border border-emerald-500/20 rounded-xl px-4 py-2 mb-3">
                    <span className="text-lg">🍽️</span>
                    <p className="text-emerald-400 text-xs font-black uppercase tracking-wider">Food Ready — Collect & Serve</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-3">
                  {items.map((item, i) => (
                    <span key={i} className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1 text-[11px] text-slate-400">
                      {item.menu_item_name || item.name} ×{item.quantity}
                    </span>
                  ))}
                </div>

                {order.special_instructions && (
                  <p className="text-xs text-amber-300 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl px-3 py-2 mb-3">📝 {order.special_instructions}</p>
                )}

                <div className="flex gap-2 flex-wrap">
                  {isCaptain && !order.captain_id && (
                    <button onClick={() => claimOrder(order.id)} className={CSS.btnPrimary}>✋ Claim</button>
                  )}
                  {nextStatus && (
                    <button onClick={() => updateOrderStatus(order.id, nextStatus)} className={CSS.btnPrimary}>
                      → {nextStatus}
                    </button>
                  )}
                  {order.status === 'served' && !isOwnerManager && (
                    <button onClick={() => setPaying(order)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black hover:bg-emerald-500/20 transition-all uppercase">
                      <CreditCard size={12} /> Collect Payment
                    </button>
                  )}
                  {isOwnerManager && order.status === 'served' && (
                    <button onClick={() => setPaying(order)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black hover:bg-emerald-500/20 transition-all uppercase">
                      <CreditCard size={12} /> Collect Payment
                    </button>
                  )}
                  {isOwnerManager && order.status !== 'paid' && (
                    <button onClick={() => deleteOrder(order.id)} className={CSS.btnDanger}><Trash2 size={12} /></button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {paying && (
        <div className={CSS.modal}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`${CSS.modalBox} max-w-sm`}>
            <h3 className="text-lg font-black text-white mb-1">Collect Payment</h3>
            <p className="text-slate-400 text-sm mb-5">Order {paying.id} · <span className="text-indigo-400 font-black text-base">₹{parseFloat(paying.total).toFixed(2)}</span></p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {['cash','card','upi'].map(m => (
                <button key={m} onClick={() => setPayMethod(m)}
                  className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${payMethod===m?'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-900/30':'bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:text-white'}`}>
                  {m}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPaying(null)} className={`flex-1 ${CSS.btnGhost} justify-center`}>Cancel</button>
              <button onClick={() => handlePayment(paying)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/30">
                Confirm {payMethod.toUpperCase()}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

/* ─── MENU MASTER TAB ─── */
const MenuTab = ({ menu, toggleMenuAvailability, fetchMenu }) => {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = menu.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    setSaving(true);
    try { if (adding) await menuAPI.create(form); else await menuAPI.update(editing.id, form); await fetchMenu(); setEditing(null); setAdding(false); setForm({}); }
    catch(e) { alert(e.response?.data?.error || 'Save failed'); }
    setSaving(false);
  };
  const handleDelete = async (id) => { if (!confirm('Delete this menu item?')) return; await menuAPI.delete(id); await fetchMenu(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search menu..." className={`${CSS.input} pl-9`} />
        </div>
        <button onClick={() => { setAdding(true); setForm({ name:'', price:'', category:'Biryani', description:'', prep_time:20, spice_level:2, is_veg:false, is_halal:true, image_emoji:'🍽️', is_available:true }); }} className={CSS.btnPrimary}>
          <Plus size={13} /> Add Item
        </button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((item, idx) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} className={`${CSS.panelHover} p-4`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.image_emoji||'🍽️'}</span>
                <div><p className="font-black text-white text-sm">{item.name}</p><p className="text-[11px] text-slate-400">{item.category}</p></div>
              </div>
              <span className={CSS.badge(item.is_available?'green':'red')}>{item.is_available?'On':'Off'}</span>
            </div>
            <p className="text-indigo-400 font-black text-lg mb-1">₹{parseFloat(item.price).toFixed(2)}</p>
            <p className="text-slate-400 text-xs mb-4 line-clamp-2">{item.description}</p>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(item); setForm({...item}); }} className={`flex-1 ${CSS.btnGhost} justify-center text-[10px]`}><Edit2 size={11} /> Edit</button>
              <button onClick={() => toggleMenuAvailability(item.id)} className="flex-1 py-2 bg-amber-500/[0.07] border border-amber-500/20 text-amber-400 rounded-xl text-[10px] font-black hover:bg-amber-500/[0.12] transition-all">Toggle</button>
              <button onClick={() => handleDelete(item.id)} className={CSS.btnDanger}><Trash2 size={12} /></button>
            </div>
          </motion.div>
        ))}
      </div>

      {(editing || adding) && (
        <div className={CSS.modal}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`${CSS.modalBox} max-w-lg`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-white">{adding?'Add Menu Item':'Edit Item'}</h3>
              <button onClick={() => { setEditing(null); setAdding(false); }}><X size={18} className="text-slate-400 hover:text-white" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['name','Item Name','text'],['price','Price (₹)','number'],['category','Category','text'],['image_emoji','Emoji','text'],['prep_time','Prep Time (min)','number'],['spice_level','Spice (1-5)','number']].map(([k,label,type]) => (
                <div key={k}><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{label}</label><input type={type} value={form[k]||''} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} className={CSS.input} /></div>
              ))}
              <div className="col-span-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Description</label><textarea value={form.description||''} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} className={`${CSS.input} resize-none`} /></div>
              <div className="flex items-center gap-3"><label className="text-xs font-bold text-slate-400">Veg</label><input type="checkbox" checked={!!form.is_veg} onChange={e=>setForm(p=>({...p,is_veg:e.target.checked}))} className="w-4 h-4 accent-indigo-500" /></div>
              <div className="flex items-center gap-3"><label className="text-xs font-bold text-slate-400">Halal</label><input type="checkbox" checked={!!form.is_halal} onChange={e=>setForm(p=>({...p,is_halal:e.target.checked}))} className="w-4 h-4 accent-indigo-500" /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setEditing(null); setAdding(false); }} className={`flex-1 ${CSS.btnGhost} justify-center`}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className={`flex-1 ${CSS.btnPrimary} justify-center`}>{saving?<Loader size={13} className="animate-spin"/>:<Save size={13}/>} Save</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

/* ─── INVENTORY TAB ─── */
const InventoryTab = ({ ingredients, fetchIngredients, user }) => {
  const isCook    = user?.role === 'cook';
  const isManager = ['owner','manager'].includes(user?.role);
  const [subTab, setSubTab] = useState('ok');
  const [useModal, setUseModal] = useState(null);
  const [useAmt, setUseAmt] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [delConfirm, setDelConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:'', unit:'kg', stock:'', min_stock:'', unit_cost:'', reorder_lead_days:'2' });

  const low  = ingredients.filter(i => parseFloat(i.stock) <= parseFloat(i.min_stock));
  const good = ingredients.filter(i => parseFloat(i.stock) >  parseFloat(i.min_stock));
  const list = subTab === 'low' ? low : good;

  const openEdit = (ing) => { setForm({ name:ing.name, unit:ing.unit, stock:ing.stock, min_stock:ing.min_stock, unit_cost:ing.unit_cost||'', reorder_lead_days:ing.reorder_lead_days||2 }); setEditModal(ing); };
  const openAdd = () => { setForm({ name:'', unit:'kg', stock:'', min_stock:'', unit_cost:'', reorder_lead_days:'2' }); setAddModal(true); };
  const handleSave = async () => {
    setSaving(true);
    try { if (editModal) await ingredientsAPI.update(editModal.id, form); else await ingredientsAPI.create(form); await fetchIngredients(); setEditModal(null); setAddModal(false); }
    catch(e) { alert(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };
  const handleDelete = async (id) => {
    try { await ingredientsAPI.delete(id); await fetchIngredients(); setDelConfirm(null); }
    catch(e) { alert(e.response?.data?.error || 'Delete failed'); }
  };
  const handleUse = async () => {
    if (!useAmt || parseFloat(useAmt) <= 0) return;
    try {
      const res = await ingredientsAPI.use(useModal.id, parseFloat(useAmt));
      await fetchIngredients();
      setUseModal(null); setUseAmt('');
      if (res.data?.needs_reorder) alert(`⚠️ ${useModal.name} is now low stock — manager has been notified!`);
    } catch(e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const FormModal = ({ title, onClose }) => (
    <div className={CSS.modal}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`${CSS.modalBox} max-w-md space-y-4`}>
        <div className="flex justify-between items-center"><h3 className="text-white font-black text-base">{title}</h3><button onClick={onClose}><X size={18} className="text-slate-400 hover:text-white"/></button></div>
        {[{ label:'Name',key:'name',type:'text',ph:'e.g. Basmati Rice' },{ label:'Unit',key:'unit',type:'text',ph:'kg / g / L / pcs' },{ label:'Current Stock',key:'stock',type:'number',ph:'0' },{ label:'Min Stock',key:'min_stock',type:'number',ph:'0' },{ label:'Unit Cost (₹)',key:'unit_cost',type:'number',ph:'0.00' },{ label:'Reorder Lead Days',key:'reorder_lead_days',type:'number',ph:'2' }].map(f => (
          <div key={f.key}><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{f.label}</label><input type={f.type} placeholder={f.ph} value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} className={CSS.input}/></div>
        ))}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className={`flex-1 ${CSS.btnGhost} justify-center`}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className={`flex-1 ${CSS.btnPrimary} justify-center`}>{saving?<Loader size={13} className="animate-spin"/>:<Save size={13}/>}{saving?'Saving...':'Save'}</button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-xl font-black text-white">Inventory</h2><p className="text-slate-400 text-xs mt-0.5">{ingredients.length} items · <span className="text-red-400 font-black">{low.length} low stock</span></p></div>
        {isManager && <button onClick={openAdd} className={CSS.btnPrimary}><Plus size={13}/> Add Item</button>}
      </div>

      <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 gap-1 w-fit">
        <button onClick={() => setSubTab('ok')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${subTab==='ok'?'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30':'text-slate-400 hover:text-white'}`}>
          <span className="w-2 h-2 rounded-full bg-current"/> In Stock ({good.length})
        </button>
        <button onClick={() => setSubTab('low')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${subTab==='low'?'bg-red-600 text-white shadow-lg shadow-red-900/30':'text-slate-400 hover:text-white'}`}>
          <span className="w-2 h-2 rounded-full bg-current"/> Low Stock ({low.length})
        </button>
      </div>

      {subTab==='low'&&low.length>0&&(
        <div className="flex items-center gap-3 bg-red-500/[0.07] border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0"/>
          <p className="text-red-300 text-sm font-bold">{low.length} ingredient{low.length>1?'s':''} below minimum — reorder needed!</p>
        </div>
      )}

      {list.length===0 ? (
        <div className="text-center py-16"><Package size={32} className="text-white/10 mx-auto mb-3"/><p className="text-slate-500 text-sm">{subTab==='low'?'All items are sufficiently stocked ✓':'No items found'}</p></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((ing, idx) => {
            const isLow = parseFloat(ing.stock) <= parseFloat(ing.min_stock);
            const pct   = Math.min(100, (parseFloat(ing.stock) / (parseFloat(ing.min_stock)*3||1)) * 100);
            return (
              <motion.div key={ing.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} className={`${CSS.panel} p-5 transition-all ${isLow?'border-red-500/30 hover:border-red-500/50':'hover:border-indigo-500/20'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div><p className="font-black text-white text-sm">{ing.name}</p><p className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-widest">{ing.unit}</p></div>
                  <span className={CSS.badge(isLow?'red':'green')}>{isLow?'⚠ LOW':'✓ OK'}</span>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between mb-1.5">
                    <span className={`font-black text-sm ${isLow?'text-red-400':'text-emerald-400'}`}>{parseFloat(ing.stock).toFixed(1)} {ing.unit}</span>
                    <span className="text-slate-500 text-[11px]">Min: {ing.min_stock}</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${isLow?'bg-red-500':'bg-emerald-500'}`}
                    />
                  </div>
                </div>
                {ing.unit_cost>0&&<p className="text-slate-500 text-[10px] mb-3">₹{parseFloat(ing.unit_cost).toFixed(2)}/{ing.unit}</p>}
                <div className="flex gap-2">
                  {isCook&&(<button onClick={()=>{setUseModal(ing);setUseAmt('');}} className="flex-1 py-2 bg-orange-500/[0.07] border border-orange-500/20 text-orange-400 hover:bg-orange-500/[0.12] rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1"><Minus size={11}/> Use</button>)}
                  {isManager&&(<><button onClick={()=>openEdit(ing)} className={`flex-1 ${CSS.btnGhost} justify-center text-[10px] py-2`}><Edit2 size={11}/> Edit</button><button onClick={()=>setDelConfirm(ing)} className={CSS.btnDanger}><Trash2 size={11}/></button></>)}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {useModal&&(
        <div className={CSS.modal}><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`${CSS.modalBox} max-w-sm space-y-4`}>
          <div className="flex justify-between items-center"><h3 className="text-white font-black">Use Ingredient</h3><button onClick={()=>setUseModal(null)}><X size={18} className="text-slate-400 hover:text-white"/></button></div>
          <div className={`${CSS.panel} px-4 py-3`}><p className="text-white font-black">{useModal.name}</p><p className="text-slate-400 text-xs mt-0.5">Available: <span className="text-white font-bold">{parseFloat(useModal.stock).toFixed(1)} {useModal.unit}</span></p></div>
          <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Amount to Use ({useModal.unit})</label><input type="number" min="0.01" step="0.01" value={useAmt} onChange={e=>setUseAmt(e.target.value)} placeholder="0.00" className={CSS.input} autoFocus/></div>
          <div className="flex gap-3">
            <button onClick={()=>setUseModal(null)} className={`flex-1 ${CSS.btnGhost} justify-center`}>Cancel</button>
            <button onClick={handleUse} disabled={!useAmt} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase disabled:opacity-50 transition-all shadow-lg shadow-orange-900/20">Confirm Use</button>
          </div>
        </motion.div></div>
      )}
      {addModal&&<FormModal title="Add New Ingredient" onClose={()=>setAddModal(false)}/>}
      {editModal&&<FormModal title={`Edit: ${editModal.name}`} onClose={()=>setEditModal(null)}/>}
      {delConfirm&&(
        <div className={CSS.modal}><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`${CSS.modalBox} max-w-sm border-red-500/20 space-y-4`}>
          <h3 className="text-white font-black">Delete Ingredient?</h3>
          <div className="bg-red-500/[0.07] border border-red-500/20 rounded-xl px-4 py-3"><p className="text-white font-black">{delConfirm.name}</p><p className="text-slate-400 text-xs mt-0.5">{delConfirm.stock} {delConfirm.unit} remaining</p></div>
          <p className="text-red-400 text-xs">This cannot be undone.</p>
          <div className="flex gap-3"><button onClick={()=>setDelConfirm(null)} className={`flex-1 ${CSS.btnGhost} justify-center`}>Cancel</button><button onClick={()=>handleDelete(delConfirm.id)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase transition-all shadow-lg shadow-red-900/20">Delete</button></div>
        </motion.div></div>
      )}
    </div>
  );
};

/* ─── FEEDBACK TAB ─── */
const FeedbackTab = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  useEffect(() => { feedbackAPI.getAll().then(r => { setFeedbacks(r.data); setLoading(false); }).catch(() => setLoading(false)); }, []);
  const handleReply = async () => {
    if (!reply.trim()) return;
    try { await feedbackAPI.reply(selected.id, { staff_reply:reply, status:'resolved', customer_email:selected.customer_email }); setFeedbacks(prev=>prev.map(f=>f.id===selected.id?{...f,staff_reply:reply,status:'resolved'}:f)); setSelected(null); setReply(''); }
    catch(e) { console.error(e); }
  };
  const typeColors = { complaint:CSS.badge('red'), suggestion:CSS.badge('blue'), compliment:CSS.badge('green'), general:CSS.badge('gray') };
  const filtered = filter==='all' ? feedbacks : feedbacks.filter(f=>f.feedback_type===filter||f.status===filter);
  if (loading) return <div className="flex justify-center py-20"><Loader className="animate-spin text-indigo-400" size={28}/></div>;
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['all','complaint','suggestion','compliment','open','resolved'].map(f => (
          <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter===f?'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-900/30':'bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:text-white'}`}>{f}</button>
        ))}
      </div>
      {filtered.length===0?<p className="text-center text-slate-500 py-16">No feedback yet</p>:(
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((fb, idx)=>(
            <motion.div key={fb.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className={`${CSS.panelHover} p-5`}>
              <div className="flex items-start justify-between mb-3">
                <div><p className="font-black text-white text-sm">{fb.customer_name||'Anonymous'}</p>{fb.customer_email&&<a href={`mailto:${fb.customer_email}`} className="text-indigo-400 text-xs hover:underline block mt-0.5">{fb.customer_email}</a>}{fb.customer_phone&&<a href={`tel:${fb.customer_phone}`} className="text-slate-400 text-xs block">{fb.customer_phone}</a>}<p className="text-slate-500 text-[11px] mt-1">{new Date(fb.created_at).toLocaleDateString()}</p></div>
                <div className="flex flex-col gap-1.5 items-end"><span className={typeColors[fb.feedback_type]||CSS.badge('gray')}>{fb.feedback_type}</span><span className={CSS.badge(fb.status==='resolved'?'green':'yellow')}>{fb.status}</span></div>
              </div>
              {fb.rating&&<div className="flex gap-0.5 mb-2">{[1,2,3,4,5].map(s=><Star key={s} size={12} className={s<=fb.rating?'text-amber-400 fill-amber-400':'text-white/10'}/>)}</div>}
              {fb.subject&&<p className="font-black text-white text-sm mb-1">{fb.subject}</p>}
              <p className="text-slate-400 text-xs mb-3 leading-relaxed">{fb.message}</p>
              {fb.staff_reply&&<div className="bg-indigo-500/[0.07] border border-indigo-500/20 rounded-xl p-3 text-xs text-white mb-3"><span className="text-indigo-400 font-black">Reply: </span>{fb.staff_reply}</div>}
              {fb.status!=='resolved'&&<button onClick={()=>setSelected(fb)} className={`${CSS.btnPrimary} text-[10px] px-3 py-2`}>Reply</button>}
            </motion.div>
          ))}
        </div>
      )}
      {selected&&(
        <div className={CSS.modal}><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`${CSS.modalBox} max-w-md`}>
          <h3 className="font-black text-white mb-1">Reply to {selected.customer_name}</h3>
          <p className="text-slate-400 text-xs mb-4 italic">"{selected.message}"</p>
          <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={4} placeholder="Write your reply..." className={`${CSS.input} resize-none mb-4`}/>
          <div className="flex gap-3"><button onClick={()=>setSelected(null)} className={`flex-1 ${CSS.btnGhost} justify-center`}>Cancel</button><button onClick={handleReply} className={`flex-1 ${CSS.btnPrimary} justify-center`}>Send Reply</button></div>
        </motion.div></div>
      )}
    </div>
  );
};

/* ─── CATERING TAB ─── */
const CateringTab = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ status:'', quoted_amount:'', staff_notes:'', rejection_reason:'' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const SC = { submitted:{label:'Submitted',badge:'yellow'}, reviewing:{label:'Reviewing',badge:'blue'}, accepted:{label:'Accepted',badge:'green'}, rejected:{label:'Rejected',badge:'red'}, completed:{label:'Completed',badge:'primary'}, cancelled:{label:'Cancelled',badge:'gray'} };
  const load = async () => { setLoading(true); try { const r = await cateringAPI.getAll(); setRequests(r.data||[]); } catch(e) { console.error(e); } setLoading(false); };
  useEffect(()=>{load();}, []);
  const openUpdate = (req) => { setSelected(req); setForm({ status:req.status||'submitted', quoted_amount:req.quoted_amount||'', staff_notes:req.staff_notes||'', rejection_reason:req.rejection_reason||'' }); };
  const handleSave = async () => {
    setSaving(true);
    try { await cateringAPI.update(selected.id, { status:form.status||undefined, quoted_amount:form.quoted_amount?parseFloat(form.quoted_amount):undefined, staff_notes:form.staff_notes||undefined, rejection_reason:form.rejection_reason||undefined }); await load(); setSelected(null); }
    catch(e) { alert(e.response?.data?.error||'Update failed'); }
    setSaving(false);
  };
  const filtered = filter==='all' ? requests : requests.filter(r=>r.status===filter);
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all','submitted','reviewing','accepted','rejected','completed'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 ${filter===f?'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-900/30':'bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:text-white'}`}>{f==='all'?`All (${requests.length})`:f}</button>
        ))}
      </div>
      {loading?<div className="flex justify-center py-12"><Loader size={24} className="animate-spin text-indigo-400"/></div>:filtered.length===0?<p className="text-center py-10 text-slate-500 text-sm">No catering requests found</p>:(
        <div className="space-y-3">
          {filtered.map((req,idx)=>{
            const sc=SC[req.status]||SC.submitted;
            return (
              <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} className={`${CSS.panelHover} p-4`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap"><p className="font-black text-white">{req.customer_name}</p><span className={CSS.badge(sc.badge)}>{sc.label}</span></div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Calendar size={10}/>{req.event_date}</span>
                      <span className="flex items-center gap-1"><Users size={10}/>{req.guest_count} guests</span>
                      {req.event_type&&<span className="flex items-center gap-1"><ChefHat size={10}/>{req.event_type}</span>}
                      {req.location&&<span className="flex items-center gap-1"><MapPin size={10}/>{req.location}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
                      {req.customer_phone&&<span>📞 {req.customer_phone}</span>}
                      {req.customer_email&&<span className="flex items-center gap-1"><Mail size={10}/>{req.customer_email}</span>}
                      {req.budget_range&&<span>💰 {req.budget_range}</span>}
                    </div>
                    {req.quoted_amount&&<p className="text-indigo-400 font-black text-sm mt-1">Quoted: ₹{parseFloat(req.quoted_amount).toFixed(2)}</p>}
                    {req.staff_notes&&<p className="text-xs text-white/50 mt-1 bg-white/5 rounded-lg px-2 py-1">Note: {req.staff_notes}</p>}
                    {(req.status==='accepted'||req.status==='rejected')&&req.customer_email&&<p className="text-[10px] text-emerald-400 mt-1">✉ Email sent to {req.customer_email}</p>}
                  </div>
                  <button onClick={()=>openUpdate(req)} className={`${CSS.btnPrimary} text-[10px] flex-shrink-0`}><Edit2 size={11}/> Manage</button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      {selected&&(
        <div className={CSS.modal}><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`${CSS.modalBox} max-w-md`}>
          <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-black text-white">Manage — {selected.customer_name}</h3><button onClick={()=>setSelected(null)}><X size={18} className="text-slate-400 hover:text-white"/></button></div>
          <div className="space-y-3">
            <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Update Status</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className={CSS.input}>{['submitted','reviewing','accepted','rejected','completed','cancelled'].map(s=><option key={s} value={s} className="bg-[#0f1117]">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></div>
            <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Quoted Amount (₹)</label><input type="number" value={form.quoted_amount} onChange={e=>setForm(p=>({...p,quoted_amount:e.target.value}))} placeholder="0.00" className={CSS.input}/></div>
            <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Notes to Customer</label><textarea value={form.staff_notes} onChange={e=>setForm(p=>({...p,staff_notes:e.target.value}))} rows={2} className={`${CSS.input} resize-none`} placeholder="Details, next steps..."/></div>
            {form.status==='rejected'&&<div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Rejection Reason</label><textarea value={form.rejection_reason} onChange={e=>setForm(p=>({...p,rejection_reason:e.target.value}))} rows={2} className={`${CSS.input} resize-none`}/></div>}
            {selected.customer_email&&<p className="text-[10px] text-slate-500 flex items-center gap-1"><Mail size={10}/> Email auto-sent to {selected.customer_email} on accept/reject</p>}
          </div>
          <div className="flex gap-3 mt-4"><button onClick={()=>setSelected(null)} className={`flex-1 ${CSS.btnGhost} justify-center`}>Cancel</button><button onClick={handleSave} disabled={saving} className={`flex-1 ${CSS.btnPrimary} justify-center`}>{saving?<Loader size={12} className="animate-spin"/>:<Save size={12}/>} Save & Notify</button></div>
        </motion.div></div>
      )}
    </div>
  );
};

/* ─── ANNOUNCEMENTS TAB ─── */
const AnnouncementsTab = ({ user }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({ title:'', message:'', type:'info', target:'all', send_email:false });
  const [saving, setSaving] = useState(false);
  const load = () => announcementsAPI.getAll().then(r => setAnnouncements(r.data)).catch(()=>{});
  useEffect(()=>{load();}, []);
  const handleCreate = async () => {
    if (!form.title||!form.message) return;
    setSaving(true);
    try { await announcementsAPI.create(form); await load(); setForm({ title:'', message:'', type:'info', target:'all', send_email:false }); }
    catch(e) { console.error(e); }
    setSaving(false);
  };
  const handleDelete = async (id) => { await announcementsAPI.delete(id); await load(); };
  const typeStyle = {
    info:    { border:'border-sky-500/20',    bg:'bg-sky-500/[0.05]',    dot:'bg-sky-400',    label:'ℹ️ Info' },
    promo:   { border:'border-emerald-500/20',bg:'bg-emerald-500/[0.05]',dot:'bg-emerald-400',label:'🎉 Promo' },
    special: { border:'border-amber-500/20',  bg:'bg-amber-500/[0.05]',  dot:'bg-amber-400',  label:'⭐ Special' },
    warning: { border:'border-red-500/20',    bg:'bg-red-500/[0.05]',    dot:'bg-red-400',    label:'⚠️ Warning' },
  };
  return (
    <div className="space-y-5">
      <div className={`${CSS.panel} p-5`}>
        <h3 className="font-black text-white text-sm mb-4">Create Announcement</h3>
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Title" className={CSS.input}/>
          <div className="flex gap-2">
            <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} className={`flex-1 ${CSS.input}`}>{['info','promo','special','warning'].map(t=><option key={t} value={t} className="bg-[#0f1117]">{t}</option>)}</select>
            <select value={form.target} onChange={e=>setForm(p=>({...p,target:e.target.value}))} className={`flex-1 ${CSS.input}`}>{['all','staff','customer'].map(t=><option key={t} value={t} className="bg-[#0f1117]">{t}</option>)}</select>
          </div>
        </div>
        <textarea value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} rows={2} placeholder="Message..." className={`${CSS.input} resize-none mb-3`}/>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div className={`w-10 h-5 rounded-full transition-colors relative ${form.send_email?'bg-indigo-600':'bg-white/10'}`} onClick={()=>setForm(p=>({...p,send_email:!p.send_email}))}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.send_email?'translate-x-5':'translate-x-0.5'}`}/>
            </div>
            <span className="text-xs text-slate-400">Also send email to customers</span>
          </label>
          <button onClick={handleCreate} disabled={saving} className={CSS.btnPrimary}>{saving?<Loader size={12} className="animate-spin"/>:<Megaphone size={12}/>} Publish</button>
        </div>
      </div>
      <div className="space-y-3">
        {announcements.map((a, idx)=>{ const ts=typeStyle[a.type]||typeStyle.info; return (
          <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} className={`${ts.bg} border ${ts.border} rounded-2xl p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${ts.dot}`}/>
                <div className="min-w-0">
                  <p className="font-black text-white text-sm">{a.title}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{a.message}</p>
                  <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-widest">{ts.label} · {a.target} · {new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {user.role==='owner'&&<button onClick={()=>handleDelete(a.id)} className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"><X size={15}/></button>}
            </div>
          </motion.div>
        );})}
      </div>
    </div>
  );
};

/* ─── SHIFT LOGS TAB ─── */
const ShiftsTab = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  useEffect(() => { setLoading(true); shiftsAPI.getAll({ date }).then(r=>{ setShifts(r.data); setLoading(false); }).catch(()=>setLoading(false)); }, [date]);
  const totalHours = shifts.reduce((s,sh)=>s+(sh.duration_minutes||0)/60, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} className={`${CSS.input} w-auto`}/>
        <div className={`${CSS.panel} px-4 py-2.5`}><p className="text-slate-400 text-xs">Total: <span className="text-indigo-400 font-black">{totalHours.toFixed(1)} hours</span></p></div>
      </div>
      {loading?<div className="flex justify-center py-16"><Loader className="animate-spin text-indigo-400" size={24}/></div>:(
        <div className={`${CSS.panel} overflow-hidden`}>
          <div className="hidden sm:grid grid-cols-5 px-5 py-3 bg-white/[0.03] text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/[0.06]"><div>Staff</div><div>Role</div><div>Clock In</div><div>Clock Out</div><div>Duration</div></div>
          {shifts.length===0?<p className="text-center text-slate-500 py-10 text-sm">No shifts on this date</p>:shifts.map(s=>(
            <div key={s.id}>
              <div className={`hidden sm:grid ${CSS.tableRow} grid-cols-5`}><p className="font-black text-white text-xs">{s.users?.name||'—'}</p><span className={CSS.badge('primary')}>{s.users?.role||'—'}</span><p className="text-slate-400 text-xs">{s.clock_in?new Date(s.clock_in).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'—'}</p><p className="text-slate-400 text-xs">{s.clock_out?new Date(s.clock_out).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):<span className="text-amber-400 font-bold">Active</span>}</p><p className="text-white font-black text-xs">{s.duration_minutes?`${Math.floor(s.duration_minutes/60)}h ${s.duration_minutes%60}m`:'—'}</p></div>
              <div className="sm:hidden flex items-center justify-between px-4 py-3 border-t border-white/[0.04] gap-3"><div className="min-w-0"><p className="font-black text-white text-sm truncate">{s.users?.name||'—'}</p><span className={CSS.badge('primary')}>{s.users?.role||'—'}</span></div><div className="text-right flex-shrink-0"><p className="text-slate-400 text-xs">{s.clock_in?new Date(s.clock_in).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'—'} → {s.clock_out?new Date(s.clock_out).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):<span className="text-amber-400">Active</span>}</p><p className="text-white font-black text-sm">{s.duration_minutes?`${Math.floor(s.duration_minutes/60)}h ${s.duration_minutes%60}m`:'—'}</p></div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── TABLES TAB ─── */
const TablesTab = ({ user }) => {
  const isManager = ['owner','manager'].includes(user?.role);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ table_number:'', capacity:'4', section:'main', status:'available' });
  const load = () => { import('../api/index.js').then(({ tablesAPI }) => tablesAPI.getAll().then(r=>{ setTables(r.data); setLoading(false); }).catch(()=>setLoading(false))); };
  useEffect(()=>{load();}, []);
  const updateStatus = async (id, status) => { const { tablesAPI } = await import('../api/index.js'); await tablesAPI.updateStatus(id, status); setTables(prev=>prev.map(t=>t.id===id?{...t,status}:t)); };
  const openAdd = () => { setForm({ table_number:'', capacity:'4', section:'main', status:'available' }); setAddModal(true); };
  const openEdit = (t) => { setForm({ table_number:t.table_number, capacity:t.capacity, section:t.section||'main', status:t.status }); setEditModal(t); };
  const handleSave = async () => { setSaving(true); const { tablesAPI } = await import('../api/index.js'); try { if (editModal) await tablesAPI.update(editModal.id, form); else await tablesAPI.create(form); load(); setAddModal(false); setEditModal(null); } catch(e) { alert(e.response?.data?.error||'Failed'); } finally { setSaving(false); } };
  const handleDelete = async (id) => { const { tablesAPI } = await import('../api/index.js'); try { await tablesAPI.delete(id); load(); setDelConfirm(null); } catch(e) { alert(e.response?.data?.error||'Delete failed'); } };
  const statusConfig = {
    available:{ badge:'green',  dot:'bg-emerald-400', border:'border-emerald-500/20', bg:'bg-emerald-500/[0.05]' },
    occupied: { badge:'red',    dot:'bg-red-400',     border:'border-red-500/20',     bg:'bg-red-500/[0.05]' },
    reserved: { badge:'blue',   dot:'bg-sky-400',     border:'border-sky-500/20',     bg:'bg-sky-500/[0.05]' },
    cleaning: { badge:'yellow', dot:'bg-amber-400',   border:'border-amber-500/20',   bg:'bg-amber-500/[0.05]' },
  };
  const counts = { available:0, occupied:0, reserved:0, cleaning:0 };
  tables.forEach(t=>{ if(counts[t.status]!==undefined) counts[t.status]++; });
  if (loading) return <div className="flex justify-center py-20"><Loader className="animate-spin text-indigo-400" size={28}/></div>;

  const FormModal = ({ title, onClose }) => (
    <div className={CSS.modal}><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`${CSS.modalBox} max-w-sm space-y-4`}>
      <div className="flex justify-between items-center"><h3 className="text-white font-black text-base">{title}</h3><button onClick={onClose}><X size={18} className="text-slate-400 hover:text-white"/></button></div>
      {[{label:'Table Number *',key:'table_number',type:'text',ph:'e.g. T11'},{label:'Capacity',key:'capacity',type:'number',ph:'4'}].map(f=>(<div key={f.key}><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{f.label}</label><input type={f.type} value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph} className={CSS.input}/></div>))}
      <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Section</label><select value={form.section} onChange={e=>setForm(p=>({...p,section:e.target.value}))} className={CSS.input}>{['main','indoor','outdoor','private','bar','banquet'].map(s=><option key={s} value={s} className="bg-[#0f1117]">{s}</option>)}</select></div>
      {editModal&&<div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Status</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className={CSS.input}>{['available','occupied','reserved','cleaning'].map(s=><option key={s} value={s} className="bg-[#0f1117]">{s}</option>)}</select></div>}
      <div className="flex gap-3 pt-1"><button onClick={onClose} className={`flex-1 ${CSS.btnGhost} justify-center`}>Cancel</button><button onClick={handleSave} disabled={saving||!form.table_number} className={`flex-1 ${CSS.btnPrimary} justify-center`}>{saving?<Loader size={13} className="animate-spin"/>:<Save size={13}/>}{saving?'Saving...':'Save'}</button></div>
    </motion.div></div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-xl font-black text-white">Table Status</h2><p className="text-slate-400 text-xs mt-0.5">{tables.length} tables total</p></div>
        {isManager&&<button onClick={openAdd} className={CSS.btnPrimary}><Plus size={13}/> Add Table</button>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[{label:'Available',count:counts.available,color:'text-emerald-400'},{label:'Occupied',count:counts.occupied,color:'text-red-400'},{label:'Reserved',count:counts.reserved,color:'text-sky-400'},{label:'Cleaning',count:counts.cleaning,color:'text-amber-400'}].map(s=>(
          <div key={s.label} className={`${CSS.panel} p-3 text-center`}>
            <p className={`text-2xl font-black ${s.color}`}><CountUp value={s.count} /></p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {tables.map((t, idx)=>{ const sc=statusConfig[t.status]||statusConfig.available; return (
          <motion.div key={t.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.04 }} className={`${sc.bg} border ${sc.border} rounded-2xl p-3 sm:p-4 transition-all hover:scale-[1.02] hover:shadow-lg duration-200`}>
            <div className="flex items-center justify-between mb-2"><p className="text-xl font-black text-white">{t.table_number}</p><span className={`w-2.5 h-2.5 rounded-full ${sc.dot}`}/></div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">{t.status}</p>
            <p className="text-[10px] text-slate-500 mb-0.5">{t.section}</p>
            <p className="text-[10px] text-slate-500 mb-3">👥 {t.capacity}</p>
            <select value={t.status} onChange={e=>updateStatus(t.id,e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-indigo-500/40 mb-2">{['available','occupied','reserved','cleaning'].map(s=><option key={s} value={s}>{s}</option>)}</select>
            {isManager&&<div className="flex gap-1.5"><button onClick={()=>openEdit(t)} className="flex-1 py-1.5 bg-white/[0.06] hover:bg-white/[0.10] rounded-lg text-[10px] font-bold text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1"><Edit2 size={10}/> Edit</button><button onClick={()=>setDelConfirm(t)} className={CSS.btnDanger+' py-1.5 px-2'}><Trash2 size={10}/></button></div>}
          </motion.div>
        );})}
      </div>
      {addModal&&<FormModal title="Add New Table" onClose={()=>setAddModal(false)}/>}
      {editModal&&<FormModal title={`Edit Table ${editModal.table_number}`} onClose={()=>setEditModal(null)}/>}
      {delConfirm&&(<div className={CSS.modal}><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`${CSS.modalBox} max-w-sm border-red-500/20 space-y-4`}><h3 className="text-white font-black">Delete Table?</h3><div className="bg-red-500/[0.07] border border-red-500/20 rounded-xl px-4 py-3"><p className="text-white font-black">Table {delConfirm.table_number}</p><p className="text-slate-400 text-xs mt-0.5">{delConfirm.capacity} seats · {delConfirm.section}</p></div><p className="text-red-400 text-xs">This cannot be undone.</p><div className="flex gap-3"><button onClick={()=>setDelConfirm(null)} className={`flex-1 ${CSS.btnGhost} justify-center`}>Cancel</button><button onClick={()=>handleDelete(delConfirm.id)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase transition-all">Delete</button></div></motion.div></div>)}
    </div>
  );
};

/* ─── RESERVATIONS TAB ─── */
const ReservationsTab = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { import('../api/index.js').then(({ reservationsAPI }) => reservationsAPI.getAll().then(r=>{ setReservations(r.data); setLoading(false); }).catch(()=>setLoading(false))); }, []);
  const updateStatus = async (id, status) => { const { reservationsAPI } = await import('../api/index.js'); await reservationsAPI.updateStatus(id, status); setReservations(prev=>prev.map(r=>r.id===id?{...r,status}:r)); };
  const statusBadge = { pending:'yellow', confirmed:'blue', seated:'green', completed:'primary', cancelled:'red' };
  if (loading) return <div className="flex justify-center py-16"><Loader className="animate-spin text-indigo-400" size={24}/></div>;
  return (
    <div className="space-y-3">
      {reservations.length===0?<p className="text-center text-slate-500 py-16">No reservations found</p>:reservations.map((r, idx)=>(
        <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} className={`${CSS.panelHover} p-4 lg:p-5`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1"><p className="font-black text-white truncate">{r.customer_name}</p><p className="text-slate-400 text-xs mt-0.5 truncate">{r.customer_phone}{r.customer_email?` · ${r.customer_email}`:''}</p><div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-400"><span><Calendar size={10} className="inline mr-1 text-indigo-400"/>{r.reservation_date}</span><span><Clock size={10} className="inline mr-1 text-indigo-400"/>{r.reservation_time}</span><span><Users size={10} className="inline mr-1 text-indigo-400"/>{r.party_size} guests</span></div>{r.special_requests&&<p className="text-amber-300 text-xs mt-1">📝 {r.special_requests}</p>}{r.occasion&&<p className="text-indigo-400 text-xs mt-1">🎉 {r.occasion}</p>}</div>
            <div className="flex flex-col gap-2 items-end flex-shrink-0"><span className={CSS.badge(statusBadge[r.status]||'gray')}>{r.status}</span><select value={r.status} onChange={e=>updateStatus(r.id,e.target.value)} className="bg-[#1a1f2e] border border-white/[0.08] rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-indigo-500/40">{['pending','confirmed','seated','completed','cancelled','no-show'].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

/* ─── PROFILE / MY SHIFT TAB ─── */
const ProfileTab = ({ user }) => {
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shiftLoading, setShiftLoading] = useState(false);

  useEffect(() => {
    shiftsAPI.getMy().then(r => {
      const open = (r.data || []).find(s => !s.clock_out);
      setActiveShift(open || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleClockIn = async () => {
    setShiftLoading(true);
    try { const r = await shiftsAPI.clockIn(); setActiveShift(r.data); }
    catch(e) { alert(e.response?.data?.error || 'Clock in failed'); }
    setShiftLoading(false);
  };
  const handleClockOut = async () => {
    if (!activeShift) return;
    setShiftLoading(true);
    try { await shiftsAPI.clockOut(activeShift.id, ''); setActiveShift(null); }
    catch(e) { alert(e.response?.data?.error || 'Clock out failed'); }
    setShiftLoading(false);
  };

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={`${CSS.panel} p-8 text-center`}>
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-600/20 to-blue-600/10 border-2 border-indigo-500/30 flex items-center justify-center mx-auto mb-4 text-3xl font-black text-indigo-300">
          {user.name?.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-xl font-black text-white">{user.name}</h2>
        <p className="text-indigo-400 font-black uppercase tracking-widest text-xs mt-1">{user.role}</p>
        <p className="text-slate-500 text-xs mt-1">{user.email}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${CSS.panel} p-5`}>
        <h3 className="font-black text-white text-sm mb-4 flex items-center gap-2">
          <Clock size={14} className="text-indigo-400"/> Shift Management
        </h3>
        {loading ? (
          <div className="flex justify-center py-4"><Loader size={18} className="animate-spin text-indigo-400"/></div>
        ) : activeShift ? (
          <div className="space-y-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-2 h-2 bg-emerald-400 rounded-full"/>
                <span className="text-emerald-400 text-sm font-bold">Currently Clocked In</span>
              </div>
              <p className="text-slate-400 text-xs">Since {new Date(activeShift.clock_in).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</p>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleClockOut} disabled={shiftLoading}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-black uppercase transition-all disabled:opacity-60 shadow-lg shadow-red-900/20">
              {shiftLoading ? 'Processing...' : 'Clock Out'}
            </motion.button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-center">
              <p className="text-slate-400 text-sm">Not clocked in</p>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleClockIn} disabled={shiftLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black uppercase transition-all disabled:opacity-60 shadow-lg shadow-emerald-900/20">
              {shiftLoading ? 'Processing...' : 'Clock In'}
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

/* ─── MAIN DASHBOARD ─── */
const Dashboard = () => {
  const { user } = useAuth();
  const { orders, menu, ingredients, dashStats, fetchOrders, fetchMenu, fetchIngredients, fetchDashStats, updateOrderStatus, deleteOrder, toggleMenuAvailability } = useOrders();

  const getInitialTab = () => {
    if (user.role === 'captain') return 'orders';
    if (user.role === 'cook') return 'inventory';
    return 'overview';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [notifications, setNotifications] = useState([]);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    try { const { notificationsAPI } = await import('../api/index.js'); const r = await notificationsAPI.getAll(); setNotifications(r.data); } catch {}
  }, []);

  useEffect(() => {
    fetchOrders(); fetchMenu(); fetchIngredients();
    if (['owner','manager'].includes(user.role)) { fetchDashStats(); feedbackAPI.getAll({ status:'open' }).then(r=>setFeedbackCount(r.data.length)).catch(()=>{}); }
    loadNotifications();
    const interval = setInterval(()=>{ fetchOrders(); loadNotifications(); }, 30000);
    return ()=>clearInterval(interval);
  }, []);

  const claimOrder = async (orderId) => { try { await ordersAPI.claim(orderId); fetchOrders(); } catch(e) { console.error('claimOrder', e); } };

  useSocket(user?.role, {
    'new-order-received': () => { fetchOrders(); fetchDashStats(); loadNotifications(); },
    'order-status-changed': () => { fetchOrders(); },
  });

  const handleMarkAllRead = async () => {
    const { notificationsAPI } = await import('../api/index.js');
    await notificationsAPI.markAllRead();
    setNotifications(prev=>prev.map(n=>({...n,is_read:true})));
  };
  const handleRefresh = () => { fetchOrders(); fetchMenu(); fetchIngredients(); if (['owner','manager'].includes(user.role)) fetchDashStats(); loadNotifications(); };

  const tabTitles = {
    overview:'Command Hub', pos:'Order Booking', orders:'Live Orders', menu:'Menu Master',
    inventory:'Inventory', tables:'Table Status', reservations:'Reservations', catering:'Catering',
    feedback:'Feedback Box', announcements:'Announcements', finance:'Financial Overview',
    payments:'Payments', shifts:'Shift Logs', staff:'Staff Management', profile:'My Shift',
  };

  return (
    <div className="min-h-screen bg-[#0d1119] text-white">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} unreadCount={feedbackCount} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="lg:pl-[260px] flex flex-col min-h-screen">
        <Header title={tabTitles[activeTab]||'Dashboard'} notifications={notifications} onMarkAllRead={handleMarkAllRead} onRefresh={handleRefresh} onMenuToggle={()=>setMobileOpen(o=>!o)} />
        <main className="flex-1 px-4 lg:px-8 py-5 lg:py-7 max-w-screen-2xl">
          <AnimatePresence mode="wait">
            <MotionDiv
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {activeTab==='overview'      && <OverviewTab orders={orders} dashStats={dashStats} menu={menu} ingredients={ingredients}/>}
              {activeTab==='pos'           && <POS user={user}/>}
              {activeTab==='orders'        && <OrdersTab orders={orders} updateOrderStatus={updateOrderStatus} deleteOrder={deleteOrder} claimOrder={claimOrder} user={user}/>}
              {activeTab==='menu'          && <MenuTab menu={menu} toggleMenuAvailability={toggleMenuAvailability} fetchMenu={fetchMenu}/>}
              {activeTab==='inventory'     && <InventoryTab ingredients={ingredients} fetchIngredients={fetchIngredients} user={user}/>}
              {activeTab==='tables'        && <TablesTab user={user}/>}
              {activeTab==='reservations'  && <ReservationsTab/>}
              {activeTab==='catering'      && <CateringTab/>}
              {activeTab==='feedback'      && <FeedbackTab/>}
              {activeTab==='announcements' && <AnnouncementsTab user={user}/>}
              {activeTab==='finance'       && <FinanceTab/>}
              {activeTab==='shifts'        && <ShiftsTab/>}
              {activeTab==='staff'         && <StaffManagement currentUser={user}/>}
              {activeTab==='profile'       && <ProfileTab user={user}/>}
            </MotionDiv>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;