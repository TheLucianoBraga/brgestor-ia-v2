# 🚀 INFRAESTRUTURA SAAS COMPLETA - VPS BR GESTOR

## 📊 STATUS ATUAL
✅ **TYPEBOT STACK** - Funcionando perfeitamente
- 🔸 **Typebot Builder**: http://72.60.14.172:3002 (Porta 3002)
- 🔸 **Typebot Viewer**: http://72.60.14.172:3001 (Porta 3001)  
- 🔸 **PostgreSQL**: Porta 5433 (Database: typebot)

✅ **WAHA API** - Funcionando perfeitamente
- 🔸 **WAHA Plus**: http://72.60.14.172:3000 (Porta 3000)
- 🔸 **Status**: Respondendo com autenticação

⚠️ **EVOLUTION API** - Problema de configuração
- 🔸 **Porta**: 8081 (configurada mas não funcional)
- 🔸 **Status**: Container reiniciando constantemente
- 🔸 **Problema**: Database provider validation error

## 🔧 GERENCIAMENTO DA STACK

### Script de Controle: `manage-saas.sh`
```bash
# Comandos disponíveis:
./manage-saas.sh typebot-only      # Apenas Typebot (sempre ativo)
./manage-saas.sh with-waha         # Typebot + WAHA API ✅
./manage-saas.sh with-evolution    # Typebot + Evolution API ⚠️
./manage-saas.sh switch-to-waha    # Troca Evolution por WAHA ✅
./manage-saas.sh switch-to-evolution # Troca WAHA por Evolution ⚠️
./manage-saas.sh status            # Status dos containers
./manage-saas.sh logs              # Logs em tempo real
./manage-saas.sh full-restart      # Reinicia toda a stack
```

### 🔄 Profiles Docker Compose
- **Profile "waha"**: Typebot + WAHA (porta 3000) ✅
- **Profile "evolution"**: Typebot + Evolution API (porta 8081) ⚠️
- **Sempre ativo**: Typebot Builder/Viewer + PostgreSQL

## 🔐 CREDENCIAIS E ACESSOS

### Usuários VPS
- **Usuario**: `typebot` | **Senha**: `typebot@2026`
- **Permissões**: sudo, docker
- **SSH**: Acesso com chave `deploy_key_brgestor`

### Databases
- **PostgreSQL**: `typebot:typebot_secure_2026`
- **Database Typebot**: `typebot`
- **Database Evolution**: `evolution` (criado)
- **Porta Externa**: 5433

### APIs
- **WAHA API Key**: `waha_api_key_2026`
- **Evolution API Key**: `evolution_api_key_2026`
- **Redis Password**: `redis_secure_2026`

## 📂 ARQUIVOS DE CONFIGURAÇÃO

### `/home/typebot/saas-stack/`
- ✅ `docker-compose.yml` - Orchestração completa
- ✅ `.env` - Variáveis de ambiente
- ✅ `manage-saas.sh` - Script de gerenciamento
- ✅ `.env.backup` - Backup da configuração anterior

### Estrutura de Rede
- **Network**: `saas_network` (bridge)
- **Comunicação**: Containers se comunicam por nomes

## 🌐 MAPEAMENTO DE PORTAS

| Serviço | Porta Interna | Porta Externa | Status |
|---------|---------------|---------------|--------|
| Typebot Builder | 3000 | 3002 | ✅ |
| Typebot Viewer | 3000 | 3001 | ✅ |
| PostgreSQL | 5432 | 5433 | ✅ |
| WAHA API | 3000 | 3000 | ✅ |
| Evolution API | 8080 | 8081 | ⚠️ |
| Redis (Evolution) | 6379 | - | ✅ |

## 🔥 FIREWALL CONFIGURADO
- ✅ Porta 3001 (Typebot Viewer)
- ✅ Porta 3002 (Typebot Builder)  
- ✅ Porta 5433 (PostgreSQL)
- ✅ Porta 8081 (Evolution API)

## ⚡ COMO USAR

### 1. Conectar via SSH
```bash
ssh -i ./deploy_key_brgestor typebot@72.60.14.172
cd /home/typebot/saas-stack
```

### 2. Usar Typebot + WAHA (RECOMENDADO)
```bash
./manage-saas.sh with-waha
```

### 3. Verificar Status
```bash
./manage-saas.sh status
```

### 4. Ver Logs
```bash
./manage-saas.sh logs
```

## 🔧 PRÓXIMOS PASSOS PARA EVOLUTION API

Para corrigir a Evolution API, é necessário:

1. **Investigar logs detalhados**:
   ```bash
   docker logs evolution-api --tail=50
   ```

2. **Verificar variáveis de ambiente**:
   ```bash
   docker exec evolution-api printenv | grep DATABASE
   ```

3. **Considerar downgrade para versão estável**:
   - Testar com `atendai/evolution-api:v2.0.0`
   - Ou usar versão `latest`

4. **Alternativa: Usar apenas WAHA**:
   - WAHA está funcionando perfeitamente
   - Pode ser a solução mais estável para produção

## 🎯 AMBIENTE FUNCIONAIS

✅ **PRODUÇÃO RECOMENDADA**: 
- Typebot Builder (3002) + Typebot Viewer (3001) + WAHA API (3000)
- Totalmente funcional e testado

⚠️ **EM DESENVOLVIMENTO**: 
- Evolution API (8081) - Necessita correção de configuração

---

**Data**: 11 de Janeiro de 2026  
**Status**: Infrastructure SaaS 80% funcional  
**Prioridade**: WAHA operacional, Evolution API em debugging