#!/bin/bash

# Configurar webhook na sessão tenant_a0000000
curl -X POST http://localhost:3000/api/sessions/tenant_a0000000/stop \
  -H "X-Api-Key: BragaDIGITal_OBrabo_1996_2025Br"

sleep 3

curl -X POST http://localhost:3000/api/sessions/tenant_a0000000/start \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: BragaDIGITal_OBrabo_1996_2025Br" \
  -d '{
    "config": {
      "webhooks": [
        {
          "url": "https://uoogxqtbasbvcmtgxzcu.supabase.co/functions/v1/waha-webhook",
          "events": ["message"]
        }
      ]
    }
  }'

sleep 2

# Verificar
curl -X GET http://localhost:3000/api/sessions \
  -H "X-Api-Key: BragaDIGITal_OBrabo_1996_2025Br" | jq
