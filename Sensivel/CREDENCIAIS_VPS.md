# 🔐 DADOS SENSÍVEIS - VPS BR GESTOR

> **⚠️ CONFIDENCIAL**: Não compartilhar estes dados
> **Última atualização**: 12 de Janeiro de 2026 - Migração Supabase → VPS CONCLUÍDA ✅

---

## 🖥️ SERVIDOR VPS (Hostinger)
| Campo | Valor |
|-------|-------|
| **IP** | `72.60.14.172` |
| **Provedor** | Hostinger |
| **Sistema** | Ubuntu + Docker |

### Usuários SSH
| Usuário | Senha | Uso |
|---------|-------|-----|
| `typebot` | `typebot@2026` | Principal (stack SAAS) |
| `evolution` | `evolution@2026` | Alternativo |

### Conexão SSH
```bash
ssh -i ./deploy_key_brgestor typebot@72.60.14.172
```

---

## 🐳 CONTAINERS DOCKER

| Container | Porta Interna | Porta Externa | Status |
|-----------|--------------|---------------|--------|
| **waha** (API 1) | 3000 | 3000 | ✅ Ativo |
| **evolution-api** (API 2) | 8080 | 8081 | ✅ Ativo |
| **evolution-redis** | 6379 | - | ✅ Ativo |
| **typebot-builder** | 3000 | 3002 | ✅ Ativo |
| **typebot-viewer** | 3000 | 3001 | ✅ Ativo |
| **typebot-db** | 5432 | 5433 | ✅ Ativo |
| **caddy** | 80/443 | 80/443 | ✅ Ativo |
| **brgestor** | 80 | via Caddy | ✅ Ativo |
| **n8n** | 5678 | 127.0.0.1:5678 | ✅ Ativo |

---

## 🔑 CHAVES SSH
| Campo | Valor |
|-------|-------|
| **Arquivo Local** | `deploy_key_brgestor` |
| **Arquivo Público** | `deploy_key_brgestor.pub` |
| **Localização VPS** | `/home/typebot/.ssh/authorized_keys` |

---

## 💾 BANCO DE DADOS PostgreSQL

### Container: typebot-db (PostgreSQL 15)
| Campo | Valor |
|-------|-------|
| **Host Interno** | `typebot-db` |
| **Host Externo** | `72.60.14.172:5433` |

### Usuário Master (Admin do Container)
| Campo | Valor |
|-------|-------|
| **User** | `typebot` |
| **Password** | `typebot_secure_2026` |

### Databases e Usuários por Área

#### Typebot (Chatbot Builder)
| Campo | Valor |
|-------|-------|
| **Database** | `typebot` |
| **User** | `typebot` |
| **Password** | `typebot_secure_2026` |
| **Connection URI** | `postgresql://typebot:typebot_secure_2026@typebot-db:5432/typebot` |

#### Evolution API (WhatsApp API 2)
| Campo | Valor |
|-------|-------|
| **Database** | `evolution` |
| **User** | `typebot` |
| **Password** | `typebot_secure_2026` |
| **Connection URI** | `postgresql://typebot:typebot_secure_2026@typebot-db:5432/evolution` |

#### BRGestor (Aplicação Principal) - NOVO
| Campo | Valor |
|-------|-------|
| **Database** | `brgestor` |
| **User** | `brgestor_user` |
| **Password** | `Manu07062022` |
| **Connection URI Interna** | `postgresql://brgestor_user:Manu07062022@typebot-db:5432/brgestor` |
| **Connection URI Externa** | `postgresql://brgestor_user:Manu07062022@72.60.14.172:5433/brgestor` |

---

## 🤖 SERVIÇOS VPS (PM2)

### Polling Service (Substitui Edge Functions)
| Campo | Valor |
|-------|-------|
| **Nome PM2** | `brgestor-polling` |
| **Diretório** | `/home/typebot/brgestor-services` |
| **Arquivo** | `polling-service.js` |
| **Intervalo** | `10000ms` (10 segundos) |
| **Logs** | `pm2 logs brgestor-polling` |

### Webhook Service (Substitui Edge Functions do Supabase)
| Campo | Valor |
|-------|-------|
| **Nome PM2** | `brgestor-webhook` |
| **Diretório** | `/home/typebot/brgestor-services` |
| **Arquivo** | `webhook-service.js` |
| **Porta** | `3333` |
| **API 1 Endpoint** | `http://72.60.14.172:3333/api1/webhook` |
| **API 2 Endpoint** | `http://72.60.14.172:3333/api2/webhook` |
| **Health Check** | `http://72.60.14.172:3333/health` |
| **Logs** | `pm2 logs brgestor-webhook` |

### Comandos PM2
```bash
# Ver status
pm2 status

# Ver logs
pm2 logs brgestor-polling

# Reiniciar
pm2 restart brgestor-polling

# Parar
pm2 stop brgestor-polling

# Iniciar
pm2 start brgestor-polling

# Todos os serviços
pm2 status
pm2 logs --lines 50
```

### Backup e Monitoramento
| Campo | Valor |
|-------|-------|
| **Backup Diário** | `02:00` (via crontab) |
| **Script Backup** | `/home/typebot/backup-daily.sh` |
| **Diretório Backups** | `/home/typebot/backups` |
| **Retenção** | `30 dias` |
| **Monitoramento** | `*/5 min` (via crontab) |
| **Script Monitor** | `/home/typebot/monitor-services.sh` |
| **Logs Monitor** | `/home/typebot/logs/monitor.log` |

### Comandos de Backup
```bash
# Backup manual
/home/typebot/backup-daily.sh

# Ver backups
ls -lh /home/typebot/backups/

# Restaurar backup (exemplo)
# gunzip backup.sql.gz
# docker exec -i typebot-db psql -U brgestor_user -d brgestor < backup.sql

# Ver logs de monitoramento
tail -f /home/typebot/logs/monitor.log
```

---

## 🔧 API KEYS - WhatsApp

### API 1 (WAHA) - Usar internamente, nunca mostrar "WAHA" para usuário
| Campo | Valor |
|-------|-------|
| **URL** | `http://72.60.14.172:3000` |
| **Dashboard** | `http://72.60.14.172:3000/dashboard` |
| **Dashboard User** | `admin` |
| **Dashboard Password** | `LB_VC_WM_VE_1996_1998_2018_2022` |
| **API Key** | `BragaDIGITal_OBrabo_1996_2025Br` |
| **Versão** | `Plus` |
| **Webhook URL** | `http://72.60.14.172:3333/api1/webhook` |

### API 2 (Evolution) - Usar internamente, nunca mostrar "Evolution" para usuário
| Campo | Valor |
|-------|-------|
| **URL** | `http://72.60.14.172:8081` |
| **API Key Global** | `evolution_api_key_2026` |
| **Manager URL** | `http://72.60.14.172:8081/manager` |
| **Webhook URL** | `http://72.60.14.172:3333/api2/webhook` |
| **Versão** | `v2.1.1` |

---

## 🔐 OUTRAS CHAVES

| Serviço | Chave/Valor |
|---------|-------------|
| **NextAuth Secret** | `your-super-secret-nextauth-key-change-this-32chars` |
| **Redis Password** | `redis_secure_2026` |

---

## ☁️ SUPABASE

| Campo | Valor |
|-------|-------|
| **Project ID** | `uoogxqtbasbvcmtgxzcu` |
| **URL** | `https://uoogxqtbasbvcmtgxzcu.supabase.co` |
| **Anon Key** | Ver dashboard Supabase |
| **Service Role Key** | Ver dashboard Supabase |

---

## 📧 SMTP (Para configurar)

| Campo | Valor |
|-------|-------|
| **Host** | `smtp.gmail.com` |
| **Port** | `587` |
| **User** | `your-email@gmail.com` |
| **Password** | `your-app-password` |
| **From Address** | `noreply@brgestor.app` |
| **From Name** | `BR Gestor` |

---

## 🌐 URLs DOS SERVIÇOS

| Serviço | URL |
|---------|-----|
| **BR Gestor (Frontend)** | `https://brgestor.app` |
| **API 1 Dashboard** | `http://72.60.14.172:3000/dashboard` |
| **API 1 Endpoint** | `http://72.60.14.172:3000` |
| **API 2 Manager** | `http://72.60.14.172:8081/manager` |
| **API 2 Endpoint** | `http://72.60.14.172:8081` |
| **Typebot Builder** | `http://72.60.14.172:3002` |
| **Typebot Viewer** | `http://72.60.14.172:3001` |
| **N8N** | `http://127.0.0.1:5678` (local only) |

---

## 🚀 COMANDOS DE EMERGÊNCIA

### Conectar SSH
```bash
ssh -i ./deploy_key_brgestor typebot@72.60.14.172
```

### Ver Status dos Containers
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Logs dos Containers
```bash
# API 1 (WAHA)
docker logs waha --tail 50 -f

# API 2 (Evolution)
docker logs evolution-api --tail 50 -f

# Todos
docker compose logs -f
```

### Reiniciar Containers
```bash
cd /home/typebot/saas-stack

# Reiniciar API 1
docker compose --profile waha up -d --force-recreate waha

# Reiniciar API 2
docker compose --profile evolution up -d --force-recreate evolution-api

# Reiniciar Tudo
docker compose --profile waha --profile evolution up -d
```

### Backup Database
```bash
docker exec typebot-db pg_dump -U typebot typebot > backup-$(date +%Y%m%d).sql
```

### Ver Variáveis de Ambiente
```bash
cat /home/typebot/saas-stack/.env
```

---

## 📁 ESTRUTURA DE PASTAS VPS

```
/home/typebot/
├── saas-stack/
│   ├── docker-compose.yml    # Stack principal
│   ├── .env                  # Variáveis de ambiente
│   └── manage-saas.sh        # Script de gerenciamento
├── brgestor-services/        # Serviços Node.js (Polling + Webhook)
│   ├── polling-service.js    # Polling WhatsApp
│   ├── webhook-service.js    # Webhook service (substitui Edge Functions)
│   ├── package.json
│   └── .env                  # Variáveis dos serviços
├── migration/                # Scripts de migração
│   ├── 01-create-database.sql
│   ├── 02-create-schema.sql
│   ├── 03-insert-whatsapp-instances.sql
│   └── migrate-to-vps.sh
├── backups/                  # Backups automáticos
│   ├── backup.log
│   └── *.sql.gz              # Backups comprimidos
├── logs/                     # Logs de monitoramento
│   ├── monitor.log
│   └── backup.log
├── backup-daily.sh           # Script de backup diário
├── monitor-services.sh       # Script de monitoramento
└── brgestor-ia-v2/           # Frontend (se deployado)
    └── ...
```

---

## 🔥 FIREWALL HOSTINGER

Portas que devem estar abertas no painel da Hostinger:

| Porta | Protocolo | Serviço |
|-------|-----------|---------|
| 22 | TCP | SSH |
| 80 | TCP | HTTP (Caddy) |
| 443 | TCP | HTTPS (Caddy) |
| 3000 | TCP | API 1 (WAHA) |
| 8081 | TCP | API 2 (Evolution) |

---

## 📝 NOTAS IMPORTANTES

1. **API 1** - Licença Plus ativa, usar para produção
2. **API 2** - Gratuita, backup/alternativa
3. **✅ MIGRAÇÃO CONCLUÍDA** - Webhooks apontam para VPS (não mais Supabase)
4. **Webhook Service** - Porta 3333, substitui completamente as Edge Functions
5. **Polling Service** - Continua ativo, processa mensagens a cada 10 segundos
6. **Backup Automático** - Diário às 02:00, retenção de 30 dias
7. **Monitoramento** - A cada 5 minutos, reinicia serviços se necessário
8. **DNS** configurado com 8.8.8.8 e 8.8.4.4 no docker-compose para resolver problemas da Hostinger
9. **Redis** desabilitado temporariamente na API 2 (funciona sem)
10. **Nunca mostrar nomes internos (WAHA/Evolution) na interface do usuário** - usar apenas "API 1" e "API 2"
11. **BRGestor DB** - Banco separado para aplicação principal, isolado dos outros serviços
12. **🎯 SUPABASE PODE SER DESATIVADO** - Toda funcionalidade migrada para VPS

---

**⚠️ NUNCA COMMITAR ESTE ARQUIVO COM SENHAS REAIS EXPOSTAS**
