#!/bin/bash
curl -X POST http://localhost:3000/api/sessions/start \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: BragaDIGITal_OBrabo_1996_2025Br" \
  -d '{
    "name": "tenant_a0000000",
    "config": {
      "webhooks": [
        {
          "url": "https://uoogxqtbasbvcmtgxzcu.supabase.co/functions/v1/waha-webhook",
          "events": ["message"]
        }
      ]
    }
  }'
