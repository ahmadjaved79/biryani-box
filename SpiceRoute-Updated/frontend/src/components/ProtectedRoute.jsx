import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useContextHooks';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect cooks to their portal
    if (user.role === 'cook') return <Navigate to="/cook-dashboard" replace />;
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;
