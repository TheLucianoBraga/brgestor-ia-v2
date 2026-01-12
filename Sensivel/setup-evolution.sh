#!/bin/bash
# ============================================
# SCRIPT PARA ATIVAR EVOLUTION NA VPS
# Execute: ssh typebot@72.60.14.172 'bash -s' < setup-evolution.sh
# ============================================

cd /home/typebot/saas-stack

echo "📋 Verificando .env atual..."
cat .env

echo ""
echo "🔧 A Evolution precisa de PostgreSQL. Criando database..."

# Criar database evolution no postgres do typebot
docker exec typebot-db psql -U typebot -c "CREATE DATABASE evolution;" 2>/dev/null || echo "Database evolution já existe"

echo ""
echo "🚀 Subindo Evolution API..."
docker compose --profile evolution up -d

echo ""
echo "⏳ Aguardando inicialização..."
sleep 10

echo ""
echo "📦 Status dos containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🔍 Testando Evolution API..."
curl -s http://localhost:8081/health || echo "Aguarde alguns segundos e tente: curl http://72.60.14.172:8081"

echo ""
echo "✅ Evolution API deve estar rodando em: http://72.60.14.172:8081"
echo "🔑 API Key: evolution_api_key_2026"
