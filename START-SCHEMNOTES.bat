@echo off
title SchemNotes
cd /d "%~dp0"
echo ============================================
echo    SchemNotes - starting local server
echo ============================================
echo.

if not exist ".env" copy ".env.example" ".env" >nul

if not exist "node_modules" echo First run: installing dependencies (this can take a few minutes)...
if not exist "node_modules" call npm install

if not exist "prisma\dev.db" echo Setting up the database...
if not exist "prisma\dev.db" call npx prisma migrate deploy

REM Open the browser a few seconds after the server begins starting.
start "" cmd /c "timeout /t 6 >nul & start http://localhost:3000"

echo.
echo Server starting at  http://localhost:3000
echo Close this window to stop the app.
echo.
call npm run dev

echo.
echo Server stopped. Press any key to close.
pause >nul
