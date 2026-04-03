import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CookDashboard from './pages/CookDashboard';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import CustomerAuth from './pages/CustomerAuth';
import OrderHistory from './pages/OrderHistory';
import TrackOrder from './pages/TrackOrder';
import DeliveryDashboard from './pages/DeliveryDashboard';
import GiftCards from './pages/GiftCards';
import Catering from './pages/Catering';
import Reservations from './pages/Reservations';
import FeedbackPage from './pages/FeedbackPage';
import CustomerDashboardPage from './pages/CustomerDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/"              element={<Home />} />
        <Route path="/login"         element={<Login />} />
        <Route path="/auth"          element={<CustomerAuth />} />
        <Route path="/cart"          element={<Cart />} />
        <Route path="/checkout"      element={<Checkout />} />
        <Route path="/history"       element={<OrderHistory />} />
        <Route path="/track/:id"     element={<TrackOrder />} />
        <Route path="/track"         element={<TrackOrder />} />
        <Route path="/delivery/hub"  element={<DeliveryDashboard />} />
        <Route path="/gift-cards"    element={<GiftCards />} />
        <Route path="/catering"      element={<Catering />} />
        <Route path="/reservations"  element={<Reservations />} />
        <Route path="/feedback"            element={<FeedbackPage />} />
        <Route path="/customer/dashboard"  element={<CustomerDashboardPage />} />
        <Route path="/cook-dashboard" element={
          <ProtectedRoute allowedRoles={['cook','owner','manager']}><CookDashboard /></ProtectedRoute>
        }/>
        <Route path="/dashboard"     element={
          <ProtectedRoute allowedRoles={['owner','manager','captain']}><Dashboard /></ProtectedRoute>
        }/>
        <Route path="/dashboard/*"   element={
          <ProtectedRoute allowedRoles={['owner','manager','captain']}><Dashboard /></ProtectedRoute>
        }/>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
export default App;
