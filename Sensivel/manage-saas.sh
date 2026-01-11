#!/bin/bash

case $1 in
    "typebot-only")
        echo "Iniciando apenas Typebot (sempre ativo)..."
        docker-compose up -d typebot-db typebot-builder typebot-viewer
        ;;
    "with-waha")
        echo "Iniciando Typebot + WAHA (porta 3000)..."
        docker-compose --profile waha up -d
        ;;
    "with-evolution")
        echo "Iniciando Typebot + Evolution API (porta 8081)..."
        docker-compose --profile evolution up -d
        ;;
    "stop-waha")
        echo "Parando perfil WAHA..."
        docker-compose --profile waha down
        ;;
    "stop-evolution")
        echo "Parando perfil Evolution..."
        docker-compose --profile evolution down
        ;;
    "status")
        echo "=== Status dos containers ===="
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        ;;
    "logs")
        echo "=== Logs dos servicos ===="
        docker-compose logs -f --tail=50
        ;;
    "switch-to-waha")
        echo "Parando Evolution e iniciando WAHA..."
        docker-compose --profile evolution down
        docker-compose --profile waha up -d
        ;;
    "switch-to-evolution")
        echo "Parando WAHA e iniciando Evolution..."
        docker-compose --profile waha down
        docker-compose --profile evolution up -d
        ;;
    "full-restart")
        echo "Reiniciando toda a stack..."
        docker-compose down
        docker-compose up -d typebot-db typebot-builder typebot-viewer
        ;;
    *)
        echo "Uso: $0 {typebot-only|with-waha|with-evolution|stop-waha|stop-evolution|switch-to-waha|switch-to-evolution|status|logs|full-restart}"
        echo ""
        echo "Comandos disponíveis:"
        echo "  typebot-only      - Inicia apenas Typebot (base)"
        echo "  with-waha         - Inicia Typebot + WAHA API"
        echo "  with-evolution    - Inicia Typebot + Evolution API"
        echo "  switch-to-waha    - Troca Evolution por WAHA"
        echo "  switch-to-evolution - Troca WAHA por Evolution"
        echo "  stop-waha         - Para apenas WAHA"
        echo "  stop-evolution    - Para apenas Evolution"
        echo "  status            - Mostra status dos containers"
        echo "  logs              - Mostra logs em tempo real"
        echo "  full-restart      - Reinicia toda a stack"
        exit 1
        ;;
esac