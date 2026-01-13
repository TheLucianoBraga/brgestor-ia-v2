# 🚀 Guia de Deploy do Backend VPS

## ✅ Alterações Implementadas

Adicionadas as seguintes rotas em `api-service.js`:

| Rota | Método | Descrição | Auth |
|------|--------|-----------|------|
| `/rest/v1/tenant_settings` | GET | Configurações do tenant | ✅ JWT |
| `/rest/v1/plans` | GET | Lista de planos | ❌ Pública |
| `/rest/v1/chatbot_config` | GET | Config do chatbot | ✅ JWT |
| `/rpc/get_master_signup_ref_code` | POST | Código de referência | ❌ Pública |

---

## 📋 Passo a Passo para Deploy

### 1. **Conectar na VPS via SSH**
```bash
ssh root@72.60.14.172
# Senha: Manu07062022
```

### 2. **Parar o serviço atual**
```bash
pm2 stop brgestor-webhook
```

### 3. **Fazer backup do arquivo atual**
```bash
cd /root/brgestor-services
cp api-service.js api-service.js.backup-$(date +%Y%m%d-%H%M%S)
```

### 4. **Copiar novo arquivo**

**Opção A - Via SCP (do seu Windows):**
```powershell
scp scripts/vps-services/api-service.js root@72.60.14.172:/root/brgestor-services/api-service.js
```

**Opção B - Via nano (copiar e colar):**
```bash
nano /root/brgestor-services/api-service.js
# Apagar tudo (Ctrl+K várias vezes)
# Colar o novo conteúdo
# Salvar (Ctrl+O, Enter, Ctrl+X)
```

### 5. **Reiniciar o serviço**
```bash
pm2 restart brgestor-webhook
pm2 logs brgestor-webhook --lines 50
```

### 6. **Verificar se está funcionando**
```bash
# Testar health
curl http://localhost:3333/health

# Testar endpoint novo
curl http://localhost:3333/rest/v1/plans
```

---

## 🧪 Testes no Frontend

Após deploy, teste localmente:

1. **Iniciar frontend em modo VPS:**
```bash
cd c:\Users\thebr\Documents\brgestor-ia-v2
npm run dev
# Alterar vite.config.ts para apontar para VPS se necessário
```

2. **Verificar console do navegador:**
- Abrir DevTools (F12)
- Aba Network
- Fazer login e verificar se as rotas `/rest/v1/*` retornam 200 OK

---

## 🔍 Troubleshooting

### Erro: "Connection refused"
```bash
# Verificar se API está rodando
pm2 status

# Ver logs de erro
pm2 logs brgestor-webhook --err --lines 100
```

### Erro: "Token inválido"
```bash
# Verificar JWT_SECRET no .env
cat /root/brgestor-services/.env | grep JWT_SECRET
```

### Erro: "Tabela não encontrada"
```bash
# Conectar no banco e verificar
docker exec -it typebot-db psql -U brgestor_user -d brgestor

# Listar tabelas
\dt

# Se faltar tabelas, rodar:
\i /path/to/02-create-schema.sql
```

---

## ✅ Checklist Pós-Deploy

- [ ] Serviço `brgestor-webhook` rodando (`pm2 status`)
- [ ] Logs sem erros (`pm2 logs brgestor-webhook`)
- [ ] Health check retorna 200 OK
- [ ] Endpoint `/rest/v1/plans` retorna dados
- [ ] Frontend consegue fazer login
- [ ] Frontend carrega tenant_settings sem erro

---

**Data da implementação:** 13/01/2026  
**Arquivo modificado:** `scripts/vps-services/api-service.js`  
**Linhas adicionadas:** ~127 linhas (rotas /rest/v1/*)
