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
cd /d "D:\execs\Site Los Locaus\server"
if %errorlevel% neq 0 (
    echo ERRO: Nao foi possivel acceder ao diretorio do servidor
    pause
    exit /b 1
)
call npm install 2>nul
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias do servidor
    pause
    exit /b 1
)
echo.

echo [2/4] Instalando dependencias do cliente...
cd /d "D:\execs\Site Los Locaus\client"
if %errorlevel% neq 0 (
    echo ERRO: Nao foi possivel acceder ao diretorio do cliente
    pause
    exit /b 1
)
call npm install 2>nul
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias do cliente
    pause
    exit /b 1
)
echo.

echo [3/4] Compilando o frontend...
cd /d "D:\execs\Site Los Locaus\client"
if %errorlevel% neq 0 (
    echo ERRO: Nao foi possivel acceder ao diretorio do cliente
    pause
    exit /b 1
)
call npm run build 2>nul
if errorlevel 1 (
    echo ERRO: Falha ao compilar o frontend
    pause
    exit /b 1
)
echo.

echo [4/4] Validando sintaxe do backend...
cd /d "D:\execs\Site Los Locaus\server"
node -c ferramentas.js 2>nul
if errorlevel 1 (
    echo ============================================================
    echo ERRO CRITICO: O ficheiro ferramentas.js tem um erro de sintaxe!
    echo Por favor, substitua o conteudo dele com a correcao enviada.
    echo ============================================================
    pause
    exit /b 1
)
echo Sintaxe do backend OK!
timeout /t 1 >nul

:ASK_CHOICE
cls
echo.
echo ==========================================
echo   Escolha o tipo de inicio:
echo.
echo   [1] Servidor unico (porta 3001)
echo   [2] Dois servidores (portas 3001 e 3002)
echo.
set /p choice="Opcao [1] ou [2] (padrao: 1): "
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
cd /d "D:\execs\Site Los Locaus\server"
call npm start
if errorlevel 1 (
    echo ERRO: Falha ao iniciar o servidor
    pause
)
echo Para parar o servidor, clica Ctrl+C
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
start "" cmd /k "cd /d \"D:\execs\Site Los Locaus\server\" && npm start"
echo.
echo SEGUNDO SERVIDOR (porta 3002)...
echo.
start "" cmd /k "cd /d \"D:\execs\Site Los Locaus\server\" && npm start"
echo.
echo AMBOS OS SERVIDORES ESTAO RODANDO.
echo Aceda a:
echo   http://localhost:3001 (server 1)
echo   http://localhost:3002 (server 2)
echo.
echo Para parar um servidor, feche a respetiva janela do terminal.
echo Para parar ambos, feche ambas as janelas ou pressione Ctrl+C em cada uma.
goto :EOF
