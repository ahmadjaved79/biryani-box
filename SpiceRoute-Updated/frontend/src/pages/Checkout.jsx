import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart, useAuth } from '../context/useContextHooks';
import { useNavigate } from 'react-router-dom';
import { ordersAPI } from '../api/index.js';
import {
  CreditCard, MapPin, CheckCircle, ChevronLeft,
  ShieldCheck, Printer, Loader, AlertCircle,
} from 'lucide-react';

const Checkout = () => {
  const { cart, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate  = useNavigate();

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

  // Guard against double-submit (React StrictMode / accidental double-click)
  const submitting = useRef(false);

  if (cart.length === 0 && step === 1) {
    navigate('/cart');
    return null;
  }

  const handleCheckout = async (e) => {
    e.preventDefault();

    // Prevent double submit
    if (submitting.current || loading) return;
    submitting.current = true;

    setLoading(true);
    setApiError('');

    try {
      const res = await ordersAPI.create({
        items:            cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        customer_name:    customerName  || user?.name  || 'Guest',
        customer_phone:   customerPhone || user?.phone || null,
        customer_email:   user?.email   || null,
        order_type:       orderType,
        delivery_address: orderType === 'delivery' ? deliveryAddress : null,
        special_instructions: specialInstr || null,
        payment_method:   paymentMethod,
      });

      setOrderNumber(res.data.id);
      clearCart();
      setStep(2);
    } catch (err) {
      // Show the real error — never silently create a fake order
      const msg = err.response?.data?.error || err.message || 'Order failed. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  const inputClass = "w-full bg-bg-main border border-white/10 p-3 rounded-xl text-sm text-white focus:border-primary outline-none transition-colors placeholder-text-muted";

  return (
    <div className="min-h-screen bg-bg-main text-white p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />

      <div className="container max-w-4xl mx-auto relative z-10">
        <button onClick={() => navigate('/cart')}
          className="flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-10 group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to Cart
        </button>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="details" initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, scale:0.95 }}
              className="grid lg:grid-cols-3 gap-10">

              {/* ── Form ── */}
              <div className="lg:col-span-2 space-y-6">
                <h1 className="text-3xl font-bold">Checkout</h1>

                {/* Order type */}
                <div className="bg-white/3 border border-white/10 rounded-2xl p-6 space-y-4">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Order Type</p>
                  <div className="grid grid-cols-3 gap-3">
                    {['delivery','pickup','dine-in'].map(t => (
                      <button key={t} type="button" onClick={() => setOrderType(t)}
                        className={`py-3 rounded-xl border text-xs font-bold uppercase transition-all ${orderType===t?'border-primary bg-primary/10 text-primary':'border-white/10 bg-white/5 text-text-muted hover:border-white/30'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer info */}
                <div className="bg-white/3 border border-white/10 rounded-2xl p-6 space-y-4">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={14} className="text-primary"/> Your Details
                  </p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Name</label>
                      <input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Your name" className={inputClass}/>
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Phone</label>
                      <input value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="+1 555-0100" className={inputClass}/>
                    </div>
                  </div>
                  {orderType === 'delivery' && (
                    <div>
                      <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Delivery Address *</label>
                      <input value={deliveryAddress} onChange={e=>setDeliveryAddress(e.target.value)} placeholder="Full delivery address" className={inputClass}/>
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Special Instructions</label>
                    <textarea value={specialInstr} onChange={e=>setSpecialInstr(e.target.value)} rows={2} placeholder="Allergies, preferences..." className={`${inputClass} resize-none`}/>
                  </div>
                </div>

                {/* Payment */}
                <div className="bg-white/3 border border-white/10 rounded-2xl p-6 space-y-4">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <CreditCard size={14} className="text-primary"/> Payment Method
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {['card','upi','cash'].map(p => (
                      <button key={p} type="button" onClick={() => setPaymentMethod(p)}
                        className={`py-4 rounded-xl border text-xs font-bold uppercase transition-all flex flex-col items-center gap-2 ${paymentMethod===p?'border-primary bg-primary/10 text-primary':'border-white/10 bg-white/5 text-text-muted hover:border-white/30'}`}>
                        <ShieldCheck size={16} className={paymentMethod===p?'opacity-100':'opacity-30'}/>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {apiError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm">
                    <AlertCircle size={18} className="flex-shrink-0"/>
                    {apiError}
                  </div>
                )}
              </div>

              {/* ── Summary ── */}
              <div className="lg:col-span-1">
                <div className="bg-white/3 border border-white/10 rounded-2xl p-6 sticky top-6">
                  <h2 className="text-lg font-bold mb-5">Order Summary</h2>
                  <div className="space-y-3 mb-5 max-h-48 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-text-muted">{item.name} <span className="text-white font-bold">×{item.quantity}</span></span>
                        <span className="text-white">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/10 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between text-text-muted"><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
                    <div className="flex justify-between text-text-muted"><span>Tax (8%)</span><span>${(total * 0.08).toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-base pt-2 border-t border-white/10">
                      <span>Total</span>
                      <span className="text-primary">${(total * 1.08).toFixed(2)}</span>
                    </div>
                  </div>
                  <button onClick={handleCheckout} disabled={loading || cart.length === 0}
                    className="btn-primary w-full py-4 mt-5 flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-60">
                    {loading ? <><Loader size={16} className="animate-spin"/> Placing Order…</> : <><ShieldCheck size={16}/> Place Order</>}
                  </button>
                  {user && (
                    <p className="text-[10px] text-text-muted text-center mt-3">
                      Ordering as <span className="text-primary font-bold">{user.name}</span>
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="success" initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
              className="py-24 text-center space-y-8 max-w-lg mx-auto">
              <div className="relative inline-block">
                <CheckCircle size={80} className="text-primary mx-auto relative z-10"/>
                <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full animate-pulse"/>
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-3">Order Confirmed!</h2>
                <p className="text-text-muted text-sm">Your order is now being prepared. You can track its status below.</p>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-xl py-3 px-6 inline-flex items-center gap-3">
                <ShieldCheck size={16} className="text-primary"/>
                <span className="text-xs font-bold uppercase tracking-widest text-primary">{orderNumber}</span>
              </div>
              <div className="flex gap-4 justify-center flex-wrap">
                <button onClick={() => window.print()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">
                  <Printer size={14}/> Print Receipt
                </button>
                <button onClick={() => navigate(user?.role === 'customer' ? '/customer/dashboard' : '/')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-all">
                  Track My Order
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