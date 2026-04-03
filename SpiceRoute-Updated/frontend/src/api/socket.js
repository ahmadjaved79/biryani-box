import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000', {
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
};

export const useSocket = (role, eventHandlers = {}) => {
  const socketRef = useRef(null);

  useEffect(() => {
    const s = getSocket();
    socketRef.current = s;
    if (role) s.emit('join-role', role);
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      s.on(event, handler);
    });
    return () => {
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        s.off(event, handler);
      });
    };
  }, [role]);

  const emit = (event, data) => socketRef.current?.emit(event, data);
  return { emit };
};
