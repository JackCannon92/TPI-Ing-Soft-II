@echo off
chcp 65001 >nul
cd /d "%~dp0"
title LubriGest - servidor local
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  No se encontro Node.js en esta computadora.
  echo  Se abre la demo en modo "solo navegador": funciona igual, pero los datos
  echo  quedan guardados en este navegador y no en la carpeta data.
  echo.
  start "" "%~dp0index.html"
  pause
  exit /b
)
node server.js
echo.
pause
