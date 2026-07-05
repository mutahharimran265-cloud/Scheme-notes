@echo off
title SchemNotes
cd /d "%~dp0"

echo ============================================
echo    SchemNotes - local schematic review
echo ============================================
echo.

REM --- 1. Node.js installed? ---------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found on this computer.
  echo.
  echo         SchemNotes needs Node.js to run. Install the LTS version
  echo         from https://nodejs.org and then run this launcher again.
  goto :fail
)
for /f "delims=" %%v in ('node --version') do echo [ok] Node.js %%v found.

REM --- 2. Port 3000 free? -------------------------------------------------
node -e "const s=require('net').createServer();s.once('error',()=>process.exit(1));s.once('listening',()=>s.close(()=>process.exit(0)));s.listen(3000,'127.0.0.1')" >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Port 3000 is already in use.
  echo.
  echo         SchemNotes may already be running in another window - check
  echo         http://localhost:3000 in your browser. Otherwise, close the
  echo         app that is using port 3000 and run this launcher again.
  goto :fail
)
echo [ok] Port 3000 is free.

REM --- 3. Local .env ------------------------------------------------------
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo [ok] Created .env with local defaults.
)

REM --- 4. Dependencies ----------------------------------------------------
if not exist "node_modules" (
  echo [..] First run: installing dependencies - this can take a few minutes...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] Dependency install failed - see the messages above.
    echo         Check your internet connection, then run this launcher again.
    goto :fail
  )
)

REM --- 5. Back up the database, then apply migrations ----------------------
call node scripts\backup-db.mjs pre-migrate
if errorlevel 1 (
  echo [ERROR] Could not back up the database - stopping to keep your data safe.
  goto :fail
)
call npx prisma migrate deploy
if errorlevel 1 (
  echo.
  echo [ERROR] Database setup failed - see the messages above.
  echo         Your previous database is safe in prisma\backups\.
  goto :fail
)

REM --- 6. Start the server; open the browser once it actually responds -----
echo [ok] Starting the server - the browser will open when it is ready.
echo      Close this window to stop SchemNotes.
echo.
start "SchemNotes - browser opener" /b node scripts\open-when-ready.mjs http://localhost:3000
call npm run dev

echo.
echo Server stopped. Press any key to close.
pause >nul
exit /b 0

:fail
echo.
pause
exit /b 1
