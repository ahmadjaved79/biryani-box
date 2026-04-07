import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart as PieIcon,
  Plus, Trash2, Upload, FileSpreadsheet, X, Loader, AlertCircle,
  CheckCircle, Target, Calendar, ChevronDown, Download
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { financeAPI } from '../api/index.js';

/* ── design tokens ── */
const C = {
  panel:  'bg-white/[0.02] border border-white/[0.06] rounded-2xl',
  input:  'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#4b5563] focus:outline-none focus:border-[#e63946]/60 transition-colors',
  btnPrimary: 'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-gradient-to-r from-[#e63946] to-[#c1121f] text-white hover:from-[#ff4757] hover:to-[#e63946] shadow-lg shadow-red-900/20 transition-all disabled:opacity-50',
  btnGhost:   'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-white/[0.04] border border-white/[0.08] text-[#9ca3af] hover:text-white hover:border-white/20 transition-all',
  badge: (c) => {
    const m = { red:'bg-red-500/10 border-red-500/30 text-red-400', green:'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', yellow:'bg-amber-500/10 border-amber-500/30 text-amber-400', blue:'bg-sky-500/10 border-sky-500/30 text-sky-400', gray:'bg-white/5 border-white/20 text-[#9ca3af]', purple:'bg-purple-500/10 border-purple-500/30 text-purple-400' };
    return `text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${m[c]||m.gray}`;
  },
};

const CATEGORY_COLORS = {
  salary:        '#e63946',
  inventory:     '#f97316',
  maintenance:   '#eab308',
  electricity:   '#3b82f6',
  marketing:     '#8b5cf6',
  rent:          '#ec4899',
  miscellaneous: '#6b7280',
};

const CATEGORIES = ['salary','inventory','maintenance','electricity','marketing','rent','miscellaneous'];

const PIE_COLORS = ['#e63946','#f97316','#eab308','#3b82f6','#8b5cf6','#ec4899','#6b7280'];

/* ── Custom tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111115] border border-white/[0.08] rounded-xl px-4 py-3 shadow-2xl text-xs">
      <p className="text-[#9ca3af] font-bold mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-black">
          {p.name}: ₹{p.value?.toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
};

/* ── KPI Card ── */
const KPICard = ({ label, value, icon: Icon, color, bg, border, sub }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={`${bg} border ${border} rounded-2xl p-5 hover:scale-[1.02] transition-transform`}
  >
    <div className="flex items-center justify-between mb-3">
      <p className="text-[10px] font-black text-[#6b7280] uppercase tracking-widest">{label}</p>
      <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
        <Icon size={16} className={color} />
      </div>
    </div>
    <p className={`text-2xl lg:text-3xl font-black ${color}`}>
      ₹{Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
    </p>
    {sub && <p className="text-[11px] text-[#6b7280] mt-1">{sub}</p>}
  </motion.div>
);

/* ── Filter Bar ── */
const FilterBar = ({ filter, setFilter, customFrom, setCustomFrom, customTo, setCustomTo, onApply }) => (
  <div className="flex items-center gap-2 flex-wrap">
    {['today','week','month','custom'].map(f => (
      <button key={f} onClick={() => setFilter(f)}
        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
          filter === f
            ? 'bg-gradient-to-r from-[#e63946] to-[#c1121f] text-white shadow-lg shadow-red-900/20'
            : 'bg-white/[0.04] text-[#6b7280] border border-white/[0.08] hover:text-white'
        }`}>
        {f === 'today' ? 'Today' : f === 'week' ? '7 Days' : f === 'month' ? 'This Month' : 'Custom'}
      </button>
    ))}
    {filter === 'custom' && (
      <div className="flex items-center gap-2">
        <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#e63946]/60" />
        <span className="text-[#4b5563] text-xs">to</span>
        <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#e63946]/60" />
        <button onClick={onApply} className={C.btnPrimary}>Apply</button>
      </div>
    )}
  </div>
);

/* ── Excel parser (client-side, no lib needed for simple CSV) ── */
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g,'_'));
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i]?.trim() || ''; });
    return obj;
  });
}

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
const FinanceTab = () => {
  const [summary, setSummary]         = useState(null);
  const [expenses, setExpenses]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('month');
  const [customFrom, setCustomFrom]   = useState('');
  const [customTo, setCustomTo]       = useState('');
  const [activeView, setActiveView]   = useState('overview'); // overview | expenses | add
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState(null);

  // Add expense form
  const [form, setForm] = useState({ category:'salary', amount:'', date: new Date().toISOString().split('T')[0], description:'', vendor:'' });
  // Bulk upload
  const [bulkRows, setBulkRows]       = useState([]);
  const [bulkPreview, setBulkPreview] = useState(false);
  const fileRef = useRef();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const buildParams = () => {
    const p = { filter };
    if (filter === 'custom') { p.from = customFrom; p.to = customTo; }
    return p;
  };

  const loadAll = async (params) => {
    setLoading(true);
    try {
      const [s, e] = await Promise.all([
        financeAPI.getSummary(params || buildParams()),
        financeAPI.getExpenses(params || buildParams()),
      ]);
      setSummary(s.data);
      setExpenses(e.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [filter]);

  const handleApplyCustom = () => {
    if (customFrom && customTo) loadAll({ filter: 'custom', from: customFrom, to: customTo });
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.date) return;
    setSaving(true);
    try {
      await financeAPI.addExpense(form);
      showToast('Expense added');
      setForm({ category:'salary', amount:'', date: new Date().toISOString().split('T')[0], description:'', vendor:'' });
      setActiveView('expenses');
      await loadAll();
    } catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await financeAPI.deleteExpense(id);
      showToast('Deleted');
      await loadAll();
    } catch { showToast('Delete failed', 'error'); }
  };

  /* ── CSV/Excel upload ── */
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target.result);
        // map common header variations
        const mapped = rows.map(r => ({
          category:    CATEGORIES.includes(r.category) ? r.category : 'miscellaneous',
          amount:      r.amount || r.cost || r.value || 0,
          date:        r.date || new Date().toISOString().split('T')[0],
          description: r.description || r.desc || r.note || '',
          vendor:      r.vendor || r.supplier || '',
        })).filter(r => parseFloat(r.amount) > 0);
        setBulkRows(mapped);
        setBulkPreview(true);
      } catch { showToast('Invalid CSV format', 'error'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBulkUpload = async () => {
    setSaving(true);
    try {
      const res = await financeAPI.bulkExpenses(bulkRows);
      showToast(`${res.data.inserted} expenses imported`);
      setBulkPreview(false); setBulkRows([]);
      setActiveView('expenses');
      await loadAll();
    } catch (err) { showToast(err.response?.data?.error || 'Bulk upload failed', 'error'); }
    setSaving(false);
  };

  /* ── CSV template download ── */
  const downloadTemplate = () => {
    const csv = 'category,amount,date,description,vendor\nsalary,15000,2026-04-01,Chef salary,\ninventory,5000,2026-04-02,Spices purchase,Local Market\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'expenses_template.csv'; a.click();
  };

  /* ─────────────────── RENDER ─────────────────── */
  if (loading && !summary) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Loader size={28} className="animate-spin text-[#e63946]"/>
      <p className="text-[#4b5563] text-sm">Loading financial data...</p>
    </div>
  );

  return (
    <div className="space-y-5 relative">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-2xl flex items-center gap-2 ${
              toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle size={16}/>}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header row ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Financial Overview</h2>
          <p className="text-[#6b7280] text-xs mt-0.5">Revenue · Expenses · Profit/Loss · Break-even</p>
        </div>
        <div className="flex gap-2">
          {['overview','expenses','add'].map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeView === v ? 'bg-[#e63946] text-white shadow-lg shadow-red-900/20' : 'bg-white/[0.04] border border-white/[0.08] text-[#9ca3af] hover:text-white'
              }`}>
              {v === 'overview' ? '📊 Overview' : v === 'expenses' ? '📋 Expenses' : '➕ Add'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter ── */}
      <FilterBar
        filter={filter} setFilter={setFilter}
        customFrom={customFrom} setCustomFrom={setCustomFrom}
        customTo={customTo} setCustomTo={setCustomTo}
        onApply={handleApplyCustom}
      />

      {/* ══════════ OVERVIEW ══════════ */}
      {activeView === 'overview' && summary && (
        <div className="space-y-5">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <KPICard label="Total Revenue"  value={summary.totalRevenue}  icon={TrendingUp}   color="text-emerald-400" bg="bg-emerald-500/[0.07]" border="border-emerald-500/20" sub={`${summary.dailySeries?.length || 0} days`}/>
            <KPICard label="Total Expenses" value={summary.totalExpenses} icon={TrendingDown} color="text-orange-400"  bg="bg-orange-500/[0.07]"  border="border-orange-500/20"  sub={`${expenses.length} entries`}/>
            <div className={`${summary.isProfit ? 'bg-emerald-500/[0.07] border-emerald-500/20' : 'bg-red-500/[0.07] border-red-500/20'} border rounded-2xl p-5 hover:scale-[1.02] transition-transform`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-[#6b7280] uppercase tracking-widest">Net Profit/Loss</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${summary.isProfit ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  {summary.isProfit ? <TrendingUp size={16} className="text-emerald-400"/> : <TrendingDown size={16} className="text-red-400"/>}
                </div>
              </div>
              <p className={`text-2xl lg:text-3xl font-black ${summary.isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                {summary.isProfit ? '+' : '-'}₹{Math.abs(summary.netProfit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className={`text-[11px] mt-1 font-bold ${summary.isProfit ? 'text-emerald-600' : 'text-red-500'}`}>
                {summary.isProfit ? '✓ Profitable' : '⚠ In Loss'}
              </p>
            </div>
            <div className="bg-sky-500/[0.07] border border-sky-500/20 rounded-2xl p-5 hover:scale-[1.02] transition-transform">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-[#6b7280] uppercase tracking-widest">Break-even</p>
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                  <Target size={16} className="text-sky-400"/>
                </div>
              </div>
              {summary.breakEvenDays ? (
                <>
                  <p className="text-2xl lg:text-3xl font-black text-sky-400">{summary.breakEvenDays}d</p>
                  <p className="text-[11px] text-[#6b7280] mt-1">to cover all expenses</p>
                </>
              ) : (
                <p className="text-sm text-[#4b5563] mt-2">No revenue data</p>
              )}
            </div>
          </div>

          {/* Profit indicator bar */}
          {summary.totalRevenue > 0 && (
            <div className={`${C.panel} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-white">Revenue vs Expenses</p>
                <span className={`text-xs font-black px-3 py-1 rounded-full ${summary.isProfit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {summary.isProfit ? `${((summary.netProfit/summary.totalRevenue)*100).toFixed(1)}% margin` : `${((-summary.netProfit/summary.totalRevenue)*100).toFixed(1)}% over-spent`}
                </span>
              </div>
              <div className="h-6 bg-white/[0.04] rounded-full overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (summary.totalRevenue / Math.max(summary.totalRevenue, summary.totalExpenses)) * 100)}%` }}/>
                <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-black">
                  <span className="text-white">Revenue: ₹{summary.totalRevenue.toLocaleString('en-IN')}</span>
                  <span className="text-[#9ca3af]">Exp: ₹{summary.totalExpenses.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Charts row */}
          <div className="grid lg:grid-cols-2 gap-4 lg:gap-5">

            {/* Revenue vs Expenses bar chart */}
            <div className={`${C.panel} p-5`}>
              <p className="text-sm font-black text-white mb-4">Daily Revenue vs Expenses</p>
              {summary.dailySeries?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={summary.dailySeries} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fill: '#4b5563', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fill: '#4b5563', fontSize: 10 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                    <Bar dataKey="revenue"  name="Revenue"  fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#e63946" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-[#4b5563] text-sm">No data for this period</div>
              )}
            </div>

            {/* Expense pie chart */}
            <div className={`${C.panel} p-5`}>
              <p className="text-sm font-black text-white mb-4">Expenses by Category</p>
              {summary.categoryData?.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={220}>
                    <PieChart>
                      <Pie data={summary.categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                        {summary.categoryData.map((entry, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {summary.categoryData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[d.name] || PIE_COLORS[i] }}/>
                          <span className="text-[11px] text-[#9ca3af] capitalize">{d.name}</span>
                        </div>
                        <span className="text-[11px] font-black text-white">₹{d.value.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-[#4b5563] text-sm">No expense data</div>
              )}
            </div>
          </div>

          {/* Profit trend line */}
          {summary.dailySeries?.length > 1 && (
            <div className={`${C.panel} p-5`}>
              <p className="text-sm font-black text-white mb-4">Profit/Loss Trend</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={summary.dailySeries} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: '#4b5563', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fill: '#4b5563', fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={2} dot={false}
                    stroke={summary.isProfit ? '#10b981' : '#e63946'} />
                  {/* Zero reference */}
                  <Line type="monotone" dataKey={() => 0} name="" stroke="rgba(255,255,255,0.1)" strokeWidth={1} dot={false} strokeDasharray="4 4" legendType="none"/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Break-even visual */}
          {summary.breakEvenDays && (
            <div className={`${C.panel} p-5`}>
              <div className="flex items-center gap-2 mb-4">
                <Target size={16} className="text-sky-400"/>
                <p className="text-sm font-black text-white">Break-even Analysis</p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-white/[0.03] rounded-xl p-4 text-center">
                  <p className="text-[10px] text-[#6b7280] uppercase tracking-widest mb-1">Daily Avg Revenue</p>
                  <p className="text-lg font-black text-emerald-400">₹{summary.avgDailyRevenue?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 text-center">
                  <p className="text-[10px] text-[#6b7280] uppercase tracking-widest mb-1">Total Expenses</p>
                  <p className="text-lg font-black text-orange-400">₹{summary.totalExpenses?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-sky-500/[0.07] border border-sky-500/20 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-sky-400 uppercase tracking-widest mb-1 font-black">Break-even In</p>
                  <p className="text-lg font-black text-sky-400">{summary.breakEvenDays} Days</p>
                </div>
              </div>
              <div className="mt-4 h-3 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${summary.isProfit ? 'bg-gradient-to-r from-sky-600 to-emerald-400' : 'bg-gradient-to-r from-orange-600 to-red-500'}`}
                  style={{ width: `${Math.min(100, (summary.dailySeries?.length || 0) / summary.breakEvenDays * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-[#4b5563] mt-2">
                {summary.dailySeries?.length || 0} days elapsed of {summary.breakEvenDays} day break-even target
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══════════ EXPENSES LIST ══════════ */}
      {activeView === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm font-black text-white">{expenses.length} Expense Records</p>
            <div className="flex gap-2">
              <button onClick={downloadTemplate} className={C.btnGhost}>
                <Download size={13}/> CSV Template
              </button>
              <button onClick={() => fileRef.current?.click()} className={C.btnGhost}>
                <FileSpreadsheet size={13}/> Import CSV
              </button>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload}/>
            </div>
          </div>

          {expenses.length === 0 ? (
            <div className={`${C.panel} p-16 text-center`}>
              <DollarSign size={32} className="text-white/10 mx-auto mb-3"/>
              <p className="text-[#4b5563] text-sm">No expenses recorded for this period</p>
              <button onClick={() => setActiveView('add')} className={`${C.btnPrimary} mx-auto mt-4`}><Plus size={13}/> Add Expense</button>
            </div>
          ) : (
            <div className={`${C.panel} overflow-hidden`}>
              {/* Header */}
              <div className="grid grid-cols-5 px-5 py-3 bg-white/[0.03] text-[10px] font-black text-[#4b5563] uppercase tracking-widest border-b border-white/[0.06]">
                <div>Date</div><div>Category</div><div>Description</div><div>Vendor</div><div className="text-right">Amount</div>
              </div>
              <div className="max-h-[500px] overflow-y-auto divide-y divide-white/[0.04]">
                {expenses.map(exp => (
                  <div key={exp.id} className="grid grid-cols-5 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group items-center">
                    <p className="text-xs text-[#9ca3af]">{exp.date}</p>
                    <div>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-full border uppercase tracking-wider`}
                        style={{ backgroundColor: CATEGORY_COLORS[exp.category]+'18', borderColor: CATEGORY_COLORS[exp.category]+'40', color: CATEGORY_COLORS[exp.category] }}>
                        {exp.category}
                      </span>
                    </div>
                    <p className="text-xs text-white font-bold truncate pr-2">{exp.description || '—'}</p>
                    <p className="text-xs text-[#6b7280] truncate">{exp.vendor || '—'}</p>
                    <div className="flex items-center justify-end gap-3">
                      <p className="text-sm font-black text-[#e63946]">₹{parseFloat(exp.amount).toLocaleString('en-IN')}</p>
                      <button onClick={() => handleDelete(exp.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 text-red-400 transition-all">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Total row */}
              <div className="grid grid-cols-5 px-5 py-3 bg-white/[0.03] border-t border-white/[0.06]">
                <div className="col-span-4 text-[10px] font-black text-[#6b7280] uppercase tracking-widest">Total</div>
                <p className="text-sm font-black text-[#e63946] text-right">
                  ₹{expenses.reduce((s, e) => s + parseFloat(e.amount), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ ADD EXPENSE ══════════ */}
      {activeView === 'add' && (
        <div className="max-w-lg space-y-4">
          <div className={`${C.panel} p-6`}>
            <h3 className="font-black text-white text-base mb-5">Add Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-[#4b5563] uppercase tracking-widest block mb-1.5">Category *</label>
                  <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))} className={C.input}>
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-gray-900 capitalize">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#4b5563] uppercase tracking-widest block mb-1.5">Amount (₹) *</label>
                  <input type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} placeholder="0.00" required className={C.input}/>
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#4b5563] uppercase tracking-widest block mb-1.5">Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} required className={C.input}/>
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#4b5563] uppercase tracking-widest block mb-1.5">Vendor</label>
                  <input type="text" value={form.vendor} onChange={e => setForm(p => ({...p, vendor: e.target.value}))} placeholder="Supplier name" className={C.input}/>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-[#4b5563] uppercase tracking-widest block mb-1.5">Description</label>
                  <input type="text" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="What was this expense for?" className={C.input}/>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setActiveView('expenses')} className={`flex-1 ${C.btnGhost} justify-center`}>Cancel</button>
                <button type="submit" disabled={saving} className={`flex-1 ${C.btnPrimary} justify-center`}>
                  {saving ? <Loader size={13} className="animate-spin"/> : <Plus size={13}/>}
                  {saving ? 'Saving...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>

          {/* Bulk import section */}
          <div className={`${C.panel} p-6`}>
            <h3 className="font-black text-white text-sm mb-2">Bulk Import via CSV</h3>
            <p className="text-[11px] text-[#6b7280] mb-4">Upload a CSV with columns: category, amount, date, description, vendor</p>
            <div className="flex gap-3">
              <button onClick={downloadTemplate} className={C.btnGhost}>
                <Download size={13}/> Download Template
              </button>
              <button onClick={() => fileRef.current?.click()} className={C.btnPrimary}>
                <Upload size={13}/> Upload CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ BULK PREVIEW MODAL ══════════ */}
      <AnimatePresence>
        {bulkPreview && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              className="bg-[#111115] border border-white/[0.08] rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-white">Preview — {bulkRows.length} rows</h3>
                <button onClick={() => { setBulkPreview(false); setBulkRows([]); }}><X size={18} className="text-[#6b7280] hover:text-white"/></button>
              </div>
              <div className="overflow-auto flex-1 rounded-xl border border-white/[0.06]">
                <table className="w-full text-xs">
                  <thead className="bg-white/[0.04]">
                    <tr>{['Category','Amount','Date','Description','Vendor'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black text-[#4b5563] uppercase tracking-widest">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {bulkRows.map((r, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-[#9ca3af] capitalize">{r.category}</td>
                        <td className="px-4 py-2.5 font-black text-[#e63946]">₹{parseFloat(r.amount).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2.5 text-[#9ca3af]">{r.date}</td>
                        <td className="px-4 py-2.5 text-white">{r.description || '—'}</td>
                        <td className="px-4 py-2.5 text-[#6b7280]">{r.vendor || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setBulkPreview(false); setBulkRows([]); }} className={`flex-1 ${C.btnGhost} justify-center`}>Cancel</button>
                <button onClick={handleBulkUpload} disabled={saving} className={`flex-1 ${C.btnPrimary} justify-center`}>
                  {saving ? <Loader size={13} className="animate-spin"/> : <Upload size={13}/>}
                  {saving ? 'Importing...' : `Import ${bulkRows.length} Rows`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FinanceTab;