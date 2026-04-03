import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Package, Star, Loader, ChefHat, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { trackingAPI } from '../api/index.js';
import { useAuth } from '../context/useContextHooks';

const statusColors = {
  pending:'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',confirmed:'text-blue-400 bg-blue-500/10 border-blue-500/30',
  preparing:'text-orange-400 bg-orange-500/10 border-orange-500/30',ready:'text-green-400 bg-green-500/10 border-green-500/30',
  served:'text-purple-400 bg-purple-500/10 border-purple-500/30',paid:'text-primary bg-primary/10 border-primary/30',
  cancelled:'text-red-400 bg-red-500/10 border-red-500/30',
};

const OrderHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [trackId, setTrackId] = useState('');

  useEffect(() => {
    if (user?.email) {
      trackingAPI.getByCustomer(user.email).then(r => setOrders(r.data)).catch(() => setOrders([])).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [user]);

  const activeOrders = orders.filter(o => !['paid','cancelled','served'].includes(o.status));
  const pastOrders = orders.filter(o => ['paid','served','cancelled'].includes(o.status));
  const displayed = activeTab === 'active' ? activeOrders : pastOrders;

  return (
    <div className="min-h-screen bg-bg-main text-white">
      <Navbar />
      <div className="container max-w-3xl mx-auto px-6 pt-28 pb-20">
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-1">My <span className="text-primary">Orders</span></h1>
          <p className="text-text-muted">Track and manage your orders</p>
        </div>
        <div className="bg-white/3 border border-white/10 rounded-2xl p-5 mb-8">
          <p className="text-sm font-bold text-white mb-3">🔍 Quick Track by Order ID</p>
          <div className="flex gap-3">
            <input value={trackId} onChange={e => setTrackId(e.target.value.toUpperCase())} placeholder="Enter Order ID e.g. ORD_1234567890"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary"/>
            <button onClick={() => trackId && navigate(`/track/${trackId}`)} className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-all">Track</button>
          </div>
        </div>
        {!user ? (
          <div className="text-center py-16 bg-white/3 border border-white/10 rounded-2xl">
            <ChefHat size={48} className="text-primary/30 mx-auto mb-4"/>
            <h3 className="text-xl font-bold text-white mb-2">Sign In to View Orders</h3>
            <p className="text-text-muted text-sm mb-6">Create an account or sign in to see your order history.</p>
            <button onClick={() => navigate('/auth')} className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-all">Sign In / Register</button>
          </div>
        ) : (
          <>
            <div className="flex gap-3 mb-6">
              {[['active', activeOrders.length],['history', pastOrders.length]].map(([tab,count]) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab===tab?'bg-primary text-white':'bg-white/5 border border-white/10 text-text-muted hover:text-white'}`}>
                  {tab} ({count})
                </button>
              ))}
            </div>
            {loading ? <div className="flex justify-center py-20"><Loader className="animate-spin text-primary" size={32}/></div>
            : displayed.length === 0 ? (
              <div className="text-center py-16 bg-white/3 border border-white/10 rounded-2xl">
                <Package size={48} className="text-primary/30 mx-auto mb-4"/>
                <p className="text-white font-bold">{activeTab==='active'?'No active orders':'No past orders'}</p>
                {activeTab==='active' && <button onClick={() => navigate('/')} className="mt-6 px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover">Order Now</button>}
              </div>
            ) : (
              <div className="space-y-4">
                {displayed.map(order => (
                  <div key={order.id} className="bg-white/3 border border-white/10 rounded-2xl p-5 hover:border-primary/30 transition-all">
                    <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                      <div>
                        <p className="font-bold text-white">{order.id}</p>
                        <p className="text-text-muted text-xs mt-0.5">{new Date(order.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'America/New_York'})} EST</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase ${statusColors[order.status]||''}`}>{order.status}</span>
                        <span className="text-primary font-bold">${parseFloat(order.total).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(order.order_items||[]).map((item,i) => (
                        <span key={i} className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-text-muted">{item.menu_item_name} ×{item.quantity}</span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/track/${order.id}`)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all">
                        <Eye size={12}/> Track Order
                      </button>
                      {['served','paid'].includes(order.status) && (
                        <button onClick={() => navigate('/feedback')}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 text-text-muted rounded-lg text-xs font-bold hover:border-yellow-500/50 hover:text-yellow-400 transition-all">
                          <Star size={12}/> Rate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <Footer/>
    </div>
  );
};
export default OrderHistory;
