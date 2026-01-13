# Copilot Instructions for brgestor-ia-v2

## Visão Geral da Arquitetura
- O projeto é um sistema multi-tenant para gestão de clientes, integrações WhatsApp, financeiro e automações, com backend Node.js/TypeScript e frontend React (Vite, Tailwind, shadcn-ui).
- Banco de dados principal: PostgreSQL, migrado do Supabase para VPS local (ver `scripts/migration/README.md`).
- Serviços de backend e polling rodam em Node.js (ver `scripts/vps-services/`).
- Integrações externas: WhatsApp (WAHA), Evolution API, entre outros.

## Fluxos e Convenções Essenciais
- **Migração e Setup**: Siga o guia detalhado em `scripts/migration/README.md` para criar banco, aplicar schemas e configurar serviços na VPS.
- **Ambiente de Desenvolvimento**:
  - Instale dependências com `npm i` na raiz.
  - Inicie o frontend com `npm run dev`.
  - Serviços de backend/polling são gerenciados via PM2 na VPS (`pm2 start polling-service.js --name brgestor-polling`).
- **Scripts SQL**: Todos os scripts de criação e migração de banco estão em `scripts/migration/`.
- **Configuração Sensível**: Variáveis de ambiente e credenciais estão em arquivos `.env` (exemplo em `scripts/vps-services/.env.example`).
- **Deploy**: O deploy pode ser feito via Lovable (ver README) ou manualmente na VPS.

## Padrões e Estruturas de Código
- **Frontend**: Código React/TypeScript está em `src/` (componentes, hooks, pages, services, etc.).
- **Backend/Serviços**: Scripts Node.js para polling e integrações em `scripts/vps-services/`.
- **Migrations**: SQL versionado em `scripts/migration/`.
- **Scripts utilitários**: Shell, PowerShell e SQL para automação e manutenção em `scripts/`.

## Integrações e Comunicação
- **WhatsApp**: Comunicação via WAHA API, configurada em `.env`.
- **Evolution API**: Integração via REST, também configurada em `.env`.
- **Polling**: Serviço Node.js faz polling periódico para sincronização de dados e eventos.

## Convenções Específicas do Projeto
- **Multi-tenant**: Tabelas como `tenants`, `tenant_members`, `tenant_settings` são centrais.
- **Não use Supabase**: Após migração, todo backend roda localmente na VPS.
- **Senhas e chaves**: Nunca commite arquivos `.env` ou credenciais (ver alerta em `scripts/migration/README.md`).
- **Scripts de manutenção**: Use scripts em `scripts/` para tarefas administrativas e de deploy.

## Exemplos de Arquivos-Chave
- `src/` — Frontend React/TypeScript
- `scripts/migration/README.md` — Guia de migração e setup do banco
- `scripts/vps-services/polling-service.js` — Serviço de polling Node.js
- `scripts/vps-services/.env.example` — Exemplo de configuração de ambiente

## Fluxos de Trabalho Recomendados
- Para desenvolvimento local: `npm i` → `npm run dev` (frontend)
- Para backend/polling: configure `.env`, instale dependências e use PM2
- Para migração/infra: siga o passo a passo do `scripts/migration/README.md`

---

> Atualize este arquivo sempre que houver mudanças relevantes na arquitetura, fluxos ou padrões do projeto.
