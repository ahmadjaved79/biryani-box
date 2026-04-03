@echo off
echo ============================================
echo   Spice Route - Restaurant Management System
echo ============================================
echo.
echo Starting Backend Server (port 5000)...
start "Spice Route Backend" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak > nul
echo Starting Frontend Dev Server (port 5173)...
start "Spice Route Frontend" cmd /k "cd frontend && npm run dev"
echo.
echo Both servers starting...
echo Backend:  http://localhost:5000/api/health
echo Frontend: http://localhost:5173
echo.
pause
