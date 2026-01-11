# BRGestor IA — Guia de Deploy

Este documento contém instruções para deploy do BRGestor IA na VPS.

## Arquivos de Deploy

- `Dockerfile` - Multi-stage build (Node + Nginx)
- `docker-compose.yml` - Orquestração de containers
- `Caddyfile` - Configuração do proxy reverso com TLS
- `.env.example` - Variáveis de ambiente
- `scripts/remote_deploy.sh` - Script de deploy remoto
- `scripts/deploy.sh` - Script de deploy manual
- `.github/workflows/deploy.yml` - GitHub Actions para deploy automático

## Pré-requisitos na VPS

1. Docker e Docker Compose instalados
2. Usuário `brgestor` criado
3. Chave SSH configurada em `~/.ssh/authorized_keys`

## Deploy Manual

```bash
cd /home/brgestor/brgestor-ia-v2
./scripts/deploy.sh
```

## Deploy Automático

Configurar Secrets no GitHub:
- `SSH_PRIVATE_KEY` - Chave privada SSH
- `SSH_USER` - brgestor
- `SSH_HOST` - IP da VPS
- `SSH_PORT` - 22

Push para `master` dispara deploy automático.

## Configuração do Domínio

1. Atualizar `Caddyfile` com o domínio real
2. Configurar DNS A record apontando para o IP da VPS
3. Caddy gerará certificados TLS automaticamente

## Logs

```bash
docker compose logs -f
```

## Data de criação

10 de janeiro de 2026
