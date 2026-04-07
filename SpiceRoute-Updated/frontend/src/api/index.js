import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sr_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sr_token');
      localStorage.removeItem('sr_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// AUTH
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  register: (data) => api.post('/auth/register', data),
};

// ORDERS
export const ordersAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  getCookQueue: () => api.get('/orders/cook-queue'),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, status, cook_id) => api.patch(`/orders/${id}/status`, { status, cook_id }),
  updateItemStatus: (orderId, item_id, cook_status) => api.patch(`/orders/${orderId}/item-status`, { item_id, cook_status }),
  delete: (id) => api.delete(`/orders/${id}`),
  getStats: () => api.get('/orders/stats/summary'),
  claim: (id) => api.patch(`/orders/${id}/claim`), 
    // ADD THIS
};


// MENU
export const menuAPI = {
  getAll: (params) => api.get('/menu', { params }),
  getCategories: () => api.get('/menu/categories'),
  create: (data) => api.post('/menu', data),
  update: (id, data) => api.put(`/menu/${id}`, data),
  toggleAvailability: (id, is_available) => api.patch(`/menu/${id}/availability`, { is_available }),
  delete: (id) => api.delete(`/menu/${id}`),
};

// INGREDIENTS
export const ingredientsAPI = {
  getAll:  () => api.get('/ingredients'),
  create:  (data) => api.post('/ingredients', data),
  update:  (id, data) => api.put(`/ingredients/${id}`, data),
  delete:  (id) => api.delete(`/ingredients/${id}`),
  restock: (id, amount) => api.patch(`/ingredients/${id}/restock`, { amount }),
  use:     (id, amount) => api.patch(`/ingredients/${id}/use`, { amount }),
};

// STAFF
export const staffAPI = {
  getAll: () => api.get('/staff'),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.patch(`/staff/${id}`, data),
  delete: (id) => api.delete(`/staff/${id}`),
  toggleActive: (id) => api.patch(`/staff/${id}/toggle-active`),
};

// TABLES
export const tablesAPI = {
  getAll:       () => api.get('/tables'),
  create:       (data) => api.post('/tables', data),
  update:       (id, data) => api.patch(`/tables/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tables/${id}/status`, { status }),
  delete:       (id) => api.delete(`/tables/${id}`),
};

// RESERVATIONS
export const reservationsAPI = {
  getAll: (params) => api.get('/reservations', { params }),
  create: (data) => api.post('/reservations', data),
  updateStatus: (id, status) => api.patch(`/reservations/${id}/status`, { status }),
};

// NOTIFICATIONS
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// ANALYTICS
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getRevenue: (range) => api.get('/analytics/revenue', { params: { range } }),
  getTopItems: () => api.get('/analytics/top-items'),
};

export default api;

// FEEDBACK
export const feedbackAPI = {
  submit: (data) => api.post('/feedback', data),
  getAll: (params) => api.get('/feedback', { params }),
  reply: (id, data) => api.patch(`/feedback/${id}`, data),
};

// CUSTOMERS
export const customersAPI = {
  sendOtp: (data) => api.post('/customers/send-otp', data),
  verifyOtp: (email, otp) => api.post('/customers/verify-otp', { email, otp }),
  resendOtp: (email) => api.post('/customers/resend-otp', { email }),
  login: (email, password) => api.post('/customers/login', { email, password }),
  getOrders: (email) => api.get(`/customers/${email}/orders`),
  getLoyalty: (id) => api.get(`/customers/${id}/loyalty`),
  getAll: () => api.get('/customers'),
  getHighValue: () => api.get('/customers/high-value'),
  getProfile: (id) => api.get(`/customers/${id}/profile`),
};
// SHIFTS
export const shiftsAPI = {
  clockIn: () => api.post('/shifts/clock-in'),
  clockOut: (id, notes) => api.patch(`/shifts/${id}/clock-out`, { notes }),
  getAll: (params) => api.get('/shifts', { params }),
  getMy: () => api.get('/shifts/my'),
};

// PAYMENTS
export const paymentsAPI = {
  create: (data) => api.post('/payments', data),
  getByOrder: (order_id) => api.get('/payments', { params: { order_id } }),
};

// ANNOUNCEMENTS
export const announcementsAPI = {
  getAll: (target) => api.get('/announcements', { params: { target } }),
  create: (data) => api.post('/announcements', data),  // pass send_email: true in data
  update: (id, data) => api.patch(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
};

// WASTE LOG
export const wasteAPI = {
  log: (data) => api.post('/waste', data),
  getToday: () => api.get('/waste'),
};

// ORDER TRACKING (public)
export const trackingAPI = {
  track: (orderId) => api.get(`/orders/track/${orderId}`),
  getByCustomer: (email) => api.get(`/orders/by-customer/${email}`),
};

// DELIVERY
export const deliveryAPI = {
  getAvailable:  () => api.get('/delivery/available'),
  getMyOrders:   () => api.get('/delivery/my-orders'),
  getCompleted:  () => api.get('/delivery/completed'),
  getStats:      () => api.get('/delivery/stats'),
  accept:        (id) => api.patch(`/delivery/${id}/accept`),
  pickedUp:      (id) => api.patch(`/delivery/${id}/picked-up`),
  delivered:     (id, payment_method) => api.patch(`/delivery/${id}/delivered`, { payment_method }),
};

// CUSTOMER DASHBOARD (logged-in customer)
export const customerDashboardAPI = {
  getProfile:        () => api.get('/customer/profile'),
  getOrderHistory:   () => api.get('/customer/order-history'),
  getActiveOrder:    () => api.get('/customer/active-order'),
  getRecommendations:() => api.get('/customer/recommendations'),
  getOffers:         () => api.get('/customer/offers'),
};

export const cateringAPI = {
  submit:     (data)        => api.post('/catering', data),
  getAll:     (params)      => api.get('/catering', { params }),
  getMy:      ()            => api.get('/catering/my'),
  update:     (id, data)    => api.patch(`/catering/${id}`, data),
};