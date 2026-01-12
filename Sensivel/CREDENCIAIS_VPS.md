# 🔐 DADOS SENSÍVEIS - VPS BR GESTOR

> **⚠️ CONFIDENCIAL**: Não compartilhar estes dados
> **Última atualização**: 12 de Janeiro de 2026

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

| Campo | Valor |
|-------|-------|
| **Host** | `typebot-db` (interno) / `72.60.14.172:5433` (externo) |
| **User** | `typebot` |
| **Password** | `typebot_secure_2026` |
| **Database Typebot** | `typebot` |
| **Database Evolution** | `evolution` |
| **Connection URI** | `postgresql://typebot:typebot_secure_2026@typebot-db:5432/evolution` |

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
| **Webhook URL** | `https://uoogxqtbasbvcmtgxzcu.supabase.co/functions/v1/waha-webhook-v3` |

### API 2 (Evolution) - Usar internamente, nunca mostrar "Evolution" para usuário
| Campo | Valor |
|-------|-------|
| **URL** | `http://72.60.14.172:8081` |
| **API Key Global** | `evolution_api_key_2026` |
| **Manager URL** | `http://72.60.14.172:8081/manager` |
| **Webhook URL** | `https://uoogxqtbasbvcmtgxzcu.supabase.co/functions/v1/evolution-webhook` |
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
3. **Webhook URLs** apontam para Edge Functions do Supabase
4. **DNS** configurado com 8.8.8.8 e 8.8.4.4 no docker-compose para resolver problemas da Hostinger
5. **Redis** desabilitado temporariamente na API 2 (funciona sem)
6. **Nunca mostrar nomes internos (WAHA/Evolution) na interface do usuário** - usar apenas "API 1" e "API 2"

---

**⚠️ NUNCA COMMITAR ESTE ARQUIVO COM SENHAS REAIS EXPOSTAS**
