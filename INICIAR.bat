@echo off
title LOS LOCAUS - Iniciar Servidor
echo ==========================================
echo   LOS LOCAUS - INICIAR SITE
echo ==========================================
echo.

echo [1/4] Matando processos Node em corrida...
taskkill /f /im node.exe 2>nul
timeout /t 1 >nul

echo [2/4] Instalando dependencias do servidor...
cd /d "%~dp0server"
call npm install
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias do servidor
    pause
    exit /b 1
)
echo.

echo [2/4] Instalando dependencias do cliente...
cd /d "%~dp0client"
call npm install
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias do cliente
    pause
    exit /b 1
)
echo.

echo [3/4] Compilando o frontend...
call npm run build
if errorlevel 1 (
    echo ERRO: Falha ao compilar o frontend
    pause
    exit /b 1
)
echo.

:ASK_CHOICE
cls
echo.
echo ==========================================
echo   Escolha o tipo de inicio:
echo.
echo   [1] Servidor unico (porta 3001)
echo   [2] Dois servidores (portas 3001 e 3002)
echo.
set /p choice="Opcao [1] ou [2] (padrão: 1): "
if /i "%choice%"=="" set choice=1
if /i "%choice%"=="1" goto :SINGLE_SERVER
if /i "%choice%"=="2" goto :DUO_SERVER
echo Opcao invalida. Tente novamente.
timeout /t 2 /nobreak >nul
goto :ASK_CHOICE

:SINGLE_SERVER
cls
echo.
echo ==========================================
echo   SERVIDOR UNICO - iniciando na porta 3001...
echo ==========================================
echo.
echo SITE DISPONIVEL EM:
echo   http://localhost:3001
echo ==========================================
echo.
Para parar o servidor, clica Ctrl+C
echo.
cd /d "%~dp0server"
call npm start
goto :EOF

:DUO_SERVER
cls
echo.
echo ==========================================
echo   DUO SERVER - nas portas 3001 e 3002...
echo ==========================================
echo.
echo MATANDO processos Node em corrida...
taskkill /f /im node.exe 2>nul
timeout /t 1 >nul
echo.
echo PRIMEIRO SERVIDOR (porta 3001)...
echo.
start "" cmd /k "cd /d "%~dp0server" && npm start"
echo.
echo SEGUNDO SERVIDOR (porta 3002)...
echo.
start "" cmd /k "cd /d "%~dp0server" && npm start"
echo.
echo AMBOS OS SERVIDORES ESTAO RODANDO.
echo Aceda a:
echo   http://localhost:3001 (server 1)
echo   http://localhost:3002 (server 2)
echo.
Para parar um servidor, feche a respetiva janela do terminal.
Para parar ambos, feche ambas as janelas ou pressione Ctrl+C em cada uma.
goto :EOF