# 📋 CHECKLIST: IA WhatsApp - Projetado vs Implementado

**Data**: 11/01/2026  
**Função Atual**: `waha-webhook-v3`  
**Status Geral**: ⚠️ **FUNCIONAL BÁSICO** - Faltam recursos avançados

---

## ✅ IMPLEMENTADO E FUNCIONANDO

### 1. Funcionalidades Básicas
- [x] Recebe mensagens via webhook WAHA
- [x] Ignora mensagens próprias (fromMe)
- [x] Identifica tenant automaticamente
- [x] Chama Gemini AI para respostas
- [x] Envia respostas via WAHA
- [x] Tratamento de erros básico

### 2. Contexto de IA
- [x] System Prompt personalizado (ai_system_prompt)
- [x] Nome da empresa (ai_company_name)
- [x] Descrição da empresa (ai_company_description)
- [x] Produtos/Serviços (ai_products_services)
- [x] Tom de voz (ai_tone)
- [x] Instruções adicionais (ai_instructions)

### 3. Configurações no Banco
- [x] ai_executive_mode (inserido mas NÃO usado)
- [x] ai_proactive_suggestions (inserido mas NÃO usado)
- [x] ai_background_analysis (inserido mas NÃO usado)
- [x] ai_learning_enabled (inserido mas NÃO usado)

---

## ❌ NÃO IMPLEMENTADO (Projetado mas Faltando)

### 1. Memória e Contexto de Conversa
- [ ] **Tabela chat_memory** - Armazenar histórico de conversas
- [ ] **Identificação de cliente** - Buscar dados do customer via WhatsApp
- [ ] **Histórico de mensagens** - Manter contexto da conversa
- [ ] **Resumo de conversa** - conversation_summary
- [ ] **Interesses detectados** - interests array
- [ ] **Última intenção** - last_intent tracking
- [ ] **Contador de mensagens** - messages_count

### 2. Dados Contextuais do Cliente
- [ ] **Serviços ativos** - customer_items do cliente
- [ ] **Cobranças pendentes** - customer_charges
- [ ] **Histórico de pagamentos** - payment history
- [ ] **Informações pessoais** - CPF, data nascimento, endereço
- [ ] **Nível de acesso** - is_owner, is_reseller, is_customer

### 3. Base de Conhecimento
- [ ] **Knowledge Base** - chatbot_knowledge_base table
- [ ] **FAQs personalizadas** - Perguntas e respostas do tenant
- [ ] **Serviços disponíveis** - Lista de products/services
- [ ] **Planos de preços** - Plans table context
- [ ] **Gatilhos automáticos** - Auto-responder triggers

### 4. Detecção de Intenção
- [ ] **Intent Recognition** - Classificar intenção da mensagem
- [ ] **Respostas diretas** - Respostas sem chamar IA (rápidas)
  - [ ] Saudação (greeting)
  - [ ] Agradecimento (thanks)
  - [ ] Pagamento (payment)
  - [ ] Consulta de serviço (service_inquiry)
  - [ ] Preços (pricing)
  - [ ] Horário (business_hours)

### 5. Ações Executáveis (CRITICAL!)
A IA atualmente **NÃO EXECUTA NENHUMA AÇÃO**, apenas responde texto.

#### Ações de Cliente:
- [ ] **[ACTION:generate_pix]** - Gerar PIX para pagamento
- [ ] **[ACTION:show_services]** - Listar serviços ativos
- [ ] **[ACTION:show_charges]** - Listar cobranças pendentes
- [ ] **[ACTION:show_plans]** - Exibir planos disponíveis
- [ ] **[ACTION:create_ticket]** - Criar ticket de suporte
- [ ] **[ACTION:transfer_human]** - Transferir para atendente

#### Ações de Revenda/Admin:
- [ ] **[ACTION:create_customer]** - Cadastrar novo cliente
- [ ] **[ACTION:create_charge]** - Criar cobrança
- [ ] **[ACTION:list_customers]** - Listar clientes
- [ ] **[ACTION:list_pending_charges]** - Cobranças vencidas
- [ ] **[ACTION:send_charge]** - Enviar cobrança específica

#### Ações de Master:
- [ ] **[ACTION:create_expense]** - Cadastrar despesa
- [ ] **[ACTION:list_expenses]** - Listar despesas
- [ ] **[ACTION:show_metrics]** - Dashboard de métricas

### 6. Sugestões Proativas
- [ ] **Quick Replies** - Botões de sugestão após cada resposta
- [ ] **Análise contextual** - Gerar 3-5 sugestões relevantes
- [ ] **Sugestões baseadas em histórico** - Usar padrões aprendidos

### 7. Análise em Background
- [ ] **Varredura de cobranças** - Detectar cobranças não enviadas
- [ ] **Alertas de vencimento** - Notificar vencimentos próximos (7 dias)
- [ ] **Detecção de anomalias** - Valores fora do padrão
- [ ] **Oportunidades de upsell** - Sugerir upgrades de plano

### 8. Sistema de Aprendizado
- [ ] **Tabela expense_ai_learning** - Armazenar padrões
- [ ] **Categorização automática** - Sugerir categorias
- [ ] **Mapeamento fornecedor** - Lembrar fornecedor → categoria
- [ ] **Horários preferenciais** - Aprender quando usar sistema
- [ ] **Canais preferidos** - WhatsApp, Email, etc

### 9. Modo Executivo
- [ ] **Auto-execução** - Executar ações sem confirmação
- [ ] **Lista branca de ações** - Ações não-críticas executáveis
- [ ] **Redução de confirmações** - Menos perguntas, mais ação

### 10. Processamento de Mídia
- [ ] **Detectar áudio** - Transcrever voz
- [ ] **Detectar imagem** - OCR de contas/documentos
- [ ] **Extrair dados** - Gerar despesa de foto de nota fiscal
- [ ] **Detectar documento** - PDF, comprovantes

### 11. Links de Cadastro Dinâmicos
- [ ] **signup_links table** - Gerar links personalizados
- [ ] **Link de cliente** - Cadastro via WhatsApp
- [ ] **Link de revenda** - Onboarding de revendas
- [ ] **Tracking** - Contar conversões por link

### 12. Personalização de Persona
- [ ] **Estilos de persona** - comercial, tecnico, casual, executivo
- [ ] **Instruções especiais** - persona_instructions
- [ ] **Tom de voz dinâmico** - Adaptar baseado no cliente

### 13. Métricas e Analytics
- [ ] **Taxa de resposta** - % de mensagens respondidas
- [ ] **Tempo médio de resposta** - Latência
- [ ] **Taxa de conversão** - Ações executadas vs sugeridas
- [ ] **Satisfação** - NPS via WhatsApp
- [ ] **Uso de sugestões** - Click-through rate

### 14. Horário Comercial
- [ ] **Verificar horário** - business_hours
- [ ] **Mensagem fora do expediente** - Auto-responder
- [ ] **Fila de mensagens** - Responder quando abrir

---

## 🔥 RECURSOS CRÍTICOS FALTANDO

### **1. MEMÓRIA DE CONVERSA** (PRIORIDADE MÁXIMA!)
**Impacto**: Sem isso, cada mensagem é tratada como nova conversa.  
**Problema**: IA não lembra do que foi dito antes.

**O que precisa:**
```typescript
interface ChatMemory {
  id: string;
  tenant_id: string;
  phone: string;
  contact_name: string | null;
  is_customer: boolean;
  customer_id: string | null;
  is_owner: boolean;
  is_reseller: boolean;
  conversation_summary: string | null;
  interests: string[] | null;
  last_intent: string | null;
  messages_count: number;
  first_contact_at: string;
  last_contact_at: string;
  metadata: Record<string, any>;
}
```

### **2. EXECUÇÃO DE AÇÕES** (PRIORIDADE MÁXIMA!)
**Impacto**: IA só conversa, não faz nada útil.  
**Problema**: Cliente pede PIX/cobrança e IA só responde texto.

**O que precisa:**
- Parser de `[ACTION:tipo:dados]` na resposta da IA
- Executar ações via Supabase (insert/update/select)
- Retornar resultado da ação na conversa

### **3. BUSCA DE DADOS DO CLIENTE** (ALTA PRIORIDADE!)
**Impacto**: IA não sabe com quem está falando.  
**Problema**: Não pode listar serviços, cobranças, etc.

**O que precisa:**
```typescript
// Buscar customer pelo WhatsApp
const { data: customer } = await supabase
  .from('customers')
  .select('*, customer_items(*), customer_charges(*)')
  .eq('whatsapp', cleanPhone)
  .single();
```

### **4. BASE DE CONHECIMENTO** (MÉDIA PRIORIDADE)
**Impacto**: IA inventa respostas genéricas.  
**Problema**: Não sabe sobre serviços/planos específicos do tenant.

**O que precisa:**
```typescript
const { data: services } = await supabase
  .from('services')
  .select('name, price, description')
  .eq('seller_tenant_id', tenantId)
  .eq('active', true);
```

---

## 📊 NÍVEL DE COMPLETUDE

| Categoria | Projetado | Implementado | % Completo |
|-----------|-----------|--------------|------------|
| **Resposta Básica** | ✅ | ✅ | 100% |
| **Contexto de IA** | ✅ | ✅ | 100% |
| **Memória de Conversa** | ✅ | ❌ | 0% |
| **Dados do Cliente** | ✅ | ❌ | 0% |
| **Base de Conhecimento** | ✅ | ❌ | 0% |
| **Detecção de Intenção** | ✅ | ❌ | 0% |
| **Execução de Ações** | ✅ | ❌ | 0% |
| **Sugestões Proativas** | ✅ | ❌ | 0% |
| **Análise Background** | ✅ | ❌ | 0% |
| **Sistema de Aprendizado** | ✅ | ❌ | 0% |
| **Modo Executivo** | ✅ | ❌ | 0% |
| **Processamento Mídia** | ✅ | ❌ | 0% |

**TOTAL GERAL**: ~17% de completude

---

## 🎯 PRÓXIMOS PASSOS (ORDEM DE PRIORIDADE)

### **FASE 1: TORNAR ÚTIL** (1-2 dias)
1. ✅ Implementar **memória de conversa** (chat_memory table)
2. ✅ Buscar **dados do cliente** pelo WhatsApp
3. ✅ Adicionar **histórico de mensagens** no prompt
4. ✅ Implementar **parser de [ACTION]** na resposta
5. ✅ Executar **ações básicas** (gerar PIX, listar serviços)

### **FASE 2: INTELIGÊNCIA** (2-3 dias)
6. ✅ Implementar **detecção de intenção**
7. ✅ Adicionar **base de conhecimento** (services, plans, FAQ)
8. ✅ Criar **respostas diretas** para intenções comuns
9. ✅ Implementar **gatilhos automáticos**
10. ✅ Adicionar **links de cadastro dinâmicos**

### **FASE 3: PROATIVIDADE** (3-5 dias)
11. ✅ Implementar **sugestões proativas** (quick replies)
12. ✅ Adicionar **análise em background** (cobranças pendentes)
13. ✅ Implementar **modo executivo** (auto-execução)
14. ✅ Criar **sistema de aprendizado** (patterns)

### **FASE 4: MÍDIA E AVANÇADO** (5+ dias)
15. ✅ Processar **áudio** (transcrição)
16. ✅ Processar **imagem** (OCR de notas fiscais)
17. ✅ Implementar **personalização de persona**
18. ✅ Adicionar **métricas e analytics**

---

## 🚨 RESUMO EXECUTIVO

**STATUS ATUAL**: A IA funciona como um chatbot básico com contexto da empresa, mas **NÃO EXECUTA AÇÕES** e **NÃO TEM MEMÓRIA**.

**PROBLEMA PRINCIPAL**: Cliente pergunta "qual meu serviço?" e a IA responde texto genérico em vez de listar os serviços reais dele.

**SOLUÇÃO**: Implementar FASE 1 (memória + ações) para tornar a IA realmente útil.

**ESTIMATIVA**: 1-2 dias para ter IA funcional com ações básicas.

---

**Gerado em**: 11/01/2026 20:10  
**Versão**: waha-webhook-v3 (190 linhas - MINIMAL)
