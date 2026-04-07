import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import menuRoutes from './routes/menu.js';
import ingredientRoutes from './routes/ingredients.js';
import staffRoutes from './routes/staff.js';
import tableRoutes from './routes/tables.js';
import reservationRoutes from './routes/reservations.js';
import notificationRoutes from './routes/notifications.js';
import analyticsRoutes from './routes/analytics.js';
import cateringRoutes from './routes/catering.js';
import feedbackRoutes from './routes/feedback.js';
import customerRoutes from './routes/customers.js';
import shiftRoutes from './routes/shifts.js';
import paymentRoutes from './routes/payments.js';
import announcementRoutes from './routes/announcements.js';
import wasteRoutes from './routes/waste.js';
import customerDashboardRoutes from './routes/customerDashboard.js';
import deliveryRoutes from './routes/delivery.js';
import financeRoutes from './routes/finance.js';


const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Make io available to routes
app.set('io', io);

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', restaurant: 'Spice Route', time: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/catering', cateringRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/waste', wasteRoutes);
app.use('/api/customer', customerDashboardRoutes);
app.use('/api/finance', financeRoutes);

// Socket.io - real-time events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  app.use('/api/delivery', deliveryRoutes);
  socket.on('join-role', (role) => {
    socket.join(role);
    console.log(`Socket ${socket.id} joined room: ${role}`);
  });

  socket.on('order-updated', (data) => {
    // Broadcast to all relevant roles
    io.to('cook').to('captain').to('manager').to('owner').emit('order-status-changed', data);
  });

  socket.on('new-order', (data) => {
    io.to('cook').to('manager').to('owner').emit('new-order-received', data);
  });

  socket.on('item-ready', (data) => {
    io.to('captain').to('manager').emit('item-ready-notify', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`\n🌶️  Spice Route Backend running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health\n`);
});
