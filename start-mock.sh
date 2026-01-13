#!/bin/bash

echo "🚀 Iniciando Mock Backend + Frontend..."

# Instalar dependências do mock
cd mock-backend
npm install

# Iniciar mock backend em background
npm run dev &
MOCK_PID=$!

# Aguardar mock iniciar
sleep 3

# Voltar para raiz e iniciar frontend
cd ..
npm run dev &
FRONTEND_PID=$!

echo "✅ Mock Backend: http://localhost:4000"
echo "✅ Frontend: http://localhost:8080"
echo "🛑 Para parar: Ctrl+C ou kill $MOCK_PID $FRONTEND_PID"

wait