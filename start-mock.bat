@echo off
echo 🚀 Iniciando Mock Backend + Frontend...

echo 📦 Instalando dependências do mock...
cd mock-backend
call npm install

echo 🔧 Iniciando mock backend...
start "Mock Backend" cmd /k "npm run dev"

timeout /t 3

echo 🌐 Iniciando frontend...
cd ..
npm run dev

pause