@echo off
echo ========================================
echo  Los Locaus - Instalacao do Site
echo ========================================
echo.

echo [1/4] A instalar dependencias do servidor...
cd /d "%~dp0server"
call npm install
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias do servidor
    pause
    exit /b 1
)
echo.

echo [2/4] A instalar dependencias do cliente...
cd /d "%~dp0client"
call npm install
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias do cliente
    pause
    exit /b 1
)
echo.

echo [3/4] A compilar o frontend...
call npm run build
if errorlevel 1 (
    echo ERRO: Falha ao compilar o frontend
    pause
    exit /b 1
)
echo.

echo [4/4] Instalacao concluida!
echo.
echo ========================================
echo  Proximos passos:
echo ========================================
echo.
echo 1. Edita o ficheiro server/.env e coloca:
echo    - A tua API Key do YouTube
echo    - O ID do teu canal
echo    - Uma senha e chave para o admin
echo.
echo 2. Para correr o site:
echo    cd server
echo    npm start
echo.
echo 3. Abre o browser em: http://localhost:3001
echo.
echo ========================================
pause
