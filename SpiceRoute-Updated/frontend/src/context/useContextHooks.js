import { useContext } from 'react';
import { AuthContext, OrderContext, CartContext } from './contexts';

export const useAuth = () => useContext(AuthContext);
export const useOrders = () => useContext(OrderContext);
export const useCart = () => useContext(CartContext);

// Stub kept for any legacy component references - returns empty arrays
export const useDemoData = () => ({ reservations: [], cateringOrders: [] });
