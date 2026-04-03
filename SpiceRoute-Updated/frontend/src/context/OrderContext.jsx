import React, { useState, useEffect, useCallback } from 'react';
import { OrderContext } from './contexts';
import { ordersAPI, menuAPI, ingredientsAPI, tablesAPI, analyticsAPI } from '../api/index.js';

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [tables, setTables] = useState([]);
  const [dashStats, setDashStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async (params) => {
    try {
      const res = await ordersAPI.getAll(params);
      setOrders(res.data);
    } catch (e) { console.error('fetchOrders', e); }
  }, []);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await menuAPI.getAll();
      setMenu(res.data);
    } catch (e) { console.error('fetchMenu', e); }
  }, []);

  const fetchIngredients = useCallback(async () => {
    try {
      const res = await ingredientsAPI.getAll();
      setIngredients(res.data);
    } catch (e) { console.error('fetchIngredients', e); }
  }, []);

  const fetchTables = useCallback(async () => {
    try {
      const res = await tablesAPI.getAll();
      setTables(res.data);
    } catch (e) { console.error('fetchTables', e); }
  }, []);

  const fetchDashStats = useCallback(async () => {
    try {
      const res = await analyticsAPI.getDashboard();
      setDashStats(res.data);
    } catch (e) { console.error('fetchDashStats', e); }
  }, []);

  const createOrder = async (cart, table_number, table_id, extras = {}) => {
    try {
      const res = await ordersAPI.create({
        items: cart,
        table_number,
        table_id,
        order_type: extras.order_type || 'dine-in',
        customer_name: extras.customer_name,
        customer_phone: extras.customer_phone,
        special_instructions: extras.special_instructions,
        delivery_address: extras.delivery_address,
        payment_method: extras.payment_method,
      });
      setOrders(prev => [res.data, ...prev]);
      return { success: true, orderId: res.data.id };
    } catch (err) {
      return { error: err.response?.data?.error || 'Failed to create order' };
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const res = await ordersAPI.updateStatus(orderId, status);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      return res.data;
    } catch (err) { console.error('updateOrderStatus', err); }
  };

  const deleteOrder = async (orderId) => {
    try {
      await ordersAPI.delete(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err) { console.error('deleteOrder', err); }
  };

  const toggleMenuAvailability = async (itemId) => {
    const item = menu.find(m => m.id === itemId);
    if (!item) return;
    try {
      await menuAPI.toggleAvailability(itemId, !item.is_available);
      setMenu(prev => prev.map(m => m.id === itemId ? { ...m, is_available: !m.is_available } : m));
    } catch (err) { console.error(err); }
  };

  const updateIngredientStock = async (id, stock) => {
    try {
      await ingredientsAPI.update(id, { stock });
      setIngredients(prev => prev.map(i => i.id === id ? { ...i, stock } : i));
    } catch (err) { console.error(err); }
  };

  const getFinancialMetrics = () => {
    if (!dashStats) return { revenue: 0, costOfGoods: 0, profit: 0, profitMargin: 0 };
    const revenue = dashStats.today?.revenue || 0;
    const costOfGoods = revenue * 0.35;
    return { revenue, costOfGoods, profit: revenue - costOfGoods, profitMargin: revenue > 0 ? 65 : 0 };
  };

  const getReorderForecast = () => ingredients.map(i => ({
    ...i, needsReorder: i.stock <= i.min_stock, daysRemaining: Math.floor(i.stock / (i.min_stock / 3 || 1))
  }));

  return (
    <OrderContext.Provider value={{
      orders, menu, ingredients, tables, dashStats, loading,
      fetchOrders, fetchMenu, fetchIngredients, fetchTables, fetchDashStats,
      createOrder, updateOrderStatus, deleteOrder,
      toggleMenuAvailability, updateIngredientStock,
      getFinancialMetrics, getReorderForecast,
    }}>
      {children}
    </OrderContext.Provider>
  );
};
