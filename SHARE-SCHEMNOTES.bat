@echo off
title SchemNotes - Share Link
color 0b
echo.
echo   ============================================
echo      SCHEMNOTES - PUBLIC SHARE LINK
echo   ============================================
echo.
echo   Creating a temporary public link you can send to
echo   anyone for testing (no install needed). Please wait...
echo.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\share.ps1"
echo.
echo   Link stopped. You can close this window.
pause >nul
