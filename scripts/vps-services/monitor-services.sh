#!/bin/bash

# BR Gestor - Script de Monitoramento dos Serviços
# Data: 12/01/2026
# Execução: Via crontab a cada 5 minutos

# Configurações
SERVICES=("brgestor-polling" "brgestor-webhook")
LOG_FILE="/home/typebot/logs/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Criar diretório de logs se não existir
mkdir -p "$(dirname "$LOG_FILE")"

echo "[$DATE] 🔍 Verificando serviços..." >> "$LOG_FILE"

# Verificar cada serviço
for service in "${SERVICES[@]}"; do
    if pm2 describe "$service" &>/dev/null; then
        status=$(pm2 describe "$service" | grep -oP 'status.*?\K\w+' | head -1)
        if [ "$status" = "online" ]; then
            echo "[$DATE] ✅ $service: Online" >> "$LOG_FILE"
        else
            echo "[$DATE] ❌ $service: $status - Reiniciando..." >> "$LOG_FILE"
            pm2 restart "$service" >> "$LOG_FILE" 2>&1
        fi
    else
        echo "[$DATE] ⚠️ $service: Não encontrado" >> "$LOG_FILE"
    fi
done

# Verificar se webhook service está respondendo
if curl -s -f http://localhost:3333/health >/dev/null; then
    echo "[$DATE] ✅ Webhook endpoint: Respondendo" >> "$LOG_FILE"
else
    echo "[$DATE] ❌ Webhook endpoint: Não respondendo" >> "$LOG_FILE"
fi

# Verificar conexão com banco
if docker exec typebot-db pg_isready -U brgestor_user -d brgestor >/dev/null 2>&1; then
    echo "[$DATE] ✅ Banco de dados: Conectado" >> "$LOG_FILE"
else
    echo "[$DATE] ❌ Banco de dados: Erro de conexão" >> "$LOG_FILE"
fi

# Manter apenas os últimos 1000 logs
tail -1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"