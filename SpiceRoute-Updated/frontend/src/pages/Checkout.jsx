import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart, useAuth } from '../context/useContextHooks';
import { useNavigate } from 'react-router-dom';
import { ordersAPI, tablesAPI, customerDashboardAPI } from '../api/index.js';
import {
  CreditCard, MapPin, CheckCircle, ChevronLeft, ShieldCheck,
  Printer, Loader, AlertCircle, Utensils, Gift, Users, Zap,
} from 'lucide-react';

// ── Table selector for dine-in ─────────────────────────────────────────────────
const TableSelector = ({ selected, onSelect }) => {
  const [tables,  setTables]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tablesAPI.getAll()
      .then(r => setTables((r.data || []).filter(t => t.status === 'available')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusColor = {
    available: 'border-green-500/40 bg-green-500/10 text-green-400',
    occupied:  'border-red-500/30 bg-red-500/5 text-red-400',
    reserved:  'border-yellow-500/30 bg-yellow-500/5 text-yellow-400',
    cleaning:  'border-blue-500/30 bg-blue-500/5 text-blue-400',
  };

  if (loading) return (
    <div className="grid grid-cols-4 gap-2 animate-pulse">
      {[...Array(8)].map((_,i) => <div key={i} className="h-16 bg-white/5 rounded-xl"/>)}
    </div>
  );

  if (!tables.length) return (
    <div className="text-center py-6 text-text-muted text-sm">
      <Utensils size={28} className="mx-auto mb-2 opacity-30"/>
      No tables available right now
    </div>
  );

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {tables.map(table => {
        const isSelected = selected?.id === table.id;
        return (
          <motion.button
            key={table.id}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(isSelected ? null : table)}
            className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all text-center ${
              isSelected
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-white/10 bg-white/3 text-white hover:border-white/30'
            }`}
          >
            <p className="text-xl font-black">{table.table_number}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5 opacity-70">
              {table.capacity} seats
            </p>
            {isSelected && (
              <motion.span
                initial={{ scale:0 }} animate={{ scale:1 }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
              >
                <CheckCircle size={12} className="text-white"/>
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

// ── Rewards toggle ─────────────────────────────────────────────────────────────
const POINTS_TO_DOLLAR = 100; // 100 points = $1 discount

const RewardsToggle = ({ points, applied, onToggle, discount }) => {
  if (!points || points < POINTS_TO_DOLLAR) return null;
  const maxDiscount = (points / POINTS_TO_DOLLAR).toFixed(2);
  return (
    <motion.div
      initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      className={`border rounded-2xl p-4 transition-all ${
        applied ? 'border-primary/40 bg-primary/8' : 'border-white/10 bg-white/3'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${applied ? 'bg-primary' : 'bg-white/10'}`}>
            <Gift size={16} className={applied ? 'text-white' : 'text-text-muted'}/>
          </div>
          <div>
            <p className="font-bold text-white text-sm">Loyalty Rewards</p>
            <p className="text-text-muted text-xs">{points} pts available · max ${maxDiscount} off</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
            applied
              ? 'bg-primary text-white'
              : 'bg-white/10 text-text-muted hover:bg-white/20 hover:text-white'
          }`}
        >
          {applied ? `−$${discount.toFixed(2)} Applied` : 'Apply'}
        </button>
      </div>
      {applied && (
        <motion.p initial={{opacity:0}} animate={{opacity:1}} className="text-primary text-xs mt-2 font-bold">
          ✓ {Math.round(discount * POINTS_TO_DOLLAR)} points will be deducted from your account
        </motion.p>
      )}
    </motion.div>
  );
};

// ── Main Checkout ──────────────────────────────────────────────────────────────
const Checkout = () => {
  const { cart, total, clearCart } = useCart();
  const { user }                   = useAuth();
  const navigate                   = useNavigate();
  const submitting                 = useRef(false);

  const [step,            setStep]            = useState(1);
  const [paymentMethod,   setPaymentMethod]   = useState('card');
  const [customerName,    setCustomerName]    = useState(user?.name  || '');
  const [customerPhone,   setCustomerPhone]   = useState(user?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [orderType,       setOrderType]       = useState('delivery');
  const [specialInstr,    setSpecialInstr]    = useState('');
  const [loading,         setLoading]         = useState(false);
  const [orderNumber,     setOrderNumber]     = useState('');
  const [apiError,        setApiError]        = useState('');

  // Table selection
  const [selectedTable, setSelectedTable] = useState(null);

  // Rewards
  const [loyaltyPoints,  setLoyaltyPoints]  = useState(0);
  const [rewardsApplied, setRewardsApplied] = useState(false);
  const rewardDiscount   = rewardsApplied ? Math.min(total * 0.5, loyaltyPoints / POINTS_TO_DOLLAR) : 0;
  const subtotal         = total;
  const tax              = subtotal * 0.08;
  const grandTotal       = Math.max(0, subtotal + tax - rewardDiscount);

  useEffect(() => {
    if (user?.role === 'customer') {
      customerDashboardAPI.getProfile()
        .then(r => setLoyaltyPoints(r.data?.loyalty_points || 0))
        .catch(() => {});
    }
  }, [user]);

  if (cart.length === 0 && step === 1) { navigate('/cart'); return null; }

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (submitting.current || loading) return;

    // Validation
    if (orderType === 'dine-in' && !selectedTable) {
      setApiError('Please select a table for dine-in.');
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      setApiError('Please enter your delivery address.');
      return;
    }

    submitting.current = true;
    setLoading(true);
    setApiError('');

    try {
      const res = await ordersAPI.create({
        items:                cart.map(i => ({ id:i.id, name:i.name, price:i.price, quantity:i.quantity })),
        customer_name:        customerName || user?.name || 'Guest',
        customer_phone:       customerPhone || user?.phone || null,
        customer_email:       user?.email || null,
        order_type:           orderType,
        delivery_address:     orderType === 'delivery' ? deliveryAddress : null,
        table_id:             selectedTable?.id || null,
        table_number:         selectedTable?.table_number || null,
        special_instructions: specialInstr || null,
        payment_method:       paymentMethod,
        reward_discount:      rewardDiscount > 0 ? rewardDiscount : undefined,
        points_used:          rewardsApplied ? Math.round(rewardDiscount * POINTS_TO_DOLLAR) : 0,
      });

      setOrderNumber(res.data.id);
      clearCart();
      setStep(2);
    } catch (err) {
      setApiError(err.response?.data?.error || err.message || 'Order failed. Please try again.');
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  const inp = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-colors placeholder-text-muted";

  return (
    <div className="min-h-screen bg-bg-main text-white p-4 md:p-10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/8 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"/>

      <div className="container max-w-4xl mx-auto relative z-10">
        <button onClick={() => navigate('/cart')}
          className="flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-8 group text-sm">
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform"/>
          Back to Cart
        </button>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="form" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,scale:0.95}}
              className="grid lg:grid-cols-3 gap-8">

              {/* Left form */}
              <div className="lg:col-span-2 space-y-5">
                <h1 className="text-3xl font-black">Checkout</h1>

                {/* Order Type */}
                <div className="bg-white/3 border border-white/10 rounded-2xl p-5 space-y-4">
                  <p className="text-[11px] font-black text-text-muted uppercase tracking-widest">Order Type</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id:'delivery', label:'🛵 Delivery' },
                      { id:'pickup',   label:'🏃 Pickup' },
                      { id:'dine-in',  label:'🍽️ Dine-In' },
                    ].map(t => (
                      <motion.button
                        key={t.id}
                        type="button"
                        whileTap={{ scale:0.97 }}
                        onClick={() => { setOrderType(t.id); setSelectedTable(null); setApiError(''); }}
                        className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                          orderType===t.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-white/10 bg-white/3 text-text-muted hover:border-white/30 hover:text-white'
                        }`}
                      >
                        {t.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Table selector — only for dine-in */}
                <AnimatePresence>
                  {orderType === 'dine-in' && (
                    <motion.div
                      initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                      className="overflow-hidden"
                    >
                      <div className={`bg-white/3 border-2 rounded-2xl p-5 space-y-4 transition-all ${
                        selectedTable ? 'border-green-500/40' : 'border-primary/30'
                      }`}>
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                            <Utensils size={13} className="text-primary"/> Select Table <span className="text-red-400">*</span>
                          </p>
                          {selectedTable && (
                            <motion.span initial={{scale:0}} animate={{scale:1}}
                              className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full font-bold">
                              Table {selectedTable.table_number} Selected ✓
                            </motion.span>
                          )}
                        </div>
                        <TableSelector selected={selectedTable} onSelect={setSelectedTable}/>
                        {!selectedTable && (
                          <p className="text-yellow-400 text-xs flex items-center gap-1">
                            <AlertCircle size={12}/> You must select a table to place a dine-in order
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Customer Details */}
                <div className="bg-white/3 border border-white/10 rounded-2xl p-5 space-y-4">
                  <p className="text-[11px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={13} className="text-primary"/> Your Details
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Name</label>
                      <input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Your name" className={inp}/>
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Phone</label>
                      <input value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="+91 98765 43210" className={inp}/>
                    </div>
                  </div>
                  {orderType === 'delivery' && (
                    <div>
                      <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Delivery Address *</label>
                      <input value={deliveryAddress} onChange={e=>setDeliveryAddress(e.target.value)} placeholder="Full delivery address" className={inp}/>
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Special Instructions</label>
                    <textarea value={specialInstr} onChange={e=>setSpecialInstr(e.target.value)} rows={2}
                      placeholder="Allergies, extra spicy, no onions…" className={`${inp} resize-none`}/>
                  </div>
                </div>

                {/* Rewards */}
                <RewardsToggle
                  points={loyaltyPoints}
                  applied={rewardsApplied}
                  onToggle={() => setRewardsApplied(r => !r)}
                  discount={rewardDiscount}
                />

                {/* Payment */}
                <div className="bg-white/3 border border-white/10 rounded-2xl p-5 space-y-4">
                  <p className="text-[11px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <CreditCard size={13} className="text-primary"/> Payment Method
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {['card','upi','cash'].map(p => (
                      <motion.button key={p} type="button" whileTap={{scale:0.97}} onClick={() => setPaymentMethod(p)}
                        className={`py-4 rounded-xl border text-xs font-bold uppercase transition-all flex flex-col items-center gap-1.5 ${
                          paymentMethod===p
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-white/10 bg-white/3 text-text-muted hover:border-white/30 hover:text-white'
                        }`}>
                        <ShieldCheck size={16} className={paymentMethod===p ? 'opacity-100' : 'opacity-30'}/>
                        {p.toUpperCase()}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {apiError && (
                  <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
                    className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm">
                    <AlertCircle size={16} className="flex-shrink-0"/>{apiError}
                  </motion.div>
                )}
              </div>

              {/* Right summary */}
              <div className="lg:col-span-1">
                <div className="bg-white/3 border border-white/10 rounded-2xl p-5 sticky top-6">
                  <h2 className="text-base font-black mb-4">Order Summary</h2>

                  {/* Items */}
                  <div className="space-y-2 mb-4 max-h-44 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-text-muted truncate mr-2">
                          {item.name} <span className="text-white font-bold">×{item.quantity}</span>
                        </span>
                        <span className="text-white flex-shrink-0">${(item.price*item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="border-t border-white/10 pt-3 space-y-2 text-sm">
                    <div className="flex justify-between text-text-muted">
                      <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-text-muted">
                      <span>Tax (8%)</span><span>${tax.toFixed(2)}</span>
                    </div>
                    {rewardsApplied && rewardDiscount > 0 && (
                      <motion.div initial={{opacity:0}} animate={{opacity:1}}
                        className="flex justify-between text-green-400 font-bold">
                        <span className="flex items-center gap-1"><Gift size={12}/> Rewards</span>
                        <span>−${rewardDiscount.toFixed(2)}</span>
                      </motion.div>
                    )}
                    <div className="flex justify-between font-black text-base pt-2 border-t border-white/10">
                      <span>Total</span>
                      <motion.span key={grandTotal} initial={{scale:1.1}} animate={{scale:1}} className="text-primary">
                        ${grandTotal.toFixed(2)}
                      </motion.span>
                    </div>
                  </div>

                  {/* Selected table badge */}
                  {orderType === 'dine-in' && selectedTable && (
                    <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 text-xs text-green-400 font-bold flex items-center gap-2">
                      <Utensils size={12}/> Table {selectedTable.table_number} · {selectedTable.capacity} seats
                    </div>
                  )}

                  <motion.button
                    type="button"
                    onClick={handleCheckout}
                    disabled={loading || cart.length === 0 || (orderType==='dine-in' && !selectedTable)}
                    whileTap={{ scale:0.98 }}
                    className="w-full py-4 mt-4 bg-primary hover:bg-primary-hover text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? <><Loader size={16} className="animate-spin"/> Placing…</>
                      : <><Zap size={16}/> Place Order — ${grandTotal.toFixed(2)}</>
                    }
                  </motion.button>

                  {orderType === 'dine-in' && !selectedTable && (
                    <p className="text-center text-xs text-yellow-400 mt-2 font-bold">Select a table to continue</p>
                  )}

                  {user && (
                    <p className="text-[10px] text-text-muted text-center mt-3">
                      Ordering as <span className="text-primary font-bold">{user.name}</span>
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="success" initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}
              className="py-20 text-center space-y-6 max-w-lg mx-auto">
              <div className="relative inline-block">
                <motion.div
                  animate={{ rotate:[0,10,-10,0], scale:[1,1.05,1] }}
                  transition={{ duration:0.6, delay:0.2 }}
                >
                  <CheckCircle size={80} className="text-primary mx-auto relative z-10"/>
                </motion.div>
                <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full animate-pulse"/>
              </div>
              <div>
                <h2 className="text-3xl font-black mb-2">Order Confirmed!</h2>
                <p className="text-text-muted text-sm">Your order is being prepared. Track it live below.</p>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-xl py-3 px-6 inline-flex items-center gap-3">
                <ShieldCheck size={16} className="text-primary"/>
                <span className="text-xs font-black uppercase tracking-widest text-primary">{orderNumber}</span>
              </div>
              {rewardsApplied && rewardDiscount > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl py-3 px-6 inline-flex items-center gap-2 text-green-400 text-sm font-bold">
                  <Gift size={14}/> Saved ${rewardDiscount.toFixed(2)} with rewards!
                </div>
              )}
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={() => window.print()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">
                  <Printer size={13}/> Receipt
                </button>
                <button onClick={() => navigate(`/track/${orderNumber}`)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-all">
                  Track Order →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Checkout;