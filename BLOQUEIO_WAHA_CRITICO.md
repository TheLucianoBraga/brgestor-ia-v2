# ⛔ BLOQUEIO CRÍTICO - WAHA

## 🚨 NUNCA MUDE A VERSÃO DO WAHA SEM PERGUNTAR

### ✅ VERSÃO CORRETA:
```bash
devlikeapro/waha-plus:latest
```

### ❌ VERSÃO PROIBIDA (quebra tudo):
```bash
devlikeapro/waha  # ← NÃO USAR! Versão gratuita suporta apenas 1 sessão
```

---

## 🔧 Container Docker CORRETO:

```bash
docker run -d \
  --name waha \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /root/waha/.sessions:/app/.sessions \
  -e WAHA_API_KEY=BragaDIGITal_OBrabo_1996_2025Br \
  devlikeapro/waha-plus:latest  # ← SEMPRE USAR ESTA VERSÃO
```

---

## ⚠️ POR QUE NÃO MUDAR:

1. **WAHA PLUS** = Multi-sessões (permite múltiplas contas WhatsApp)
2. **WAHA** (gratuito) = Apenas 1 sessão chamada "default"
3. Sistema atual usa múltiplas sessões: `tenant_a0000000`, `cliente_bf783daf-...`, etc
4. Trocar para versão gratuita QUEBRA TODO O SISTEMA

---

## 🔄 Como restaurar se quebrar:

```bash
ssh root@72.60.14.172 "docker rm -f waha; docker run -d --name waha --restart unless-stopped -p 3000:3000 -v /root/waha/.sessions:/app/.sessions -e WAHA_API_KEY=BragaDIGITal_OBrabo_1996_2025Br devlikeapro/waha-plus:latest"
```

---

## 📋 Checklist antes de mudar QUALQUER coisa no WAHA:

- [ ] É realmente necessário mudar?
- [ ] Estou usando `waha-plus`?
- [ ] Avisei o usuário ANTES de executar?
- [ ] Fiz backup das sessões (`/root/waha/.sessions`)?
- [ ] Tenho certeza que não vai quebrar?

**SE TIVER DÚVIDA: PERGUNTE ANTES!**
