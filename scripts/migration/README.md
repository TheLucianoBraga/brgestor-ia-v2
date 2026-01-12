# 🚀 Guia de Migração: Supabase → VPS Local

> **Data**: 12 de Janeiro de 2026  
> **Status**: Pronto para execução

---

## 📋 Resumo

Este guia documenta o processo de migração do banco de dados e Edge Functions do Supabase para a VPS local.

### Benefícios da Migração
- ✅ Sem custo de Edge Functions
- ✅ Sem limite de execuções
- ✅ Menor latência (tudo local)
- ✅ Controle total do ambiente
- ✅ Polling configurável (10s, 30s, etc.)

---

## 📁 Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `scripts/migration/01-create-database.sql` | Cria banco e usuário |
| `scripts/migration/02-create-schema.sql` | Schema completo (50+ tabelas) |
| `scripts/migration/migrate-to-vps.sh` | Script automatizado de migração |
| `scripts/vps-services/polling-service.js` | Serviço de polling Node.js |
| `scripts/vps-services/package.json` | Dependências do serviço |
| `scripts/vps-services/.env.example` | Exemplo de variáveis |

---

## 🔧 Execução Manual (Passo a Passo)

### 1. Enviar arquivos para VPS
```powershell
# No Windows (PowerShell)
scp -i "Sensivel\deploy_key_brgestor" -r scripts/migration scripts/vps-services typebot@72.60.14.172:/home/typebot/
```

### 2. Conectar na VPS
```bash
ssh -i Sensivel/deploy_key_brgestor typebot@72.60.14.172
# Senha: typebot@2026
```

### 3. Criar banco de dados
```bash
# Criar banco brgestor
docker exec -i typebot-db psql -U typebot -c "CREATE DATABASE brgestor;"

# Criar usuário dedicado
docker exec -i typebot-db psql -U typebot -c "CREATE USER brgestor_user WITH PASSWORD 'BrGestor_Secure_2026!';"

# Conceder privilégios
docker exec -i typebot-db psql -U typebot -c "GRANT ALL PRIVILEGES ON DATABASE brgestor TO brgestor_user;"
docker exec -i typebot-db psql -U typebot -d brgestor -c "GRANT ALL ON SCHEMA public TO brgestor_user;"
```

### 4. Instalar extensões
```bash
docker exec -i typebot-db psql -U typebot -d brgestor -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
docker exec -i typebot-db psql -U typebot -d brgestor -c 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'
```

### 5. Aplicar schema
```bash
cd /home/typebot/migration
docker exec -i typebot-db psql -U typebot -d brgestor < 02-create-schema.sql
```

### 6. Criar tenant master
```bash
docker exec -i typebot-db psql -U typebot -d brgestor -c "
INSERT INTO tenants (id, type, name, status)
VALUES ('a0000000-0000-0000-0000-000000000000', 'master', 'BR Gestor Master', 'active')
ON CONFLICT (id) DO NOTHING;
"
```

### 7. Configurar serviço de polling
```bash
# Criar diretório
mkdir -p /home/typebot/brgestor-services
cd /home/typebot/brgestor-services

# Copiar arquivos
cp /home/typebot/vps-services/* .

# Criar .env
cat > .env << 'EOF'
DB_HOST=typebot-db
DB_PORT=5432
DB_NAME=brgestor
DB_USER=brgestor_user
DB_PASSWORD=BrGestor_Secure_2026!
WAHA_URL=http://waha:3000
WAHA_API_KEY=BragaDIGITal_OBrabo_1996_2025Br
EVOLUTION_URL=http://evolution-api:8080
EVOLUTION_API_KEY=evolution_api_key_2026
POLLING_INTERVAL=10000
EOF

# Instalar dependências
npm install
```

### 8. Iniciar com PM2
```bash
# Instalar PM2 (se não tiver)
sudo npm install -g pm2

# Iniciar serviço
pm2 start polling-service.js --name brgestor-polling

# Salvar para restart automático
pm2 save
pm2 startup
```

---

## 🔄 Execução Automatizada

```bash
# Na VPS, execute:
cd /home/typebot/migration
chmod +x migrate-to-vps.sh
sudo ./migrate-to-vps.sh
```

---

## ✅ Verificação

### Verificar banco
```bash
docker exec -i typebot-db psql -U brgestor_user -d brgestor -c "\dt"
```

### Verificar serviço
```bash
pm2 status
pm2 logs brgestor-polling
```

### Testar conexão externa
```bash
psql -h 72.60.14.172 -p 5433 -U brgestor_user -d brgestor -c "SELECT COUNT(*) FROM tenants;"
```

---

## 📊 Tabelas Criadas (50+)

### Core
- `tenants` - Multi-tenant
- `users` - Usuários (substitui auth.users)
- `tenant_members` - Membros por tenant
- `profiles` - Perfis
- `tenant_settings` - Configurações

### Clientes
- `customers` - Clientes
- `customer_addresses` - Endereços
- `customer_vehicles` - Veículos
- `customer_items` - Itens/Produtos
- `customer_charges` - Cobranças

### WhatsApp
- `whatsapp_instances` - Instâncias
- `whatsapp_groups` - Grupos
- `group_autoresponder_config` - Config auto-resposta
- `chat_memory` - Memória de conversas
- `chat_messages_history` - Histórico
- `chat_ratings` - Avaliações

### Financeiro
- `plans` - Planos
- `plan_prices` - Preços
- `services` - Serviços
- `subscriptions` - Assinaturas
- `payments` - Pagamentos
- `coupons` - Cupons

### Despesas
- `expenses` - Despesas
- `expense_categories` - Categorias
- `expense_cost_centers` - Centros de custo
- `expense_reminders` - Lembretes
- `expense_ai_learning` - IA

### Outros
- `notes` - Notas
- `notifications` - Notificações
- `activity_logs` - Auditoria
- `referral_links` - Indicações

---

## ⚠️ Próximos Passos (Pós-Migração)

1. **Atualizar Frontend**: Configurar nova URL do banco
2. **Migrar Dados**: Exportar dados do Supabase e importar
3. **Testar Fluxos**: Verificar todas as funcionalidades
4. **Atualizar Webhooks**: Apontar APIs para polling local
5. **Desativar Supabase**: Após validação completa

---

## 🔐 Credenciais

| Item | Valor |
|------|-------|
| **Database** | `brgestor` |
| **User** | `brgestor_user` |
| **Password** | `BrGestor_Secure_2026!` |
| **Host Interno** | `typebot-db:5432` |
| **Host Externo** | `72.60.14.172:5433` |

---

**⚠️ IMPORTANTE**: Este arquivo contém senhas. Não commitar!
