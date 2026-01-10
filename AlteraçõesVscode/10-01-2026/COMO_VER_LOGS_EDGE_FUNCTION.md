# 📊 Como ver logs da Edge Function (waha-webhook)

## 🔍 Opção 1: Supabase Dashboard (RECOMENDADO)

1. Abra o **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **Edge Functions**
4. Clique na função **waha-webhook**
5. Vá na aba **Logs** ou **Invocations**
6. Configure o filtro de tempo (últimos 15 min, 1 hora, etc)

### O que procurar nos logs:

```
📦 Media info: { hasMedia: true, mediaType: 'image', ... }
🔍 Media detection: { hasMediaContent: true, isImageMessage: true, ... }
📥 Procurando Message ID: { ... }
```

Se aparecer:
- `⚠️ Message ID não encontrado` → WAHA não está enviando o ID
- `❌ [MEDIA_BRIDGE] Falha download WAHA HTTP 404` → Endpoint incorreto
- `⚠️ WAHA não configurado` → Falta configurar URL ou API Key

---

## 🔍 Opção 2: Supabase CLI (local)

Se estiver rodando localmente com `supabase start`:

```bash
# Terminal 1 - Subir função local
supabase functions serve waha-webhook --env-file .env.local

# Terminal 2 - Ver logs em tempo real
supabase functions logs waha-webhook --tail
```

---

## 🔍 Opção 3: Logs em tempo real (produção)

```bash
# Fazer login
supabase login

# Vincular ao projeto
supabase link --project-ref SEU_PROJECT_REF

# Ver logs em tempo real
supabase functions logs waha-webhook --tail
```

---

## 🧪 Teste rápido: Enviar payload manualmente

Execute este SQL para simular uma mensagem com mídia:

```sql
-- Inserir um log de teste para ver se a função está recebendo
INSERT INTO chatbot_actions (tenant_id, action_type, metadata)
VALUES (
  (SELECT id FROM tenants LIMIT 1),
  'test_webhook',
  jsonb_build_object('test', 'media_detection')
);
```

Depois envie uma **foto no WhatsApp** e veja os logs aparecerem.

---

## 🔧 WAHA PLUS: Diferenças importantes

### Endpoints WAHA PLUS vs WAHA padrão:

**WAHA Padrão:**
```
GET /api/{session}/messages/{messageId}/download
```

**WAHA PLUS (pode ser diferente):**
```
GET /api/messages/{messageId}/media
GET /api/{session}/media/{messageId}
GET /api/downloadMedia/{session}/{messageId}
```

### Como verificar qual endpoint usar:

1. Abra a documentação da sua instância WAHA PLUS:
   ```
   http://SEU_WAHA_URL/docs
   ```

2. Procure por endpoints relacionados a:
   - `download`
   - `media`
   - `messages`

3. Veja qual formato de URL é usado

### Se WAHA PLUS usar endpoint diferente:

Você precisará atualizar a função `downloadAndUploadMedia` na linha ~25 do arquivo:
```typescript
const downloadUrl = `${wahaUrl}/api/${sessionName}/messages/${messageId}/download`;
```

Para:
```typescript
const downloadUrl = `${wahaUrl}/api/messages/${messageId}/media`; // ou outro endpoint
```

---

## 🚨 Problemas comuns e soluções

### 1. "Message ID não encontrado"
**Causa**: WAHA PLUS envia o payload em formato diferente

**Solução**: Envie uma mensagem e copie os logs que mostram o payload completo:
```
🔍 Payload completo para debug: {...}
```

Me envie esse JSON e eu ajusto o código.

---

### 2. "HTTP 404" no download
**Causa**: Endpoint do WAHA PLUS é diferente

**Solução**: Teste manualmente o endpoint:
```bash
curl -X GET "http://SEU_WAHA_URL/api/default/messages/MESSAGE_ID/download" \
  -H "X-Api-Key: SUA_API_KEY"
```

Se der 404, teste variações:
- `/api/messages/MESSAGE_ID/media`
- `/api/default/media/MESSAGE_ID`
- `/api/downloadMedia/default/MESSAGE_ID`

---

### 3. "Falha no download" mas endpoint funciona
**Causa**: Formato da resposta diferente

**Solução**: Verifique o que o WAHA PLUS retorna:
```bash
curl "http://SEU_WAHA_URL/api/default/messages/MESSAGE_ID/download" \
  -H "X-Api-Key: SUA_KEY" | jq
```

Esperado:
```json
{
  "mimetype": "image/jpeg",
  "data": "base64stringaqui..."
}
```

Se vier diferente, me avise o formato.

---

## 📋 Checklist de troubleshooting

- [ ] Verificar logs do Supabase Dashboard
- [ ] Confirmar que WAHA está enviando webhooks
- [ ] Verificar se `waha_api_url` e `waha_api_key` estão configurados
- [ ] Testar endpoint de download manualmente
- [ ] Ver payload completo nos logs quando enviar mídia
- [ ] Confirmar versão do WAHA (padrão ou PLUS)
- [ ] Verificar documentação do WAHA PLUS em `/docs`

---

## 🆘 Me envie estas informações:

1. **Logs da Edge Function** quando você envia uma foto
2. **Versão do WAHA**: Padrão ou PLUS?
3. **URL da documentação**: `http://SEU_WAHA/docs` (screenshot)
4. **Payload completo** que aparece nos logs (começando com `🔍 Payload completo`)

Com essas informações eu faço o ajuste exato!
