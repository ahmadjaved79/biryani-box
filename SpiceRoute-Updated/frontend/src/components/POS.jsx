import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
const MotionDiv = motion.div;
import { useOrders } from '../context/useContextHooks';
import { tablesAPI } from '../api/index.js';
import { ShoppingCart, Plus, Minus, CheckCircle, Loader, LayoutGrid } from 'lucide-react';

import heroBiryani from '../assets/hero-biryani.png';
import muttonBiryani from '../assets/mutton-biryani.png';
import chickenTikka from '../assets/chicken-tikka.png';
import rasmalai from '../assets/rasmalai.png';

const POS = ({ user }) => {
  const { menu, createOrder } = useOrders();
  const [cart, setCart] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('Biryani');
  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [orderType, setOrderType] = useState('dine-in');

  // Fetch available tables from DB
  useEffect(() => {
    tablesAPI.getAll()
      .then(r => {
        const available = (r.data || []).filter(t => t.status === 'available');
        setTables(available);
        setTablesLoading(false);
      })
      .catch(() => setTablesLoading(false));
  }, []);

  const categories = menu.length > 0
    ? [...new Set(menu.map(i => i.category).filter(Boolean))]
    : ['Biryani', 'Starters', 'Breads', 'Curries', 'Desserts', 'Beverages'];

  const getCategoryImage = (item) => {
    const imageMap = { heroBiryani, muttonBiryani, chickenTikka, rasmalai };
    if (item.image && imageMap[item.image]) return imageMap[item.image];
    if (item.category === 'Biryani') return heroBiryani;
    if (item.category === 'Appetizers') return chickenTikka;
    if (item.category === 'Dessert') return rasmalai;
    if (item.category === 'Combos') return muttonBiryani;
    return heroBiryani;
  };

  const filteredMenu = menu.filter(item => item.category === activeTab && item.is_available !== false);

  const addToCart = (item) => {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId) => {
    const existing = cart.find(i => i.id === itemId);
    if (!existing) return;
    if (existing.quantity > 1) {
      setCart(cart.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i));
    } else {
      setCart(cart.filter(i => i.id !== itemId));
    }
  };

  const toggleTable = (tableId) => {
    setSelectedTables(prev =>
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    );
  };

  const getTableLabel = () => {
    if (orderType === 'takeaway') return 'Takeaway';
    if (selectedTables.length === 0) return 'No table selected';
    const labels = selectedTables.map(id => {
      const t = tables.find(tbl => tbl.id === id);
      return t ? `T${t.table_number}` : id;
    });
    return labels.join(', ');
  };

  const submitOrder = async () => {
    if (cart.length === 0) return;
    if (orderType === 'dine-in' && selectedTables.length === 0) {
      alert('Please select at least one table.'); return;
    }

    const primaryTable = selectedTables[0];
    const primaryTableObj = tables.find(t => t.id === primaryTable);
    const tableLabel = orderType === 'takeaway' ? 'Takeaway' : getTableLabel();

    const result = await createOrder(cart, tableLabel, primaryTable, { order_type: orderType });
    if (result && result.error) { alert(result.error); return; }

    setCart([]);
    setSelectedTables([]);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="grid lg:grid-cols-4 gap-8 h-[calc(100vh-160px)]">
      {/* Menu Area */}
      <div className="lg:col-span-3 space-y-6 overflow-y-auto pr-4 scrollbar-hide">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold font-heading mb-1 text-white">Gourmet Selection</h2>
            <p className="text-text-muted text-sm font-medium">Add premium items to the active booking.</p>
          </div>
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 overflow-x-auto scrollbar-hide w-full md:w-auto">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveTab(cat)}
                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:text-white hover:bg-white/5'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table/Order Type selector */}
        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
          {/* Order type toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-text-muted shrink-0">Order Type:</span>
            <div className="flex gap-2">
              {[{ id:'dine-in', label:'Dine In' }, { id:'takeaway', label:'Takeaway' }].map(t => (
                <button key={t.id} onClick={() => { setOrderType(t.id); if (t.id === 'takeaway') setSelectedTables([]); }}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${orderType === t.id ? 'bg-primary text-white border-primary' : 'bg-transparent text-text-muted border-white/10 hover:border-white/30'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Available tables from DB */}
          {orderType === 'dine-in' && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <LayoutGrid size={13} className="text-text-muted" />
                <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Available Tables (click to select):</span>
                {selectedTables.length > 0 && (
                  <span className="text-xs text-primary font-bold">{selectedTables.length} selected</span>
                )}
              </div>
              {tablesLoading ? (
                <div className="flex items-center gap-2 py-2"><Loader size={14} className="animate-spin text-primary" /><span className="text-xs text-text-muted">Loading tables...</span></div>
              ) : tables.length === 0 ? (
                <p className="text-xs text-amber-400">No available tables at the moment.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tables.map(t => {
                    const isSelected = selectedTables.includes(t.id);
                    return (
                      <button key={t.id} onClick={() => toggleTable(t.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border whitespace-nowrap ${isSelected ? 'bg-primary text-white border-primary' : 'bg-transparent text-text-muted border-white/10 hover:border-white/30 hover:text-white'}`}>
                        <span>T{t.table_number}</span>
                        {t.section && t.section !== 'main' && <span className="ml-1 text-[10px] opacity-70">({t.section})</span>}
                        <span className="ml-1 text-[10px] opacity-60">👥{t.capacity}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Menu grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="wait">
            {filteredMenu.map(item => (
              <MotionDiv key={item.id} initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }}
                whileHover={{ y:-8 }} onClick={() => addToCart(item)}
                className="bg-secondary/40 rounded-3xl border border-white/5 p-5 cursor-pointer group transition-all hover:border-primary/50 flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary filter blur-3xl opacity-0 group-hover:opacity-10 transition-opacity" />
                <div className="flex-1">
                  <div className="aspect-video bg-bg-main rounded-2xl mb-4 overflow-hidden relative border border-white/5">
                    <img src={getCategoryImage(item)} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute bottom-2 right-2 bg-primary/20 backdrop-blur-md text-primary text-[10px] font-bold px-3 py-1 rounded-full border border-primary/20">{item.category}</div>
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors leading-tight">{item.name}</h3>
                    <p className="text-lg font-bold text-white">₹{item.price}</p>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed line-clamp-2">Authentic recipe crafted with premium saffron and heritage spices.</p>
                </div>
                <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all text-xs font-bold uppercase tracking-widest">
                  <Plus size={16} /> Add to Box
                </button>
              </MotionDiv>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Cart Area */}
      <div className="lg:col-span-1 bg-secondary/40 backdrop-blur-md p-8 rounded-3xl border border-white/5 flex flex-col relative overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold font-heading text-white">Cart Summary</h3>
            <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase mt-1">Status: Active Booking</p>
          </div>
          <span className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner"><ShoppingCart size={24} /></span>
        </div>

        {/* Selected table indicator */}
        {(selectedTables.length > 0 || orderType === 'takeaway') && (
          <div className="mb-4 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 text-xs text-primary font-bold">
            📍 {getTableLabel()}
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto mb-6 pr-2 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-30 space-y-4">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center"><Plus size={32} /></div>
              <p className="text-xs font-bold uppercase tracking-widest">The Box is Empty</p>
            </div>
          ) : (
            cart.map(item => (
              <MotionDiv key={item.id} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
                className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 group hover:border-primary/20 transition-all">
                <div className="w-12 h-12 rounded-xl bg-bg-main overflow-hidden border border-white/10 shrink-0">
                  <img src={getCategoryImage(item)} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                  <p className="text-[10px] text-primary font-bold tracking-wider">₹{(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3 bg-bg-main/50 p-1.5 rounded-full border border-white/10">
                  <button onClick={e => { e.stopPropagation(); removeFromCart(item.id); }} className="w-6 h-6 text-white flex items-center justify-center rounded-full hover:bg-red-500 transition-colors"><Minus size={12} /></button>
                  <span className="text-xs font-bold w-4 text-center text-white">{item.quantity}</span>
                  <button onClick={e => { e.stopPropagation(); addToCart(item); }} className="w-6 h-6 text-white flex items-center justify-center rounded-full hover:bg-primary transition-colors"><Plus size={12} /></button>
                </div>
              </MotionDiv>
            ))
          )}
        </div>

        <div className="pt-6 border-t border-white/10 space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-text-muted font-bold uppercase tracking-wider">
              <span>Service Table</span>
              <span className="text-white text-right max-w-[120px] truncate">{getTableLabel()}</span>
            </div>
            <div className="flex justify-between items-center text-xl font-bold text-white font-heading">
              <span>Settlement</span>
              <span className="text-primary">₹{total.toFixed(2)}</span>
            </div>
          </div>
          <button onClick={submitOrder} disabled={cart.length === 0 || (orderType === 'dine-in' && selectedTables.length === 0)}
            className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest transition-all shadow-xl ${(cart.length === 0 || (orderType === 'dine-in' && selectedTables.length === 0)) ? 'bg-white/5 text-text-muted cursor-not-allowed border border-white/5' : 'bg-primary text-white hover:bg-primary-hover shadow-primary/20'}`}>
            <CheckCircle size={22} />
            CONFIRM BOOKING
          </button>
          {orderType === 'dine-in' && selectedTables.length === 0 && cart.length > 0 && (
            <p className="text-center text-xs text-amber-400">⚠ Select a table to confirm</p>
          )}
        </div>

        <AnimatePresence>
          {showSuccess && (
            <MotionDiv initial={{ opacity:0, y:50, scale:0.9 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, scale:0.9 }}
              className="absolute inset-x-4 bottom-6 bg-green-500 text-white p-5 rounded-2xl shadow-2xl flex items-center gap-4 z-50 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white/50 animate-pulse" />
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><CheckCircle size={24} /></div>
              <div className="flex-1">
                <p className="font-bold text-sm tracking-tight">Broadcast Success!</p>
                <p className="text-[10px] font-medium opacity-90 uppercase tracking-widest">Sent to Command Center</p>
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default POS;