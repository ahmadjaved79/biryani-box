#!/bin/bash
echo "============================================"
echo "  Spice Route - Restaurant Management System"
echo "============================================"
echo ""
echo "Starting Backend (port 5000)..."
cd backend && npm run dev &
BACKEND_PID=$!
sleep 2
echo "Starting Frontend (port 5173)..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!
echo ""
echo "✅ Backend:  http://localhost:5000/api/health"
echo "✅ Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
wait $BACKEND_PID $FRONTEND_PID
