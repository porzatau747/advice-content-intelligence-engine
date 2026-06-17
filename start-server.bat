@echo off
title Advice Content Intelligence Engine - LAN Server
color 0B
cls
echo =======================================================================
echo            ADVICE CONTENT INTELLIGENCE ENGINE - LAN SERVER
echo =======================================================================
echo.
echo [*] Checking local IP address...
echo.
echo -----------------------------------------------------------------------
echo [IP Address to type on mobile / other devices]:
echo.
powershell -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notlike '*Loopback*' } | ForEach-Object { echo ('  => http://' + $_.IPAddress + ':3000') }"
echo -----------------------------------------------------------------------
echo.
echo [*] Starting production server on LAN...
echo [*] Keep this window open while using the system.
echo [*] Press Ctrl+C in this window to stop the server.
echo.
npx next start -H 0.0.0.0
pause
