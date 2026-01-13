# 🔄 Migração Completa: Supabase → API REST Própria

**Data:** 13/01/2026  
**Versão:** 2.0.0

---

## 📋 Resumo da Migração

Migração completa do frontend de endpoints PostgREST/Supabase (`/rest/v1/*`, `/rpc/*`) para API REST própria (`/api/*`).

---

## 🗂️ Arquivos Modificados

### Backend VPS
| Arquivo | Descrição |
|---------|-----------|
| `scripts/vps-services/api-service.js` | Backend completo reescrito (~580 linhas) |
| `scripts/vps-services/DEPLOY_GUIDE.md` | Guia de deploy atualizado |

### Frontend - Services
| Arquivo | Descrição |
|---------|-----------|
| `src/services/api.ts` | **NOVO** - Cliente API unificado (~320 linhas) |
| `src/services/referralService.ts` | Migrado para usar `api.*` |
| `src/services/customerService.ts` | Migrado para usar `api.*` |

### Frontend - Hooks
| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useCharges.ts` | Migrado para `api.getCharges()`, etc. |
| `src/hooks/useCoupons.ts` | Migrado para `api.getCoupons()`, etc. |
| `src/hooks/useActivityLog.ts` | Migrado para `api.getActivityLogs()`, etc. |
| `src/hooks/usePlans.ts` | Migrado para `api.getPlans()`, etc. |
| `src/hooks/useTenantSettings.ts` | Migrado para `api.getTenantSettings()`, etc. |
| `src/hooks/useCustomers.ts` | Migrado deletes para `api.*` |

### Mock Backend (Dev)
| Arquivo | Descrição |
|---------|-----------|
| `mock-backend/server.js` | Mock com endpoints `/api/*` (~330 linhas) |
| `mock-backend/package.json` | Dependências do mock |
| `mock-backend/README.md` | Documentação do mock |

### Config/Infra
| Arquivo | Descrição |
|---------|-----------|
| `vite.config.ts` | Proxy atualizado para porta 4000 |
| `src/integrations/vps/client.ts` | URL base corrigida |
| `src/pages/app/WhatsApp.tsx` | URLs de webhook atualizadas |
| `start-mock.bat` | Script para iniciar dev local (Windows) |
| `start-mock.sh` | Script para iniciar dev local (Unix) |

---

## 🔗 Mapeamento de Endpoints

### Antes (Supabase/PostgREST)
```
GET    /rest/v1/customers?tenant_id=eq.X
POST   /rest/v1/customers
DELETE /rest/v1/customers?id=eq.X
GET    /rest/v1/customer_charges
GET    /rest/v1/coupons
GET    /rest/v1/plans
GET    /rest/v1/activity_logs
GET    /rest/v1/tenant_settings
GET    /rest/v1/customer_referral_links
POST   /rpc/get_master_signup_ref_code
```

### Depois (API REST Própria)
```
GET    /api/customers
POST   /api/customers
DELETE /api/customers/:id
GET    /api/charges
GET    /api/coupons
GET    /api/plans
GET    /api/activity-logs
GET    /api/tenant-settings
GET    /api/referrals/links
POST   /auth/signup/referral-code
```

---

## 🔐 Autenticação

- **Token:** JWT gerado pelo backend
- **Header:** `Authorization: Bearer <token>`
- **Storage:** `localStorage.brgestor_token`
- **Expiração:** 7 dias

---

## 📦 Response Format

Todos os endpoints retornam:

```json
{
  "data": <resultado>,
  "error": null
}
```

Em caso de erro:
```json
{
  "data": null,
  "error": "Mensagem de erro"
}
```

---

## 🚀 Como Usar

### Desenvolvimento Local
```bash
# Windows
start-mock.bat

# Unix/Mac
./start-mock.sh
```

### Produção (VPS)
```bash
scp scripts/vps-services/api-service.js root@72.60.14.172:/home/typebot/brgestor-services/
ssh root@72.60.14.172 "pm2 restart brgestor-api"
```

---

## ✅ Testes Realizados

- [x] `/health` → OK
- [x] `/api/plans` → 6 planos retornados
- [x] `/auth/signup/referral-code` → `BRGESTOR2026`
- [x] Auth rejeitando tokens inválidos
- [x] PM2 `brgestor-api` online

---

## 📝 Notas

1. **Zero dependência de Supabase** - Backend 100% local
2. **Multi-tenant** - Todos endpoints filtram por `tenant_id`
3. **Mock alinhado** - Mesma estrutura que produção
4. **Typesafe** - `api.ts` com métodos tipados

---

**Autor:** GitHub Copilot  
**Modelo:** Claude Opus 4.5
