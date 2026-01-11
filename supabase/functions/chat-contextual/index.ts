import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Conversão eficiente para Base64
const toBase64 = (arr: Uint8Array) => {
  const binString = Array.from(arr, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binString);
};

// Processar mídia do Supabase Storage
async function processMedia(supabase: any, fileUrl: string, fileType: string) {
  try {
    const storageMatch = fileUrl.match(/\/storage\/v1\/object\/(?:public|authenticated)\/([^\/]+)\/(.+)/);
    if (!storageMatch) return null;

    const [_, bucket, path] = storageMatch;
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) throw error;

    const arrayBuffer = await data.arrayBuffer();
    const base64 = toBase64(new Uint8Array(arrayBuffer));
    
    return {
      inline_data: {
        mime_type: data.type || (fileType === 'audio' ? 'audio/ogg' : 'image/jpeg'),
        data: base64
      }
    };
  } catch (e) {
    return null;
  }
}

type TenantType = 'master' | 'adm' | 'revenda' | 'cliente';

interface ContextData {
  type: TenantType;
  userName: string;
  tenantName: string;
  stats: Record<string, any>;
  expenses?: {
    pendingExpenses: any[];
    overdueExpenses: any[];
    categories: any[];
    monthSummary: { total: number; paid: number; pending: number };
    today: string;
  };
}

interface MenuOption {
  id: string;
  label: string;
  action: string;
}

interface ChatAction {
  type: string;
  payload: Record<string, any>;
}

interface AIResponse {
  message: string;
  action?: ChatAction;
  suggestions?: string[];
}

// Menu options by tenant type
function getMenuOptionsForType(type: TenantType): MenuOption[] {
  switch (type) {
    case 'master':
      return [
        { id: 'metrics', label: '📊 Métricas do sistema', action: 'show_system_metrics' },
        { id: 'adms', label: '🏢 Gerenciar ADMs', action: 'navigate_organizations' },
        { id: 'billing', label: '💰 Faturamento geral', action: 'show_master_billing' },
        { id: 'config', label: '⚙️ Configurações', action: 'navigate_config' },
        { id: 'bug', label: '🐛 Reportar bug', action: 'create_internal_ticket' }
      ];
    case 'adm':
      return [
        { id: 'dashboard', label: '📊 Meu dashboard', action: 'show_adm_dashboard' },
        { id: 'revendas', label: '👥 Minhas revendas', action: 'list_revendas' },
        { id: 'billing', label: '💰 Meu faturamento', action: 'show_adm_billing' },
        { id: 'create_revenda', label: '📝 Criar revenda', action: 'create_revenda' },
        { id: 'tickets', label: '🎫 Meus tickets', action: 'list_tickets' },
        { id: 'subscription', label: '💳 Minha assinatura', action: 'show_subscription' }
      ];
    case 'revenda':
      return [
        { id: 'dashboard', label: '📊 Meu dashboard', action: 'show_revenda_dashboard' },
        { id: 'customers', label: '👤 Meus clientes', action: 'list_customers' },
        { id: 'pending', label: '💰 Cobranças pendentes', action: 'list_pending_charges' },
        { id: 'send_charge', label: '📱 Enviar cobrança', action: 'send_charge' },
        { id: 'new_customer', label: '➕ Novo cliente', action: 'create_customer' },
        { id: 'ticket', label: '🎫 Abrir ticket', action: 'create_ticket' }
      ];
    case 'cliente':
      return [
        { id: 'services', label: '📋 Meus serviços', action: 'show_services' },
        { id: 'payment', label: '💳 2ª via boleto', action: 'generate_payment' },
        { id: 'due_date', label: '📅 Próximo vencimento', action: 'show_due_date' },
        { id: 'upgrade', label: '⬆️ Fazer upgrade', action: 'show_plans' },
        { id: 'referral', label: '🎁 Indicar amigo', action: 'show_referral' },
        { id: 'profile', label: '👤 Meus dados', action: 'navigate_profile' },
        { id: 'help', label: '🆘 Preciso de ajuda', action: 'request_help' }
      ];
    default:
      return [];
  }
}

// Get expense context for the tenant
async function getExpenseContext(supabase: any, tenantId: string) {
  const today = new Date().toISOString().split('T')[0];
  
  // Get pending expenses
  const { data: pendingExpenses } = await supabase
    .from('expenses')
    .select('id, description, amount, due_date, status, category:expense_categories(name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .order('due_date')
    .limit(5);

  // Get overdue expenses
  const { data: overdueExpenses } = await supabase
    .from('expenses')
    .select('id, description, amount, due_date, status, category:expense_categories(name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'overdue')
    .limit(5);

  // Get categories
  const { data: categories } = await supabase
    .from('expense_categories')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  // Get monthly summary
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const { data: monthExpenses } = await supabase
    .from('expenses')
    .select('amount, status')
    .eq('tenant_id', tenantId)
    .gte('due_date', startOfMonth.toISOString().split('T')[0]);

  const monthTotal = monthExpenses?.reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
  const monthPaid = monthExpenses?.filter((e: any) => e.status === 'paid').reduce((sum: number, e: any) => sum + e.amount, 0) || 0;

  return {
    pendingExpenses: pendingExpenses || [],
    overdueExpenses: overdueExpenses || [],
    categories: categories || [],
    monthSummary: { total: monthTotal, paid: monthPaid, pending: monthTotal - monthPaid },
    today
  };
}

// Fetch context based on tenant type
async function fetchContextForType(
  supabase: any, 
  type: TenantType, 
  tenantId: string, 
  userId: string | null,
  customerId: string | null
): Promise<ContextData> {
  let stats: Record<string, any> = {};
  let userName = '';
  let tenantName = '';

  // Get tenant info
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .single();
  tenantName = tenant?.name || '';

  // Get user name from profile
  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single();
    userName = profile?.full_name || '';
  }

  switch (type) {
    case 'master': {
      // Get total child tenants (revendas and adms) - check for both types
      const { count: admCount } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('parent_tenant_id', tenantId)
        .in('type', ['adm', 'revenda'])
        .in('status', ['active', 'trial']);

      // Get total revenue this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'paid')
        .gte('paid_at', startOfMonth.toISOString());

      const totalRevenue = payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

      // Get defaulting tenants (overdue payments)
      const { count: defaultingTenants } = await supabase
        .from('payments')
        .select('buyer_tenant_id', { count: 'exact', head: true })
        .eq('status', 'overdue');

      stats = {
        totalAdms: admCount || 0,
        revenueThisMonth: totalRevenue,
        defaultingAdms: defaultingTenants || 0
      };
      break;
    }

    case 'adm': {
      // Get revendas count
      const { count: revendasCount } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('parent_tenant_id', tenantId)
        .eq('type', 'revenda')
        .eq('status', 'active');

      // Get total customers across revendas
      const { data: revendas } = await supabase
        .from('tenants')
        .select('id')
        .eq('parent_tenant_id', tenantId)
        .eq('type', 'revenda');

      let totalCustomers = 0;
      let overdueCustomers = 0;

      if (revendas && revendas.length > 0) {
        const revendaIds = revendas.map((r: any) => r.id);
        
        const { count } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .in('tenant_id', revendaIds);
        totalCustomers = count || 0;

        // Get overdue charges
        const { count: overdueCount } = await supabase
          .from('charges')
          .select('*', { count: 'exact', head: true })
          .in('tenant_id', revendaIds)
          .eq('status', 'overdue');
        overdueCustomers = overdueCount || 0;
      }

      // Revenue this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { data: admpayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('seller_tenant_id', tenantId)
        .eq('status', 'paid')
        .gte('paid_at', startOfMonth.toISOString());

      const revenue = admpayments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

      stats = {
        totalRevendas: revendasCount || 0,
        totalCustomers,
        overdueCharges: overdueCustomers,
        revenueThisMonth: revenue
      };
      break;
    }

    case 'revenda': {
      // Get customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      // Get customers for this revenda
      const { data: revendaCustomers } = await supabase
        .from('customers')
        .select('id')
        .eq('tenant_id', tenantId);

      let overdueCharges = 0;
      let pendingAmount = 0;
      let revenueThisMonth = 0;
      let paidThisMonth = 0;
      let servicesCount = 0;

      if (revendaCustomers && revendaCustomers.length > 0) {
        const customerIds = revendaCustomers.map((c: any) => c.id);
        
        // Calculate revenue from customer_items (active services)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { data: customerItems } = await supabase
          .from('customer_items')
          .select('id, price, status, created_at')
          .in('customer_id', customerIds)
          .eq('status', 'active');

        // All active services = revenue
        revenueThisMonth = customerItems?.reduce((sum: number, item: any) => sum + (item.price || 0), 0) || 0;
        servicesCount = customerItems?.length || 0;

        // Services created this month = new subscriptions
        const thisMonthItems = customerItems?.filter((item: any) => 
          new Date(item.created_at) >= startOfMonth
        ) || [];
        paidThisMonth = thisMonthItems.reduce((sum: number, item: any) => sum + (item.price || 0), 0);

        // Get customer_charges (pending charges)
        const { data: customerCharges } = await supabase
          .from('customer_charges')
          .select('id, amount, status')
          .in('customer_id', customerIds)
          .in('status', ['pending', 'overdue']);

        overdueCharges = customerCharges?.filter((c: any) => c.status === 'overdue').length || 0;
        pendingAmount = customerCharges?.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0;
      }

      // Also check old clients table for legacy charges
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('tenant_id', tenantId);

      if (clients && clients.length > 0) {
        const clientIds = clients.map((c: any) => c.id);
        
        const { data: charges } = await supabase
          .from('charges')
          .select('amount, status, paid_at')
          .in('client_id', clientIds);

        // Add legacy charges to counts
        const legacyOverdue = charges?.filter((c: any) => c.status === 'overdue').length || 0;
        overdueCharges += legacyOverdue;
        
        const legacyPending = charges?.filter((c: any) => c.status === 'pending' || c.status === 'overdue')
          .reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0;
        pendingAmount += legacyPending;

        // Add paid charges from this month to revenue
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const paidCharges = charges?.filter((c: any) => 
          c.status === 'paid' && c.paid_at && new Date(c.paid_at) >= startOfMonth
        ) || [];
        paidThisMonth += paidCharges.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
      }

      // Get today's due charges
      const today = new Date().toISOString().split('T')[0];
      const { count: dueToday } = await supabase
        .from('charges')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('due_date', today)
        .eq('status', 'pending');

      stats = {
        totalCustomers: customersCount || 0,
        servicesCount,
        revenueThisMonth,
        paidThisMonth,
        overdueCharges,
        pendingAmount,
        dueToday: dueToday || 0
      };
      break;
    }

    case 'cliente': {
      if (customerId) {
        // Get customer name
        const { data: customer } = await supabase
          .from('customers')
          .select('full_name')
          .eq('id', customerId)
          .single();
        userName = customer?.full_name || userName;

        // Get active services
        const { data: services } = await supabase
          .from('customer_items')
          .select('id, product_name, due_date, expires_at, price, status')
          .eq('customer_id', customerId)
          .eq('status', 'active');

        // Get next due date
        let nextDueDate = null;
        let nextDueAmount = 0;
        let planName = '';
        
        if (services && services.length > 0) {
          const sorted = services.sort((a: any, b: any) => {
            const dateA = new Date(a.due_date || a.expires_at || '9999-12-31');
            const dateB = new Date(b.due_date || b.expires_at || '9999-12-31');
            return dateA.getTime() - dateB.getTime();
          });
          nextDueDate = sorted[0]?.due_date || sorted[0]?.expires_at;
          nextDueAmount = sorted[0]?.price || 0;
          planName = sorted[0]?.product_name || '';
        }

        // Get pending charges via email
        const { data: customerData } = await supabase
          .from('customers')
          .select('email, tenant_id')
          .eq('id', customerId)
          .single();

        let pendingCharges = 0;
        let overdueAmount = 0;

        if (customerData?.email) {
          const { data: client } = await supabase
            .from('clients')
            .select('id')
            .eq('email', customerData.email)
            .eq('tenant_id', customerData.tenant_id)
            .maybeSingle();

          if (client) {
            const { data: charges } = await supabase
              .from('charges')
              .select('amount, status')
              .eq('client_id', client.id)
              .in('status', ['pending', 'overdue']);

            pendingCharges = charges?.length || 0;
            overdueAmount = charges?.filter((c: any) => c.status === 'overdue')
              .reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0;
          }
        }

        // Get referral balance
        const { data: referralLinks } = await supabase
          .from('referral_links')
          .select('total_earned, total_referrals')
          .eq('tenant_id', customerId);

        const referralBalance = referralLinks?.reduce((sum: number, r: any) => sum + (r.total_earned || 0), 0) || 0;
        const totalReferrals = referralLinks?.reduce((sum: number, r: any) => sum + (r.total_referrals || 0), 0) || 0;

        // Calculate days until due
        let daysUntilDue = null;
        if (nextDueDate) {
          const due = new Date(nextDueDate);
          const today = new Date();
          daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        stats = {
          servicesCount: services?.length || 0,
          planName,
          nextDueDate,
          nextDueAmount,
          daysUntilDue,
          pendingCharges,
          overdueAmount,
          referralBalance,
          totalReferrals
        };
      }
      break;
    }
  }

  // Fetch expense context for non-cliente types
  let expenseContext = null;
  if (type !== 'cliente') {
    expenseContext = await getExpenseContext(supabase, tenantId);
    // Add expense summary to stats
    stats.expensesOverdue = expenseContext.overdueExpenses?.length || 0;
    stats.expensesPending = expenseContext.pendingExpenses?.length || 0;
    stats.expensesMonthTotal = expenseContext.monthSummary?.total || 0;
    stats.expensesMonthPaid = expenseContext.monthSummary?.paid || 0;
  }

  return {
    type,
    userName,
    tenantName,
    stats,
    expenses: expenseContext || undefined
  };
}

// Generate personalized welcome message
function generateWelcomeMessage(context: ContextData): string {
  const firstName = context.userName.split(' ')[0] || 'você';
  
  switch (context.type) {
    case 'master': {
      const { totalAdms, revenueThisMonth, defaultingAdms } = context.stats;
      return `Olá! 👋 Sistema operando normalmente. ${totalAdms} ADMs ativos, R$ ${revenueThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} faturado este mês.${defaultingAdms > 0 ? ` ⚠️ ${defaultingAdms} ADM(s) inadimplente(s).` : ''} Como posso ajudar?`;
    }
    
    case 'adm': {
      const { totalRevendas, overdueCharges, revenueThisMonth } = context.stats;
      let msg = `Olá, ${firstName}! 👋`;
      if (overdueCharges > 0) {
        msg += ` Você tem ${overdueCharges} cobrança(s) vencida(s).`;
      }
      msg += ` ${totalRevendas} revenda(s) ativa(s), R$ ${revenueThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} faturado este mês. Como posso ajudar?`;
      return msg;
    }
    
    case 'revenda': {
      const { totalCustomers, dueToday, overdueCharges, pendingAmount, revenueThisMonth, servicesCount } = context.stats;
      let msg = `Oi, ${firstName}! 👋`;
      if (dueToday > 0) {
        msg += ` ${dueToday} cobrança(s) vencem hoje. Quer que eu envie lembretes?`;
      } else if (overdueCharges > 0) {
        msg += ` Você tem ${overdueCharges} cobrança(s) vencida(s), totalizando R$ ${pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
      } else {
        msg += ` ${totalCustomers} cliente(s) ativo(s), ${servicesCount || 0} serviço(s) ativo(s).`;
      }
      if (revenueThisMonth > 0) {
        msg += ` Faturamento do mês: R$ ${revenueThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
      }
      msg += ` Como posso ajudar?`;
      return msg;
    }
    
    case 'cliente': {
      const { planName, daysUntilDue, pendingCharges, overdueAmount } = context.stats;
      let msg = `Olá, ${firstName}! 👋`;
      
      if (overdueAmount > 0) {
        msg += ` ⚠️ Você tem R$ ${overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em faturas vencidas.`;
      } else if (pendingCharges > 0) {
        msg += ` Você tem ${pendingCharges} fatura(s) pendente(s).`;
      } else if (daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue > 0) {
        msg += ` Seu plano ${planName} vence em ${daysUntilDue} dia(s). Tudo bem por aí?`;
      } else if (planName) {
        msg += ` Seu plano ${planName} está ativo.`;
      }
      msg += ` Como posso ajudar?`;
      return msg;
    }
    
    default:
      return `Olá! 👋 Como posso ajudar você hoje?`;
  }
}

// Build system prompt based on type
function buildSystemPrompt(context: ContextData, knowledgeBase: any[], webSearchEnabled: boolean = false): string {
  const menuOptions = getMenuOptionsForType(context.type);
  
  let prompt = `Você é o BRGestor, um assistente virtual de elite para um ERP de gestão e cobrança.
Sua missão é ser PROATIVO, RESOLUTIVO e tomar o controle da situação para ajudar o usuário.

DIRETRIZES DE COMPORTAMENTO:
1. PROATIVIDADE: Se detectar problemas (faturas vencidas, despesas atrasadas), não espere o usuário pedir. Mencione o problema e já ofereça a solução com a [ACTION] correspondente.
2. TOM DE VOZ: Profissional, confiante e extremamente prestativo. Use emojis com moderação.
3. RESOLUÇÃO: Sempre que possível, sugira uma ação executável. Não apenas informe, aja.
4. APRENDIZADO: Use os exemplos de boas respostas abaixo para guiar seu estilo.

=== TIPO DE USUÁRIO: ${context.type.toUpperCase()} ===
Nome: ${context.userName}
Organização: ${context.tenantName}

=== DADOS DO CONTEXTO (RAG) ===
${JSON.stringify(context.stats, null, 2)}

=== OPÇÕES DE MENU DISPONÍVEIS ===
${menuOptions.map(m => `- ${m.label} (action: ${m.action})`).join('\n')}

=== AÇÕES EXECUTÁVEIS (AGENTIC AI) ===
Sempre que identificar uma intenção ou necessidade, inclua no final da resposta:
[ACTION:tipo_da_acao:{"dados":"aqui"}]

`;

  // Add web search capability info for master users
  if (webSearchEnabled) {
    prompt += `
=== PESQUISA NA INTERNET HABILITADA ===
Você TEM acesso à internet através da ferramenta google_search.
Quando o usuário perguntar sobre notícias, preços, eventos atuais, informações em tempo real, você PODE e DEVE buscar na internet.
Para perguntas que necessitem de informações atualizadas, use a ferramenta de busca.
Se o usuário perguntar se você tem acesso à internet, diga que SIM.

REGRA CRÍTICA DE RESPOSTAS COM PESQUISA:
- SEMPRE entregue a resposta COMPLETA, nunca corte no meio
- Se houver múltiplas informações relevantes, liste TODAS de forma organizada
- Use formatação clara com quebras de linha e parágrafos
- Formate com **negrito** para destaques e listas quando apropriado
- Se a resposta for longa, organize em seções com títulos
- NUNCA termine uma resposta com "[cite" ou texto incompleto
- Complete TODA a informação antes de finalizar

`;
  }

  // Add expense context for non-cliente types
  const expensePrompt = context.type !== 'cliente' ? `
=== GESTÃO DE DESPESAS ===
Você TEM acesso ao módulo de despesas financeiras da organização.

AÇÕES DE DESPESAS:
- expense_list: Listar despesas [ACTION:expense_list:{"status":"pending"}]
- expense_create: Criar despesa [ACTION:expense_create:{"description":"...", "amount":100, "due_date":"2024-01-15", "supplier":"..."}]
- expense_mark_paid: Marcar como paga [ACTION:expense_mark_paid:{"id":"...", "description":"..."}] (REQUER CONFIRMAÇÃO)
- expense_postpone: Adiar vencimento [ACTION:expense_postpone:{"id":"...", "days":3}]
- expense_delete: Excluir despesa [ACTION:expense_delete:{"id":"..."}] (REQUER CONFIRMAÇÃO)
- expense_summary: Resumo financeiro de despesas [ACTION:expense_summary:{}]
- navigate_expenses: Ir para página de despesas [ACTION:navigate_expenses:{}]

Dados de despesas:
${JSON.stringify(context.stats, null, 2)}

Se o usuário perguntar sobre despesas pendentes, vencidas, custos, gastos, contas a pagar:
- SEMPRE consulte os dados acima
- Informe valores específicos quando disponíveis
- Sugira ações relevantes (marcar paga, adiar, etc)

Para ações críticas (marcar paga, excluir), SEMPRE peça confirmação antes de executar.

` : '';

  switch (context.type) {
    case 'master':
      prompt += expensePrompt + `
Ações para MASTER:
- show_system_metrics: Mostrar métricas gerais do sistema
- navigate_organizations: Redirecionar para gestão de ADMs
- show_master_billing: Mostrar relatório de faturamento
- navigate_config: Redirecionar para configurações
- create_internal_ticket: Criar ticket de bug/problema interno

Você pode ajudar com:
- Status geral do sistema
- Gestão de organizações (ADMs)
- Relatórios de faturamento
- Gestão de despesas e contas a pagar
- Configurações do sistema
- Suporte técnico interno
`;
      break;

    case 'adm':
      prompt += expensePrompt + `
Ações para ADM:
- show_adm_dashboard: Mostrar dashboard com métricas
- list_revendas: Listar revendas com status
- show_adm_billing: Mostrar faturamento e inadimplência
- create_revenda: Abrir modal de criação de revenda
- list_tickets: Listar tickets de suporte
- show_subscription: Mostrar status da assinatura

Você pode ajudar com:
- Gestão de revendas
- Relatórios de faturamento
- Gestão de despesas e contas a pagar
- Criação de novas revendas
- Suporte e tickets
- Status da assinatura
`;
      break;

    case 'revenda':
      prompt += expensePrompt + `
Ações para REVENDA:
- show_revenda_dashboard: Mostrar dashboard com métricas
- list_customers: Listar clientes com filtros
- list_pending_charges: Listar cobranças vencidas
- send_charge: Enviar cobrança para cliente [ACTION:send_charge:{"customer_id":"...", "amount":100}]
- create_customer: Abrir modal de cadastro [ACTION:create_customer:{"full_name":"...", "whatsapp":"..."}]
- create_ticket: Abrir ticket de suporte

REGRAS DE CONTROLE (REVENDA):
1. Se houver cobranças vencidas, liste-as e ofereça a ação [ACTION:send_charge] para a mais urgente.
2. Se o usuário mencionar um novo cliente, já prepare a ação [ACTION:create_customer] com os dados capturados.
3. Se o faturamento estiver baixo, sugira olhar o dashboard ou listar clientes inativos.
4. Tome a iniciativa de sugerir lembretes de cobrança proativamente.
`;
      break;

    case 'cliente':
      prompt += `
Ações para CLIENTE:
- show_services: Mostrar serviços ativos
- generate_payment: Gerar 2ª via / PIX
- show_due_date: Mostrar próximo vencimento
- show_plans: Mostrar planos para upgrade
- show_referral: Mostrar link e saldo de indicações
- navigate_profile: Ir para página de perfil
- request_help: Transferir para atendimento humano
- create_ticket: Criar ticket de suporte

Você pode ajudar com:
- Status dos serviços
- Pagamento de faturas
- Upgrade de plano
- Programa de indicações
- Atualização de dados
- Suporte técnico

REGRAS ESPECIAIS:
- Se cliente tem fatura vencida, mencione proativamente
- Se serviço expira em 7 dias, sugira renovação
- Para cancelamentos, entenda o motivo antes e ofereça soluções
- Detecte intenção de churn e ofereça retenção
`;
      break;
  }

  // Add knowledge base
  if (knowledgeBase && knowledgeBase.length > 0) {
    prompt += `\n=== BASE DE CONHECIMENTO ===\n`;
    knowledgeBase.forEach((kb: any) => {
      prompt += `P: ${kb.question}\nR: ${kb.answer}\n\n`;
    });
  }

  return prompt;
}

function parseAIResponse(responseText: string): AIResponse {
  const result: AIResponse = {
    message: responseText,
    suggestions: []
  };

  const actionMatch = responseText.match(/\[ACTION:(\w+):(\{.*\})\]/);
  if (actionMatch) {
    try {
      result.action = {
        type: actionMatch[1],
        payload: JSON.parse(actionMatch[2])
      };
      result.message = responseText.replace(actionMatch[0], '').trim();
    } catch (e) {
      console.error("Error parsing action:", e);
    }
  }

  return result;
}

interface AISettings {
  provider: 'openai' | 'gemini';
  model: string;
  maxTokens: number;
  openaiKey?: string;
  geminiKey?: string;
  webSearch?: boolean;
}

async function getAISettings(supabase: any, tenantId: string): Promise<AISettings> {
  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('key, value')
    .eq('tenant_id', tenantId)
    .in('key', ['ai_provider', 'ai_model', 'ai_max_tokens', 'openai_api_key', 'gemini_api_key', 'ai_web_search']);

  const settingsMap: Record<string, string> = {};
  (settings || []).forEach((s: { key: string; value: string }) => {
    settingsMap[s.key] = s.value;
  });

  // Use higher token limit for web searches to avoid truncation
  const baseMaxTokens = parseInt(settingsMap['ai_max_tokens'] || '800', 10);
  const webSearchEnabled = settingsMap['ai_web_search'] === 'true';
  // Increase max tokens significantly for web searches to ensure complete responses
  const adjustedMaxTokens = webSearchEnabled ? Math.max(baseMaxTokens, 4096) : baseMaxTokens;

  return {
    provider: (settingsMap['ai_provider'] as 'openai' | 'gemini') || 'gemini',
    model: settingsMap['ai_model'] || 'gemini-2.5-flash',
    maxTokens: adjustedMaxTokens,
    openaiKey: settingsMap['openai_api_key'],
    geminiKey: settingsMap['gemini_api_key'],
    webSearch: webSearchEnabled
  };
}

async function callOpenAI(messages: any[], apiKey: string, maxTokens: number): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI error:", response.status, errorText);
    if (response.status === 429) throw { status: 429, message: "Limite de requisições da OpenAI excedido." };
    if (response.status === 401) throw { status: 401, message: "Chave da API OpenAI inválida." };
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Normaliza model ID (remove prefixo "google/" se existir)
function normalizeGeminiModel(model: string | null | undefined): string {
  if (!model || typeof model !== 'string') return 'gemini-2.5-flash';
  
  if (model.includes('/')) {
    const parts = model.split('/');
    const lastPart = parts[parts.length - 1];
    if (lastPart.startsWith('gemini-')) return lastPart;
  }
  
  if (model.startsWith('gemini-')) return model;
  
  return 'gemini-2.5-flash';
}

async function callGemini(messages: any[], apiKey: string, model: string, maxTokens: number, webSearch: boolean = false): Promise<string> {
  const geminiModel = normalizeGeminiModel(model);
  console.log("Calling Gemini with model:", geminiModel, "webSearch:", webSearch);
  
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const systemMessage = messages.find(m => m.role === 'system');
  
  const requestBody: any = {
    contents,
    systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
    generationConfig: { maxOutputTokens: maxTokens },
  };

  // Add web search grounding if enabled
  if (webSearch) {
    requestBody.tools = [{ google_search: {} }];
  }

  let response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }
  );

  // If web search causes an error, retry without it
  if (!response.ok && webSearch) {
    const errorText = await response.text();
    console.warn("Gemini error with web search, retrying without:", response.status, errorText);
    
    delete requestBody.tools;
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini error:", response.status, errorText);
    if (response.status === 429) throw { status: 429, message: "Limite de requisições do Gemini excedido." };
    if (response.status === 401 || response.status === 400) throw { status: 401, message: "Chave da API Gemini inválida." };
    throw new Error(`Gemini error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callAI(supabase: any, tenantId: string, tenantType: TenantType, messages: any[]): Promise<string> {
  const aiSettings = await getAISettings(supabase, tenantId);
  
  // Web search is ONLY enabled for master users AND when ai_web_search setting is true
  const enableWebSearch = tenantType === 'master' && aiSettings.webSearch === true;
  
  console.log("AI Settings for chat-contextual:", {
    provider: aiSettings.provider,
    hasKey: aiSettings.provider === 'openai' ? !!aiSettings.openaiKey : !!aiSettings.geminiKey,
    webSearch: aiSettings.webSearch,
    tenantType,
    enableWebSearch
  });

  if (aiSettings.provider === 'openai') {
    if (!aiSettings.openaiKey) throw { status: 400, message: "Chave da API OpenAI não configurada." };
    return await callOpenAI(messages, aiSettings.openaiKey, aiSettings.maxTokens);
  } else {
    if (!aiSettings.geminiKey) throw { status: 400, message: "Chave da API Gemini não configurada." };
    return await callGemini(messages, aiSettings.geminiKey, aiSettings.model, aiSettings.maxTokens, enableWebSearch);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      message, 
      previousMessages, 
      tenantId, 
      tenantType,
      userId,
      customerId,
      sessionId,
      fileUrl,
      fileType,
      action: requestAction,
      category
    } = body;
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle special action to get portal content bypassing RLS
    if (requestAction === 'get_portal_content') {
      console.log("Fetching portal content for tenant:", tenantId);
      
      let allowedTenants: (string | null)[] = [null];
      if (tenantId) {
        allowedTenants.push(tenantId);
        
        // 1. Buscar o pai direto do tenant
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('parent_tenant_id, parent_id')
          .eq('id', tenantId)
          .maybeSingle();
        
        if (tenantData?.parent_tenant_id) allowedTenants.push(tenantData.parent_tenant_id);
        if (tenantData?.parent_id) allowedTenants.push(tenantData.parent_id);
        
        // 2. Buscar quem é o dono (revendedor) deste cliente
        const { data: customerData } = await supabase
          .from('customers')
          .select('tenant_id')
          .eq('customer_tenant_id', tenantId)
          .maybeSingle();
          
        if (customerData?.tenant_id) {
          allowedTenants.push(customerData.tenant_id);
          
          // 3. Buscar o pai do revendedor (ADM)
          const { data: parentTenant } = await supabase
            .from('tenants')
            .select('parent_tenant_id, parent_id')
            .eq('id', customerData.tenant_id)
            .maybeSingle();
            
          if (parentTenant?.parent_tenant_id) allowedTenants.push(parentTenant.parent_tenant_id);
          if (parentTenant?.parent_id) allowedTenants.push(parentTenant.parent_id);
        }
      }

      // Remover duplicatas e nulos - null não é válido para cláusula IN do Postgres
      const uniqueTenants = [...new Set(allowedTenants)].filter(t => t !== null) as string[];
      console.log("Allowed tenants for content:", uniqueTenants);

      if (uniqueTenants.length === 0) {
        console.log("No valid tenant IDs to query content");
        return new Response(JSON.stringify({ posts: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let query = supabase
        .from('content_posts')
        .select('*')
        .eq('is_active', true)
        .in('tenant_id', uniqueTenants)
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data: posts, error: postsError } = await query;
      if (postsError) {
        console.error("Error fetching posts:", postsError);
        throw postsError;
      }

      console.log(`Found ${posts?.length || 0} posts for the portal`);

      return new Response(JSON.stringify({ posts: posts || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!tenantId || !tenantType) {
      throw { status: 400, message: "Tenant ID e tipo são obrigatórios" };
    }

    console.log(`Processing contextual chat - Type: ${tenantType}, Tenant: ${tenantId}`);


    // Fetch context for this tenant type
    const context = await fetchContextForType(supabase, tenantType, tenantId, userId, customerId);

    // If action is 'init', return welcome message and menu
    if (requestAction === 'init') {
      const welcomeMessage = generateWelcomeMessage(context);
      const menuOptions = getMenuOptionsForType(tenantType);
      
      return new Response(
        JSON.stringify({
          response: welcomeMessage,
          menuOptions,
          context: {
            type: tenantType,
            stats: context.stats
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch knowledge base - ALL types (FAQs, documents, snippets)
    const { data: knowledgeBase } = await supabase
      .from('chatbot_knowledge_base')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(50);

    // Process knowledge base for the prompt
    const processedKnowledgeBase: any[] = [];
    if (knowledgeBase && knowledgeBase.length > 0) {
      for (const item of knowledgeBase) {
        if (item.type === 'faq' && item.question && item.answer) {
          processedKnowledgeBase.push({ question: item.question, answer: item.answer });
        } else if (item.type === 'document' && item.content) {
          const docTitle = item.file_name || item.category || 'Documento';
          processedKnowledgeBase.push({ question: `[Documento] ${docTitle}`, answer: item.content });
        } else if (item.type === 'snippet' && item.content) {
          const snippetTitle = item.category || 'Informação';
          processedKnowledgeBase.push({ question: `[${snippetTitle}]`, answer: item.content });
        }
      }
    }

    // Fetch recent good conversations for learning
    const { data: recentSessions } = await supabase
      .from('chatbot_sessions')
      .select('messages, feedback, rating')
      .eq('tenant_id', tenantId)
      .eq('rating', true)
      .order('started_at', { ascending: false })
      .limit(5);

    // Extract good response patterns
    let learningContext = '';
    if (recentSessions && recentSessions.length > 0) {
      const goodPatterns: string[] = [];
      for (const session of recentSessions) {
        const msgs = session.messages as any[];
        if (msgs && Array.isArray(msgs)) {
          const assistantMsgs = msgs.filter(m => m.role === 'assistant' || m.role === 'bot');
          for (const msg of assistantMsgs.slice(-1)) {
            if (msg.content && msg.content.length > 30 && msg.content.length < 500) {
              goodPatterns.push(msg.content);
            }
          }
        }
      }
      if (goodPatterns.length > 0) {
        learningContext = `\n\n=== EXEMPLOS DE BOAS RESPOSTAS (use como referência de tom e estilo) ===\n${goodPatterns.slice(0, 3).join('\n---\n')}`;
      }
    }

    // Get AI settings to check if web search is enabled
    const aiSettings = await getAISettings(supabase, tenantId);
    const webSearchEnabled = tenantType === 'master' && aiSettings.webSearch === true;
    
    console.log("Building prompt with webSearchEnabled:", webSearchEnabled, "KB items:", processedKnowledgeBase.length);

    // Build system prompt with web search info
    const systemPrompt = buildSystemPrompt(context, processedKnowledgeBase, webSearchEnabled) + learningContext;

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt }
    ];

    if (previousMessages && Array.isArray(previousMessages)) {
      const recentMessages = previousMessages.slice(-15);
      for (const msg of recentMessages) {
        messages.push({
          role: msg.role === 'bot' ? 'assistant' : 'user',
          content: msg.content
        });
      }
    }

    messages.push({ role: "user", content: message });

    // PROCESSAR MÍDIA (ÁUDIO OU IMAGEM)
    let mediaPart = null;
    if (fileUrl) {
      if (fileUrl.startsWith('data:')) {
        const [mimePart, base64Data] = fileUrl.split(',');
        const mimeType = mimePart.match(/:(.*?);/)?.[1] || (fileType === 'audio' ? 'audio/ogg' : 'image/jpeg');
        mediaPart = {
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        };
      } else {
        mediaPart = await processMedia(supabase, fileUrl, fileType || 'image');
      }
    }

    // Call AI using tenant's configured provider
    let responseText = "";
    if (mediaPart && (!aiSettings || aiSettings.provider === 'gemini')) {
      const geminiKey = aiSettings.geminiKey;
      const geminiModel = normalizeGeminiModel(aiSettings.model);
      
      const requestBody = {
        contents: [{
          role: "user",
          parts: [mediaPart, { text: message || "Analise esta mídia e responda conforme o contexto." }]
        }],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: { maxOutputTokens: aiSettings.maxTokens }
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );
      
      const result = await response.json();
      responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      responseText = await callAI(supabase, tenantId, tenantType, messages);
    }
    const aiResponse = parseAIResponse(responseText);

    // Log action if present
    if (aiResponse.action && sessionId) {
      await supabase
        .from('chatbot_actions')
        .insert({
          session_id: sessionId,
          tenant_id: tenantId,
          customer_id: customerId,
          action_type: aiResponse.action.type,
          action_data: aiResponse.action.payload
        });
    }

    console.log("Contextual AI response generated successfully");

    return new Response(
      JSON.stringify({ 
        response: aiResponse.message,
        action: aiResponse.action,
        suggestions: aiResponse.suggestions,
        context: {
          type: tenantType,
          stats: context.stats
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in chat-contextual function:", error);
    
    const status = error?.status || 500;
    const message = error?.message || "Erro desconhecido";
    
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
