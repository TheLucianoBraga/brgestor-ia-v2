#!/usr/bin/env bash
# scripts/remote_deploy.sh
set -e

REPO_DIR="${REPO_DIR:-/home/brgestor/brgestor-ia-v2}"
BRANCH="${BRANCH:-master}"
DOCKER_COMPOSE_CMD="${DOCKER_COMPOSE_CMD:-docker compose}"

echo "Iniciando deploy remoto em $(hostname) - $(date)"

if [ ! -d "$REPO_DIR" ]; then
  echo "Diretório $REPO_DIR não existe. Clonando repositório..."
  git clone git@github.com:TheLucianoBraga/brgestor-ia-v2.git "$REPO_DIR"
fi

cd "$REPO_DIR"
git fetch --all
git reset --hard "origin/$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

# Build e subir containers
$DOCKER_COMPOSE_CMD pull || true
$DOCKER_COMPOSE_CMD build --parallel
$DOCKER_COMPOSE_CMD up -d --remove-orphans

# Limpeza opcional
docker image prune -af || true

echo "Deploy finalizado em $(date)"
