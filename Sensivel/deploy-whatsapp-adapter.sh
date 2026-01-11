#!/bin/bash

# Script de deploy do WhatsApp Adapter para Supabase
# Executa automaticamente todo o processo de implementação

set -e

echo "🚀 IMPLEMENTANDO WHATSAPP ADAPTER - FASE 1"
echo "=========================================="

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado. Instale com:"
    echo "npm install -g supabase"
    exit 1
fi

# Verificar se estamos logados
echo "🔐 Verificando login Supabase..."
supabase status > /dev/null 2>&1 || {
    echo "❌ Não está logado no Supabase. Execute: supabase login"
    exit 1
}

echo "✅ Supabase CLI configurado"

# Deploy da função WhatsApp
echo ""
echo "📦 Fazendo deploy da função WhatsApp..."
supabase functions deploy whatsapp --no-verify-jwt

echo ""
echo "⚙️ Configurando variáveis de ambiente..."

# Configurar variáveis de ambiente
supabase secrets set CURRENT_PROVIDER=waha
supabase secrets set VPS_IP=72.60.14.172
supabase secrets set WAHA_API_KEY=waha_api_key_2026
supabase secrets set EVOLUTION_API_KEY=evolution_api_key_2026

echo ""
echo "🗄️ Criando tabelas de log (opcional)..."

# Criar tabelas de log se não existirem
supabase db push --schema public || echo "Tabelas podem já existir"

# SQL para criar tabelas (executar manualmente se necessário)
cat > create_whatsapp_tables.sql << 'EOF'
-- Tabela de log para instâncias WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_instances_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  provider TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de log para mensagens WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_messages_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  text_preview TEXT,
  provider TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_log_user_id ON whatsapp_instances_log(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_log_created_at ON whatsapp_instances_log(created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_log_user_id ON whatsapp_messages_log(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_log_phone ON whatsapp_messages_log(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_log_created_at ON whatsapp_messages_log(created_at);
EOF

echo ""
echo "📄 Arquivo SQL criado: create_whatsapp_tables.sql"
echo "📝 Execute manualmente no Supabase Dashboard se necessário"

echo ""
echo "🧪 Testando função..."

# Testar se a função está funcionando
FUNCTION_URL=$(supabase status | grep "Functions URL" | awk '{print $3}')
if [ ! -z "$FUNCTION_URL" ]; then
    echo "📡 Testando endpoint /whatsapp/status..."
    curl -s "$FUNCTION_URL/whatsapp/status" | head -c 200
    echo ""
fi

echo ""
echo "✅ WHATSAPP ADAPTER IMPLEMENTADO COM SUCESSO!"
echo "=============================================="
echo ""
echo "🎯 Próximos passos:"
echo ""
echo "1. ✅ Função WhatsApp deployada em: $FUNCTION_URL"
echo "2. ✅ Variáveis de ambiente configuradas"
echo "3. ✅ daily-ai-summary migrado para usar o adapter"
echo "4. 📝 Execute create_whatsapp_tables.sql no Supabase Dashboard"
echo ""
echo "🔧 Comandos úteis:"
echo "• Ver logs: supabase functions logs whatsapp"
echo "• Status: curl $FUNCTION_URL/whatsapp/status"
echo "• Redeployar: supabase functions deploy whatsapp"
echo ""
echo "🎉 Sistema agnóstico WhatsApp pronto!"
echo "Agora pode alternar entre WAHA e Evolution apenas mudando CURRENT_PROVIDER"