#!/usr/bin/env bash
# scripts/deploy.sh
set -e
REPO_DIR="/home/brgestor/brgestor-ia-v2"
BRANCH="master"

cd "$REPO_DIR"
git fetch --all
git reset --hard "origin/$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

docker compose pull || true
docker compose build --parallel
docker compose up -d --remove-orphans
docker image prune -af || true

echo "Deploy manual concluído: $(date)"
