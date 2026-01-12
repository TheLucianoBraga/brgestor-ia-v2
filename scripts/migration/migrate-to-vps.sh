#!/bin/bash
# =============================================
# BRGESTOR - Script de Migração para VPS
# Execute como root ou com sudo
# =============================================

set -e

echo "============================================="
echo "BRGESTOR - Migração Supabase -> VPS Local"
echo "============================================="

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Diretórios
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VPS_SERVICES_DIR="/home/typebot/brgestor-services"

# Função de log
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================
# 1. Verificar se PostgreSQL está instalado
# =============================================
check_postgres() {
    log_info "Verificando PostgreSQL..."
    
    if command -v psql &> /dev/null; then
        log_info "PostgreSQL já instalado: $(psql --version)"
    else
        log_warn "PostgreSQL não encontrado. Usando container Docker existente."
    fi
}

# =============================================
# 2. Criar banco de dados no container
# =============================================
create_database() {
    log_info "Criando banco de dados brgestor..."
    
    # Usa o container typebot-db existente
    docker exec -i typebot-db psql -U typebot -c "CREATE DATABASE brgestor;" 2>/dev/null || log_warn "Banco brgestor já existe"
    docker exec -i typebot-db psql -U typebot -c "CREATE USER brgestor_user WITH PASSWORD 'BrGestor_Secure_2026!';" 2>/dev/null || log_warn "Usuário brgestor_user já existe"
    docker exec -i typebot-db psql -U typebot -c "GRANT ALL PRIVILEGES ON DATABASE brgestor TO brgestor_user;" 2>/dev/null || true
    
    log_info "Banco de dados criado com sucesso!"
}

# =============================================
# 3. Instalar extensões
# =============================================
install_extensions() {
    log_info "Instalando extensões PostgreSQL..."
    
    docker exec -i typebot-db psql -U typebot -d brgestor -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
    docker exec -i typebot-db psql -U typebot -d brgestor -c 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'
    
    log_info "Extensões instaladas!"
}

# =============================================
# 4. Executar schema
# =============================================
apply_schema() {
    log_info "Aplicando schema do banco de dados..."
    
    if [ -f "${SCRIPT_DIR}/02-create-schema.sql" ]; then
        docker exec -i typebot-db psql -U typebot -d brgestor < "${SCRIPT_DIR}/02-create-schema.sql"
        log_info "Schema aplicado com sucesso!"
    else
        log_error "Arquivo 02-create-schema.sql não encontrado!"
        exit 1
    fi
}

# =============================================
# 5. Configurar serviço de polling
# =============================================
setup_polling_service() {
    log_info "Configurando serviço de polling..."
    
    # Cria diretório
    mkdir -p ${VPS_SERVICES_DIR}
    
    # Copia arquivos
    cp -r "${SCRIPT_DIR}/../vps-services/"* ${VPS_SERVICES_DIR}/
    
    # Configura .env
    cat > ${VPS_SERVICES_DIR}/.env << 'EOF'
# Banco de Dados (usa container typebot-db)
DB_HOST=typebot-db
DB_PORT=5432
DB_NAME=brgestor
DB_USER=brgestor_user
DB_PASSWORD=BrGestor_Secure_2026!

# APIs WhatsApp
WAHA_URL=http://waha:3000
WAHA_API_KEY=BragaDIGITal_OBrabo_1996_2025Br
EVOLUTION_URL=http://evolution-api:8080
EVOLUTION_API_KEY=evolution_api_key_2026

# Polling (10 segundos)
POLLING_INTERVAL=10000
EOF
    
    # Instala dependências
    cd ${VPS_SERVICES_DIR}
    npm install
    
    log_info "Serviço de polling configurado!"
}

# =============================================
# 6. Configurar PM2
# =============================================
setup_pm2() {
    log_info "Configurando PM2..."
    
    # Instala PM2 globalmente se não existir
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi
    
    # Para serviço existente se houver
    pm2 delete brgestor-polling 2>/dev/null || true
    
    # Inicia serviço
    cd ${VPS_SERVICES_DIR}
    pm2 start polling-service.js --name brgestor-polling
    
    # Salva configuração para restart automático
    pm2 save
    pm2 startup
    
    log_info "PM2 configurado e serviço iniciado!"
}

# =============================================
# 7. Criar tenant master inicial
# =============================================
create_master_tenant() {
    log_info "Criando tenant master inicial..."
    
    docker exec -i typebot-db psql -U typebot -d brgestor << 'EOF'
-- Cria tenant master
INSERT INTO tenants (id, type, name, status)
VALUES ('a0000000-0000-0000-0000-000000000000', 'master', 'BR Gestor Master', 'active')
ON CONFLICT (id) DO NOTHING;

-- Verifica criação
SELECT id, type, name, status FROM tenants WHERE type = 'master';
EOF
    
    log_info "Tenant master criado!"
}

# =============================================
# EXECUÇÃO PRINCIPAL
# =============================================
main() {
    log_info "Iniciando migração..."
    
    check_postgres
    create_database
    install_extensions
    apply_schema
    create_master_tenant
    setup_polling_service
    setup_pm2
    
    echo ""
    echo "============================================="
    echo -e "${GREEN}MIGRAÇÃO CONCLUÍDA COM SUCESSO!${NC}"
    echo "============================================="
    echo ""
    echo "Próximos passos:"
    echo "1. Atualize a aplicação frontend para usar o banco local"
    echo "2. Configure as variáveis de ambiente"
    echo "3. Teste o sistema"
    echo ""
    echo "Comandos úteis:"
    echo "  pm2 logs brgestor-polling   # Ver logs do polling"
    echo "  pm2 status                  # Ver status dos serviços"
    echo "  pm2 restart brgestor-polling # Reiniciar serviço"
    echo ""
    echo "Conexão com banco:"
    echo "  Host: typebot-db (interno) ou 72.60.14.172:5433 (externo)"
    echo "  Database: brgestor"
    echo "  User: brgestor_user"
    echo "  Password: BrGestor_Secure_2026!"
    echo ""
}

# Executa
main "$@"
