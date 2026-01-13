#!/bin/bash
# Fix CORS na API VPS

cd /home/typebot/brgestor-services

# Backup
cp api-service.js api-service.js.backup

# Substituir CORS para aceitar todas origens
sed -i "s|origin: \[|origin: '*', // Aceitar todas origens\n    /*origin: [|" api-service.js

# Reiniciar API
pm2 restart brgestor-api

echo "CORS corrigido! API reiniciada."
pm2 logs brgestor-api --lines 5
