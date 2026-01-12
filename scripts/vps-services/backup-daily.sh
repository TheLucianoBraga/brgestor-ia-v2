#!/bin/bash

# BR Gestor - Script de Backup Automático
# Data: 12/01/2026
# Execução: Via crontab diário

set -e

# Configurações
DB_CONTAINER="typebot-db"
DB_NAME="brgestor"
DB_USER="brgestor_user"
BACKUP_DIR="/home/typebot/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Criar diretório de backup se não existir
mkdir -p "$BACKUP_DIR"

echo "🗄️ [$(date)] Iniciando backup do banco de dados..."

# Backup do banco principal
echo "📦 Fazendo backup do banco '$DB_NAME'..."
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges > "$BACKUP_DIR/brgestor_backup_$DATE.sql"

# Verificar se o backup foi criado com sucesso
if [ -f "$BACKUP_DIR/brgestor_backup_$DATE.sql" ] && [ -s "$BACKUP_DIR/brgestor_backup_$DATE.sql" ]; then
    echo "✅ Backup criado com sucesso: brgestor_backup_$DATE.sql"
    
    # Comprimir o backup
    gzip "$BACKUP_DIR/brgestor_backup_$DATE.sql"
    echo "🗜️ Backup comprimido: brgestor_backup_$DATE.sql.gz"
    
    # Calcular tamanho do arquivo
    SIZE=$(du -h "$BACKUP_DIR/brgestor_backup_$DATE.sql.gz" | cut -f1)
    echo "📊 Tamanho do backup: $SIZE"
    
else
    echo "❌ Erro: Backup não foi criado corretamente!"
    exit 1
fi

# Backup das configurações dos serviços
echo "⚙️ Fazendo backup das configurações..."
tar -czf "$BACKUP_DIR/configs_backup_$DATE.tar.gz" \
    /home/typebot/brgestor-services/.env \
    /home/typebot/brgestor-services/package.json \
    /home/typebot/saas-stack/.env \
    /home/typebot/saas-stack/docker-compose.yml \
    2>/dev/null || echo "⚠️ Alguns arquivos de configuração não foram encontrados"

# Limpeza - manter apenas backups dos últimos X dias
echo "🧹 Removendo backups antigos (mais de $RETENTION_DAYS dias)..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Listar backups existentes
echo "📋 Backups disponíveis:"
ls -lh "$BACKUP_DIR"/*.gz 2>/dev/null | tail -10 || echo "Nenhum backup encontrado"

# Log do backup
echo "✅ [$(date)] Backup concluído com sucesso" >> "$BACKUP_DIR/backup.log"

echo "🎉 Backup automático concluído!"