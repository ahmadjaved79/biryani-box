import React, { useState } from 'react';
import { AuthContext } from './contexts';
import { authAPI } from '../api/index.js';
import { customersAPI } from '../api/index.js';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sr_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Staff login (owner/manager/captain/cook)
  const login = async (email, password) => {
    setLoading(true); setAuthError(null);
    try {
      const res = await authAPI.login(email, password);
      const { token, user: userData } = res.data;
      localStorage.setItem('sr_token', token);
      localStorage.setItem('sr_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
      setAuthError(msg);
      return { success: false, error: msg };
    } finally { setLoading(false); }
  };

  // Customer login — uses customers table
  const customerLogin = async (email, password) => {
    setLoading(true); setAuthError(null);
    try {
      const res = await customersAPI.login(email, password);
      const { token, user: userData } = res.data;
      localStorage.setItem('sr_token', token);
      localStorage.setItem('sr_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid credentials';
      setAuthError(msg);
      return { success: false, error: msg };
    } finally { setLoading(false); }
  };

  // Customer register
  const customerRegister = async (name, email, password, phone) => {
    setLoading(true); setAuthError(null);
    try {
      const res = await customersAPI.register({ name, email, password, phone });
      const { token, user: userData } = res.data;
      localStorage.setItem('sr_token', token);
      localStorage.setItem('sr_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed';
      setAuthError(msg);
      return { success: false, error: msg };
    } finally { setLoading(false); }
  };

  const logout = () => {
    localStorage.removeItem('sr_token');
    localStorage.removeItem('sr_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, customerLogin, customerRegister, logout, loading, authError }}>
      {children}
    </AuthContext.Provider>
  );
};
