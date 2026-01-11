# 🧪 Guia de Teste - IA Avançada

## Como Testar as Novas Funcionalidades

### 1. Ativar o Sistema de IA

1. Acesse: **Configurações** → **Controle IA**
2. Ative todos os 4 switches:
   - ✅ Modo Executivo
   - ✅ Sugestões Proativas
   - ✅ Análise em Background
   - ✅ Sistema de Aprendizado
3. Confirme que aparece: **"🚀 IA Totalmente Ativa - Dominação 70%+"**

---

### 2. Testar Sugestões Proativas

**Cenário 1: Cliente**
```
1. Abra o chatbot
2. Digite: "quando vence minha fatura?"
3. Observe: Bot responde + mostra 3 botões de sugestão
4. Clique em uma sugestão
5. Veja: Texto auto-preenchido
```

**Esperado:**
- Bot mostra a data
- Aparece alerta amarelo se vencimento próximo
- Botões: [Pagar agora] [Ver serviços] [2ª via]

---

### 3. Testar Modo Executivo

**Cenário 2: Revenda**
```
1. Digite: "mostre meus clientes"
2. Observe: Lista aparece IMEDIATAMENTE (sem confirmação)
```

**Esperado:**
- Sem mensagem "Deseja confirmar?"
- Dados aparecem diretamente
- Mais rápido que antes

---

### 4. Testar Análise em Background

**Cenário 3: Cobranças Pendentes**
```
1. Crie 2-3 cobranças pendentes no sistema
2. Abra o chatbot
3. Observe: Barra amarela no topo
```

**Esperado:**
- Alerta: "Você tem X cobrança(s) pendente(s)"
- Sugestão: "Quer que eu envie lembretes?"

---

### 5. Testar Aprendizado de IA

**Cenário 4: Categorização**
```
Dia 1:
1. Crie despesa: "Conta de luz" → Categoria "Utilidades"
2. Crie despesa: "Energia elétrica" → Categoria "Utilidades"

Dia 2:
3. Via chatbot, diga: "cadastre despesa de luz"
4. Observe: IA sugere categoria "Utilidades" automaticamente
```

**Esperado:**
- IA aprende que "luz" = "Utilidades"
- Sugestão aparece nas próximas vezes

---

### 6. Testar Detecção de Anomalias

**Cenário 5: Valor Atípico**
```
1. Cadastre 5 despesas de ~R$ 100,00 na mesma categoria
2. Tente cadastrar despesa de R$ 5.000,00
3. Observe: Alerta de anomalia
```

**Esperado:**
- Alerta: "⚠️ Valor acima da média detectado"
- Sugestão para revisar

---

### 7. Verificar Logs de Aprendizado

**SQL para consultar padrões aprendidos:**
```sql
SELECT 
  pattern_type,
  pattern_key,
  pattern_value,
  confidence,
  occurrences
FROM expense_ai_learning
WHERE tenant_id = 'SEU_TENANT_ID'
ORDER BY confidence DESC;
```

**Esperado:**
- Linhas com `pattern_type = 'category_mapping'`
- `confidence` aumentando a cada uso
- `occurrences` > 1 para padrões repetidos

---

### 8. Testar Conversas Completas

**Cenário 6: Fluxo Cliente Completo**
```
👤: Oi
🤖: [Mensagem de boas-vindas + alertas]

👤: quando vence?
🤖: Dia 15/01 (em 5 dias)
     💡 [Pagar agora] [Ver serviços]

[Clica em "Pagar agora"]
🤖: [Exibe dados da fatura]
     💡 [Gerar PIX] [Boleto]

[Clica em "Gerar PIX"]
🤖: ✅ PIX gerado! Copie o código...
```

**Esperado:**
- Bot guia 70%+ da conversa
- Usuário só precisa clicar
- Mínimo de digitação

---

### 9. Testar Histórico de Conversas

```
1. Converse com o bot
2. Feche o chat
3. Reabra
4. Clique no ícone de histórico
5. Veja: Conversas anteriores listadas
6. Clique para carregar
```

**Esperado:**
- Últimas 10 conversas salvas
- Preview da primeira mensagem
- Carrega tudo ao clicar

---

### 10. Verificar Performance

**Métricas para Monitorar:**

1. **Taxa de Sugestões Usadas**
   - Objetivo: > 60%
   - Como: Contar cliques em sugestões vs total

2. **Ações Auto-Executadas**
   - Objetivo: > 50% das ações
   - Como: Verificar quantas não pedem confirmação

3. **Alertas Proativos**
   - Objetivo: Aparecer em > 40% conversas
   - Como: Barra amarela deve aparecer frequentemente

4. **Tempo de Resposta**
   - Objetivo: < 3 segundos
   - Como: Cronometrar desde envio até resposta

---

## ✅ Checklist de Validação

Marque quando testar:

- [ ] Modo Executivo ativado e funcionando
- [ ] Sugestões aparecem em cada mensagem do bot
- [ ] Alertas proativos aparecem automaticamente
- [ ] Aprendizado salvando padrões no banco
- [ ] Anomalias sendo detectadas
- [ ] Histórico de conversas funcionando
- [ ] Painel de Controle IA acessível
- [ ] Todas as 4 configurações presentes
- [ ] Badge "70%+ ativo" aparecendo
- [ ] Performance < 3s por resposta

---

## 🐛 Problemas Comuns e Soluções

### Sugestões não aparecem
**Solução:** Verifique se `ai_proactive_suggestions = 'true'` em tenant_settings

### Modo executivo não funciona
**Solução:** Verifique se `ai_executive_mode = 'true'` em tenant_settings

### Aprendizado não salva
**Solução:** Execute a migration `20260110000000_ai_learning_settings.sql`

### Alertas não aparecem
**Solução:** Verifique se `ai_background_analysis = 'true'`

---

## 📊 Métricas de Sucesso

**IA em 70%+ significa:**

✅ Para cada 10 interações:
- 7+ são iniciadas/guiadas pelo bot
- 3 ou menos são perguntas do usuário

✅ Estrutura típica:
```
🤖 Bot: [Resposta + 3 sugestões + 1 alerta] ← 70%
👤 Usuário: [Clica ou digita algo curto] ← 30%
```

---

## 🎯 Objetivo Final

**Conversa Ideal:**
- Bot: 5-7 mensagens (respostas + sugestões + alertas)
- Usuário: 3 mensagens (perguntas + confirmações)
- **Ratio:** 2:1 em favor do bot = **67% de dominação** ✅

Quando adicionar ações automáticas e mais contexto, chega em **70-80%**! 🚀

---

**Pronto para testar!** 🧪
