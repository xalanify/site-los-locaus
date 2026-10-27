@echo off
REM ============================================
REM LOCAUS - Modo .BAT (sem .exe obrigatório)
REM Corre no PC Windows local.
REM Deixa esta janela aberta. Fecha com qualquer tecla.
REM ============================================

REM Tenta encontrar o agente.ps1
set "AGENTE="
if exist "%~dp0agente.ps1" set "AGENTE=%~dp0agente.ps1"
if not defined AGENTE (
  echo [A LIGAR] Agente nao encontrado. A descarregar do site...
  powershell -Command "try { Invoke-WebRequest -Uri 'https://www.locaus.fun/agente.ps1' -OutFile '%~dp0agente.ps1' -UseBasicParsing; Write-Host '[OK] agente.ps1 descarregado.' } catch { Write-Host '[AVISO] Falha.' }" 2>nul
  if exist "%~dp0agente.ps1" set "AGENTE=%~dp0agente.ps1"
)
if not defined AGENTE (
  echo [AVISO] agente.ps1 nao encontrado. Coloca o .bat na mesma pasta.
  pause
  exit /b
)

echo ============================================
echo    LOCAUS PC - Modo .BAT
    echo ============================================
echo.
echo [A LIGAR] A arrancar o agente PowerShell...
REM Lê o token do ficheiro .locaus-token.json para passar ao agente
set "TOKEN_ARG="
if exist "%USERPROFILE%\.locaus-token.json" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=(Get-Content '%USERPROFILE%\.locaus-token.json' | ConvertFrom-Json).token; if($t){Write-Host '-Token '+$t}" > "%TEMP%\locaus_tok.txt" 2>nul
  for /f "delims=" %%b in ('type "%TEMP%\locaus_tok.txt"') do set "TOKEN_ARG=%%b"
)
REM Inicia o agente diretamente (na mesma janela/consola) para que o .bat nao feche
powershell -NoProfile -ExecutionPolicy Bypass -File "%AGENTE%" -Site https://www.locaus.fun %TOKEN_ARG% >nul 2>&1 &

echo [A LIGAR] A comunicar com o site...
echo          Contador: 1 / 5
timeout /t 1 /nobreak >nul
echo [A LIGAR] A comunicar com o site...
echo          Contador: 2 / 5
timeout /t 1 /nobreak >nul
echo [A LIGAR] A comunicar com o site...
echo          Contador: 3 / 5
timeout /t 1 /nobreak >nul
echo [A LIGAR] A comunicar com o site...
echo          Contador: 4 / 5
timeout /t 1 /nobreak >nul
echo [A LIGAR] A comunicar com o site...
echo          Contador: 5 / 5
timeout /t 1 /nobreak >nul

echo.
REM Cria sessao no site (so precisa se ja tivermos token)
echo [A LIGAR] A ligar ao site...
powershell -NoProfile -ExecutionPolicy Bypass -Command "
$tok=(Get-Content '%USERPROFILE%\.locaus-token.json' -ErrorAction SilentlyContinue | ConvertFrom-Json -ErrorAction SilentlyContinue).token;
if($tok){try{Invoke-RestMethod -Uri 'https://www.locaus.fun/api/agente/sessao' -Method Post -Headers @{Authorization='Bearer '+$tok} -Body '{}' -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null; Write-Host '[OK] Sessao criada.'}catch{Write-Host '[INFO] Sessao ja existe.'}}
" 2>nul

echo [LIGADO] O site deteta este PC!
powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=(Get-Content '%USERPROFILE%\.locaus-token.json' -ErrorAction SilentlyContinue | ConvertFrom-Json -ErrorAction SilentlyContinue).token; if($t){try{Invoke-RestMethod -Uri 'https://www.locaus.fun/api/agente/sessao' -Method Post -Headers @{Authorization='Bearer '+$t} -Body '{}' -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null; Write-Host '[OK] Sessao verificada no site.'}catch{Write-Host '[INFO] Sem token.'}}" 2>nul
echo          Podes usar as ferramentas e os comandos.
echo          O agente esta a correr em segundo plano.
echo.
echo [LOGS] Se quiseres desligar, fecha esta janela (X) ou pressiona qualquer tecla.
echo.
REM Loop simples: pica o site a /ping e nao fecha automaticamente
:loop
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -Uri 'https://www.locaus.fun/api/agente/ping' -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null; Write-Host '[PING] Site: conectado.' } catch { Write-Host '[PING] Site: ainda nao.' }" 2>nul
echo [LIGADO] Agente ativo. Fecha esta janela (X) quando quiseres.
echo ============================================
echo Deixa esta janela aberta.
echo ============================================
timeout /t 3 /nobreak >nul
goto loop
