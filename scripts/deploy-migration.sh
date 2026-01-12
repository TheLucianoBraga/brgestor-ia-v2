#!/bin/bash

# BR Gestor - Script de Deploy da Migração Supabase -> VPS
# Data: 12/01/2026
# Autor: BR Gestor AI Assistant

set -e  # Parar em caso de erro

echo "🚀 INICIANDO DEPLOY DA MIGRAÇÃO SUPABASE -> VPS"
echo "=================================================="

# Variáveis
VPS_IP="72.60.14.172"
VPS_USER="typebot"
SSH_KEY="./deploy_key_brgestor"
VPS_SERVICES_DIR="/home/typebot/brgestor-services"
VPS_MIGRATION_DIR="/home/typebot/migration"

echo "📋 Configurações:"
echo "   VPS: $VPS_USER@$VPS_IP"
echo "   Serviços: $VPS_SERVICES_DIR"
echo "   Migração: $VPS_MIGRATION_DIR"
echo ""

# Função para executar comando SSH
run_ssh() {
    ssh -i "$SSH_KEY" -o BatchMode=yes "$VPS_USER@$VPS_IP" "$1"
}

# Função para transferir arquivo via SCP
transfer_file() {
    local local_file="$1"
    local remote_path="$2"
    echo "📤 Transferindo: $local_file -> $remote_path"
    scp -i "$SSH_KEY" "$local_file" "$VPS_USER@$VPS_IP:$remote_path"
}

echo "1️⃣ Verificando conexão com VPS..."
if run_ssh "echo 'Conexão OK'"; then
    echo "✅ Conectado à VPS com sucesso!"
else
    echo "❌ Erro: Não foi possível conectar à VPS"
    exit 1
fi

echo ""
echo "2️⃣ Criando diretórios na VPS..."
run_ssh "mkdir -p $VPS_SERVICES_DIR $VPS_MIGRATION_DIR"
echo "✅ Diretórios criados!"

echo ""
echo "3️⃣ Transferindo arquivos de migração..."
transfer_file "scripts/migration/03-insert-whatsapp-instances.sql" "$VPS_MIGRATION_DIR/"

echo ""
echo "4️⃣ Transferindo webhook service..."
transfer_file "scripts/vps-services/webhook-service.js" "$VPS_SERVICES_DIR/"
transfer_file "scripts/vps-services/webhook.env" "$VPS_SERVICES_DIR/.env"
transfer_file "scripts/vps-services/webhook-package.json" "$VPS_SERVICES_DIR/package.json"

echo ""
echo "5️⃣ Executando migração do banco de dados..."
run_ssh "docker exec -i typebot-db psql -U brgestor_user -d brgestor < $VPS_MIGRATION_DIR/03-insert-whatsapp-instances.sql"
echo "✅ Instâncias WhatsApp inseridas no banco!"

echo ""
echo "6️⃣ Instalando dependências do webhook service..."
run_ssh "cd $VPS_SERVICES_DIR && npm install"
echo "✅ Dependências instaladas!"

echo ""
echo "7️⃣ Configurando PM2 para o webhook service..."
run_ssh "cd $VPS_SERVICES_DIR && pm2 start webhook-service.js --name brgestor-webhook --env production"
run_ssh "pm2 save"
echo "✅ Webhook service configurado no PM2!"

echo ""
echo "8️⃣ Verificando status dos serviços..."
run_ssh "pm2 status"

echo ""
echo "9️⃣ Testando webhook service..."
run_ssh "sleep 3 && curl -s http://localhost:3333/health | head -5"

echo ""
echo "🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!"
echo "=================================="
echo ""
echo "🔗 URLs dos Webhooks (para atualizar nas APIs):"
echo "   API 1 (WAHA): http://$VPS_IP:3333/api1/webhook"
echo "   API 2 (Evolution): http://$VPS_IP:3333/api2/webhook"
echo ""
echo "📊 Monitoramento:"
echo "   pm2 status"
echo "   pm2 logs brgestor-webhook"
echo "   pm2 logs brgestor-polling"
echo ""
echo "🔧 Próximos passos:"
echo "   1. Atualizar webhooks nas APIs WhatsApp"
echo "   2. Testar recepção de mensagens"
echo "   3. Configurar backup automático"
echo "   4. Desativar Supabase"
echo ""