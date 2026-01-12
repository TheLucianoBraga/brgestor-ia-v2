import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========================================
// TIPOS E INTERFACES
// ========================================

// Níveis de permissão (do maior para menor)
type PermissionLevel = 'OWNER' | 'ADMIN' | 'RESELLER' | 'CUSTOMER' | 'VISITOR';

// Interface para memória de chat (com permissões)
interface ChatMemory {
  id: string;
  tenant_id: string;
  phone: string;
  contact_name: string | null;
  is_customer: boolean;
  customer_id: string | null;
  is_owner: boolean;           // NOVO: É o dono/admin?
  is_reseller: boolean;        // NOVO: É revendedor?
  email_verified: boolean;     // NOVO: Email verificado?
  verified_email: string | null; // NOVO: Email que foi verificado
  permission_level: PermissionLevel; // NOVO: Nível de permissão calculado
  conversation_summary: string | null;
  last_intent: string | null;
  messages_count: number;
  metadata: Record<string, any>;
}

// Ações disponíveis por nível de permissão
const PERMISSION_ACTIONS: Record<PermissionLevel, string[]> = {
  'OWNER': [
    'generate_pix', 'show_services', 'show_charges', 'transfer_human',
    'create_ticket', 'view_reports', 'manage_customers', 'manage_services',
    'view_financials', 'send_broadcast', 'configure_ai', 'export_data'
  ],
  'ADMIN': [
    'generate_pix', 'show_services', 'show_charges', 'transfer_human',
    'create_ticket', 'view_reports', 'manage_customers'
  ],
  'RESELLER': [
    'generate_pix', 'show_services', 'show_charges', 'transfer_human',
    'create_ticket', 'view_my_customers', 'view_my_commissions'
  ],
  'CUSTOMER': [
    'generate_pix', 'show_services', 'show_charges', 'transfer_human', 'create_ticket'
  ],
  'VISITOR': [
    'show_services', 'transfer_human', 'request_signup'
  ]
};

// Helper: Verificar se telefone bate (últimos 8 dígitos)
function phonesMatch(phone1: string, phone2: string): boolean {
  const clean1 = phone1?.replace(/\D/g, '').slice(-8) || '';
  const clean2 = phone2?.replace(/\D/g, '').slice(-8) || '';
  return clean1.length >= 8 && clean2.length >= 8 && clean1 === clean2;
}

// Helper: Calcular nível de permissão
function calculatePermissionLevel(memory: ChatMemory): PermissionLevel {
  if (memory.is_owner) return 'OWNER';
  if (memory.is_reseller) return 'RESELLER';
  if (memory.is_customer) return 'CUSTOMER';
  return 'VISITOR';
}

// Helper: Verificar se usuário pode executar ação
function canExecuteAction(permissionLevel: PermissionLevel, action: string): boolean {
  const allowedActions = PERMISSION_ACTIONS[permissionLevel] || [];
  return allowedActions.includes(action);
}

// ========================================
// FASE C: DETECÇÃO DE INTENÇÃO
// ========================================

// Detectar intenção da mensagem
function detectIntent(message: string, memory: ChatMemory | null): string {
  const msg = message.toLowerCase().trim();
  
  // Saudações
  if (msg.match(/^(opa|oi|olá|ola|eai|e ai|eae|fala|hey|hello|bom dia|boa tarde|boa noite|boa|blz|beleza)[\s!?.,]*$/i)) 
    return 'greeting';
  if (msg.match(/opa|oi |olá|ola |eai|e ai|bom dia|boa tarde|boa noite/)) 
    return 'greeting';
  
  // Preços e valores
  if (msg.match(/pre[çc]o|valor|quanto|custa|plano|pacote|tabela|promocao|promoção/)) 
    return 'pricing';
  
  // Suporte e problemas
  if (msg.match(/problema|erro|n[aã]o funciona|bug|ajuda|suporte|reclama|travou|parou/)) 
    return 'support';
  
  // Cancelamento
  if (msg.match(/cancelar|cancela|desistir|n[aã]o quero mais|sair|encerrar assinatura/)) 
    return 'cancel';
  
  // Pagamento e PIX
  if (msg.match(/pix|boleto|pagar|pagamento|2[ªa]?\s*via|fatura|cobran[çc]a/)) 
    return 'payment';
  
  // Claim de dono/admin
  if (msg.match(/dono|master|admin|sou o |proprietário|propriet[aá]rio|administrador/)) 
    return 'owner_claim';
  
  // Cadastro
  if (msg.match(/cliente|quero ser|cadastrar|assinar|começar|come[çc]ar|contratar/)) 
    return 'signup';
  
  // Recusa
  if (msg.match(/^(n[aã]o|nenhum|agora n[aã]o|depois|talvez|deixa|dispenso)[\s!?.,]*$/i)) 
    return 'rejection';
  
  // Agradecimento
  if (msg.match(/obrigad[oa]|valeu|thanks|brigad[oa]|agrade[çc]o|tmj|show/)) 
    return 'thanks';
  
  // Dúvidas sobre serviço
  if (msg.match(/meu servi[çc]o|minha assinatura|quando vence|vencimento|expira|renova/)) 
    return 'service_inquiry';
  
  // Status
  if (msg.match(/status|situa[çc][aã]o|como est[aá]|andamento/)) 
    return 'status_inquiry';
  
  // Indicação/Afiliado
  if (msg.match(/indicar|indica[çc][aã]o|afiliado|comiss[aã]o|ganhar|revenda/)) 
    return 'referral';
  
  // Atendente humano
  if (msg.match(/atendente|humano|pessoa|falar com|preciso de algu[eé]m/))
    return 'handoff';
  
  return 'general';
}

// Respostas rápidas por intenção (sem chamar IA)
function getQuickResponse(intent: string, memory: ChatMemory | null, contactName: string | null): { response: string | null; shouldCallAI: boolean } {
  const name = contactName?.split(' ')[0] || '';
  
  switch (intent) {
    case 'greeting':
      if (!memory || memory.messages_count <= 1) {
        return { response: null, shouldCallAI: true }; // Primeiro contato, deixa IA responder
      }
      const greetings = [
        `Oi${name ? `, ${name}` : ''}! 😊 Como posso ajudar?`,
        `Olá${name ? `, ${name}` : ''}! Em que posso ajudar?`,
        `E aí${name ? `, ${name}` : ''}! Tudo bem? Como posso ajudar?`,
      ];
      return { response: greetings[Math.floor(Math.random() * greetings.length)], shouldCallAI: false };
      
    case 'thanks':
      const thanks = [
        'Por nada! 😊',
        'Disponha! Qualquer coisa, só chamar.',
        'Imagina! Estou aqui pra ajudar.',
        '😊 Precisando, é só falar!',
        'Nada! Qualquer dúvida, é só mandar.',
      ];
      return { response: thanks[Math.floor(Math.random() * thanks.length)], shouldCallAI: false };
      
    case 'rejection':
      const rejections = [
        'Sem problemas! 😊 Se precisar de algo, é só chamar.',
        'Tudo bem! Qualquer coisa, estou à disposição.',
        'Ok! Fico por aqui se precisar.',
      ];
      return { response: rejections[Math.floor(Math.random() * rejections.length)], shouldCallAI: false };
      
    default:
      return { response: null, shouldCallAI: true };
  }
}

// ========================================
// FASE E: TEMPLATES COM VARIÁVEIS
// ========================================

interface TemplateVariables {
  customerName?: string | null;
  customerFirstName?: string | null;
  customerStatus?: string | null;
  customerWhatsapp?: string | null;
  customerEmail?: string | null;
  customerCpfCnpj?: string | null;
  serviceName?: string | null;
  servicePrice?: number | null;
  serviceDiscount?: number | null;
  serviceDueDate?: string | null;
  serviceExpiresAt?: string | null;
  serviceStatus?: string | null;
  tenantName?: string | null;
  linkCadastro?: string | null;
  linkCliente?: string | null;
  linkRevenda?: string | null;
}

// Retorna período do dia
function getPeriodoDia(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Formatar moeda
function formatCurrency(value?: number | null): string {
  if (value === null || value === undefined) return '';
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

// Formatar data
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

// Traduzir status
function translateStatus(status?: string | null): string {
  if (!status) return '';
  const statusMap: Record<string, string> = {
    'active': 'Ativo',
    'pending': 'Pendente',
    'expired': 'Expirado',
    'cancelled': 'Cancelado',
    'suspended': 'Suspenso',
    'overdue': 'Vencido',
  };
  return statusMap[status] || status;
}

// Processa variáveis do template
function processTemplate(template: string, vars: TemplateVariables = {}): string {
  const firstName = vars.customerFirstName || vars.customerName?.split(' ')[0] || '';
  const fullName = vars.customerName || '';
  
  let result = template
    // Período do dia
    .replace(/\{\{periodo_dia\}\}/gi, getPeriodoDia())
    .replace(/\{periodo_dia\}/gi, getPeriodoDia())
    // Nome
    .replace(/\{\{nome\}\}/gi, fullName)
    .replace(/\{nome\}/gi, fullName)
    .replace(/\{\{primeiro_nome\}\}/gi, firstName)
    .replace(/\{primeiro_nome\}/gi, firstName)
    .replace(/\{\{nome_cliente\}\}/gi, fullName)
    .replace(/\{nome_cliente\}/gi, fullName)
    // Contato
    .replace(/\{\{whatsapp\}\}/gi, vars.customerWhatsapp || '')
    .replace(/\{whatsapp\}/gi, vars.customerWhatsapp || '')
    .replace(/\{\{email\}\}/gi, vars.customerEmail || '')
    .replace(/\{email\}/gi, vars.customerEmail || '')
    .replace(/\{\{cpf\}\}/gi, vars.customerCpfCnpj || '')
    .replace(/\{cpf\}/gi, vars.customerCpfCnpj || '')
    .replace(/\{\{cpf_cnpj\}\}/gi, vars.customerCpfCnpj || '')
    .replace(/\{cpf_cnpj\}/gi, vars.customerCpfCnpj || '')
    // Status
    .replace(/\{\{status_cliente\}\}/gi, translateStatus(vars.customerStatus))
    .replace(/\{status_cliente\}/gi, translateStatus(vars.customerStatus))
    // Serviço
    .replace(/\{\{servico\}\}/gi, vars.serviceName || '')
    .replace(/\{servico\}/gi, vars.serviceName || '')
    .replace(/\{\{produto\}\}/gi, vars.serviceName || '')
    .replace(/\{produto\}/gi, vars.serviceName || '')
    // Valores
    .replace(/\{\{valor\}\}/gi, formatCurrency(vars.servicePrice))
    .replace(/\{valor\}/gi, formatCurrency(vars.servicePrice))
    .replace(/\{\{preco\}\}/gi, formatCurrency(vars.servicePrice))
    .replace(/\{preco\}/gi, formatCurrency(vars.servicePrice))
    .replace(/\{\{desconto\}\}/gi, formatCurrency(vars.serviceDiscount))
    .replace(/\{desconto\}/gi, formatCurrency(vars.serviceDiscount))
    // Datas
    .replace(/\{\{vencimento\}\}/gi, formatDate(vars.serviceDueDate))
    .replace(/\{vencimento\}/gi, formatDate(vars.serviceDueDate))
    .replace(/\{\{validade\}\}/gi, formatDate(vars.serviceExpiresAt))
    .replace(/\{validade\}/gi, formatDate(vars.serviceExpiresAt))
    // Status serviço
    .replace(/\{\{status_servico\}\}/gi, translateStatus(vars.serviceStatus))
    .replace(/\{status_servico\}/gi, translateStatus(vars.serviceStatus))
    // Empresa
    .replace(/\{\{empresa\}\}/gi, vars.tenantName || '')
    .replace(/\{empresa\}/gi, vars.tenantName || '')
    // Links
    .replace(/\{\{link_cadastro\}\}/gi, vars.linkCadastro || vars.linkCliente || '')
    .replace(/\{link_cadastro\}/gi, vars.linkCadastro || vars.linkCliente || '')
    .replace(/\{\{link_cliente\}\}/gi, vars.linkCliente || '')
    .replace(/\{link_cliente\}/gi, vars.linkCliente || '')
    .replace(/\{\{link_revenda\}\}/gi, vars.linkRevenda || '')
    .replace(/\{link_revenda\}/gi, vars.linkRevenda || '')
    .replace(/\[Link de [Cc]adastro\]/gi, vars.linkCadastro || vars.linkCliente || '')
    .replace(/\[Link de [Cc]liente\]/gi, vars.linkCliente || '')
    .replace(/\[Link de [Rr]evenda\]/gi, vars.linkRevenda || '')
    // Limpeza
    .replace(/Olá\s+!/g, 'Olá!')
    .replace(/[ \t]{2,}/g, ' ');
  
  return result;
}

// Interface para histórico de mensagens
interface ConversationHistory {
  role: string;
  content: string;
  timestamp: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log('📨 Webhook recebido:', payload.event, payload.session);

    if (payload.event !== 'message') {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const messagePayload = payload.payload;
    
    // Ignorar mensagens próprias
    if (messagePayload?.fromMe) {
      console.log('⏭️ Ignorando mensagem própria');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extrair dados básicos
    const messageBody = messagePayload?.body || '';
    const from = messagePayload?.from || '';
    const chatId = messagePayload?.chatId || messagePayload?.to || from;
    const sessionName = payload.session || '';
    const contactName = messagePayload?.notifyName || messagePayload?._data?.notifyName || null;
    const participantPhone = messagePayload?.participant || messagePayload?._data?.participant || null;
    
    // Detectar tipo de chat
    const isGroupMessage = from.endsWith('@g.us') || chatId.endsWith('@g.us');
    const isNewsletterChannel = from.endsWith('@newsletter') || chatId.endsWith('@newsletter');
    const isLidFormat = from.endsWith('@lid') || chatId.endsWith('@lid');
    const isPrivateChat = from.endsWith('@c.us') || from.endsWith('@s.whatsapp.net') || 
                         chatId.endsWith('@c.us') || chatId.endsWith('@s.whatsapp.net') || isLidFormat;
    
    // Detectar se é grupo de comunidade (vem no payload do WAHA)
    const isCommunityGroup = messagePayload?.isGroup && (
      messagePayload?._data?.groupMetadata?.isCommunity ||
      messagePayload?._data?.groupMetadata?.isCommunityAnnounce ||
      messagePayload?.isCommunity ||
      messagePayload?.isCommunityAnnounce
    );
    
    console.log('📝 Mensagem:', messageBody.substring(0, 50), 'De:', from, 'Nome:', contactName);
    console.log('📱 Chat:', { isGroupMessage, isPrivateChat, isLidFormat, isCommunityGroup, isNewsletterChannel });

    // Extrair tenant ID do nome da sessão (tenant_a0000000 -> a0000000-0000-0000-0000-000000000001)
    const tenantPrefix = sessionName.replace('tenant_', '').substring(0, 8);
    
    // Buscar tenant - usando conversão para texto e LIKE
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id')
      .limit(100);

    if (!tenants || tenants.length === 0) {
      console.error('❌ Nenhum tenant no banco');
      return new Response(JSON.stringify({ success: false, error: 'No tenants' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar tenant que começa com o prefixo
    const tenant = tenants.find(t => t.id.toString().startsWith(tenantPrefix));
    
    if (!tenant) {
      console.error('❌ Tenant não encontrado com prefixo:', tenantPrefix, 'Tenants disponíveis:', tenants.map(t => t.id));
      return new Response(JSON.stringify({ success: false, error: 'Tenant not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tenantId = tenant.id;
    console.log('✅ Tenant encontrado:', tenantId);

    // LIMPAR TELEFONE para busca consistente
    const cleanPhone = from.replace(/\D/g, '').replace(/^55/, '');
    
    // ====================
    // 0. BUSCAR CONFIGURAÇÕES PRIMEIRO (para detectar owner)
    // ====================
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenantId);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => { settingsMap[s.key] = s.value; });

    const geminiApiKey = settingsMap['gemini_api_key'];
    const wahaUrl = (settingsMap['waha_api_url'] || '').replace(/\/+$/, '');
    const wahaApiKey = settingsMap['waha_api_key'];
    const ownerPhone = settingsMap['wa_owner_phone'] || '';
    const requireEmailVerification = settingsMap['wa_require_email_verification'] === 'true';

    if (!geminiApiKey || !wahaUrl || !wahaApiKey) {
      console.error('❌ Configurações faltando');
      return new Response(JSON.stringify({ success: false, error: 'Missing config' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ====================
    // 0.0 FILTRO DE GRUPOS E COMUNIDADES
    // ====================
    
    // Filtro para canais/newsletters (atualmente não suportamos responder)
    if (isNewsletterChannel) {
      console.log('📰 Canal/Newsletter detectado - ignorando por enquanto:', from);
      return new Response(JSON.stringify({ success: true, skipped: 'newsletter_channel' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Filtro para grupos (inclui grupos de comunidade)
    if (isGroupMessage) {
      const allowGroups = settingsMap['wa_allow_groups'] === 'true';
      const allowCommunities = settingsMap['wa_allow_communities'] !== 'false'; // padrão: habilitado
      const personaName = (settingsMap['wa_persona_name'] || 'assistente').toLowerCase();
      
      // Se é grupo de comunidade, verificar se comunidades estão habilitadas
      if (isCommunityGroup && !allowCommunities) {
        console.log('🚫 Comunidades desativadas globalmente');
        return new Response(JSON.stringify({ success: true, skipped: 'communities_disabled' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Se é grupo normal, verificar se grupos estão habilitados
      if (!isCommunityGroup && !allowGroups) {
        console.log('🚫 Grupos desativados globalmente');
        return new Response(JSON.stringify({ success: true, skipped: 'groups_disabled' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Buscar configuração específica do grupo
      const wahaGroupId = from.replace('@g.us', '') || chatId.replace('@g.us', '');
      const { data: groupData } = await supabase
        .from('whatsapp_groups')
        .select('*, group_autoresponder_config(*)')
        .eq('tenant_id', tenantId)
        .eq('waha_group_id', wahaGroupId)
        .maybeSingle();
      
      const groupConfig = Array.isArray(groupData?.group_autoresponder_config) 
        ? groupData?.group_autoresponder_config[0] 
        : groupData?.group_autoresponder_config;
      
      if (groupConfig) {
        // Verificar se está explicitamente desabilitado
        if (groupConfig.is_enabled === false || groupConfig.config_type === 'disabled') {
          console.log('🚫 Grupo/Comunidade desativado:', groupData?.name);
          return new Response(JSON.stringify({ success: true, skipped: 'group_disabled' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Verificar condições de resposta
        const messageLower = messageBody.toLowerCase();
        const isMentioned = messageLower.includes(`@${personaName}`) || messageLower.includes(personaName);
        const isQuestion = messageBody.trim().endsWith('?');
        
        const shouldRespond = groupConfig.respond_all !== false || 
                             (groupConfig.respond_on_mention && isMentioned) ||
                             (groupConfig.respond_on_questions && isQuestion);
        
        if (!shouldRespond) {
          console.log('🤫 Condições não atendidas no grupo:', groupData?.name);
          return new Response(JSON.stringify({ success: true, skipped: 'no_response_condition' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
      
      const groupType = isCommunityGroup ? 'comunidade' : 'grupo';
      console.log(`✅ Processando mensagem de ${groupType}:`, groupData?.name || wahaGroupId);
    }
    
    // Rejeitar formato de chat desconhecido (newsletters já foram filtradas acima)
    if (!isPrivateChat && !isGroupMessage && !isNewsletterChannel) {
      console.log('⚠️ Formato de chat desconhecido:', from);
      return new Response(JSON.stringify({ success: true, skipped: 'unknown_format' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ====================
    // 0.1 VERIFICAR SE É OWNER (antes de criar memória)
    // ====================
    const isOwnerByPhone = ownerPhone && phonesMatch(cleanPhone, ownerPhone);
    const ownerEmail = settingsMap['wa_owner_email'] || '';
    console.log('🔐 Owner check:', { ownerPhone, cleanPhone, isOwnerByPhone, requireEmailVerification });
    
    // ====================
    // 0.2 VERIFICAR VALIDAÇÃO POR EMAIL (se mensagem contém email)
    // ====================
    const emailMatch = messageBody.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const providedEmail = emailMatch ? emailMatch[0].toLowerCase() : null;
    let emailVerificationResult: 'pending' | 'verified' | 'failed' | null = null;
    
    // ====================
    // 1. BUSCAR/CRIAR MEMÓRIA DE CONVERSA (com detecção de permissões)
    // ====================
    let memory: ChatMemory | null = null;
    const { data: existingMemory } = await supabase
      .from('chat_memory')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (existingMemory) {
      memory = existingMemory as ChatMemory;
      
      // Atualizar is_owner se detectado agora mas não estava marcado
      let needsOwnerUpdate = isOwnerByPhone && !memory.is_owner;
      
      // Se exige verificação por email e ainda não verificou
      if (requireEmailVerification && isOwnerByPhone && !memory.email_verified) {
        if (providedEmail) {
          // Verificar se email bate com o configurado
          if (ownerEmail && providedEmail === ownerEmail.toLowerCase()) {
            needsOwnerUpdate = true;
            memory.email_verified = true;
            memory.verified_email = providedEmail;
            emailVerificationResult = 'verified';
            console.log('✅ Email verificado com sucesso!');
          } else {
            emailVerificationResult = 'failed';
            console.log('❌ Email não confere:', providedEmail, 'esperado:', ownerEmail);
          }
        } else {
          // Ainda precisa fornecer email
          emailVerificationResult = 'pending';
        }
      }
      
      // Atualizar contador e timestamp
      await supabase
        .from('chat_memory')
        .update({
          messages_count: (memory.messages_count || 0) + 1,
          last_contact_at: new Date().toISOString(),
          contact_name: contactName || memory.contact_name,
          ...(needsOwnerUpdate ? { 
            is_owner: true,
            email_verified: memory.email_verified || false,
            verified_email: memory.verified_email || null
          } : {})
        })
        .eq('id', memory.id);
      
      memory.messages_count = (memory.messages_count || 0) + 1;
      if (needsOwnerUpdate) {
        memory.is_owner = true;
        console.log('✅ Memória atualizada para OWNER!');
      }
    } else {
      // Para novo usuário que é owner por telefone mas precisa verificar email
      const needsEmailVerification = requireEmailVerification && isOwnerByPhone;
      const isFullOwner = isOwnerByPhone && !needsEmailVerification;
      
      // Criar nova memória com detecção de owner
      const { data: newMemory } = await supabase
        .from('chat_memory')
        .insert({
          tenant_id: tenantId,
          phone: cleanPhone,
          contact_name: contactName,
          is_customer: false,
          customer_id: null,
          is_owner: isOwnerByPhone,  // NOVO: marcar como owner se detectado
          is_reseller: false,
          email_verified: false,
          verified_email: null,
          messages_count: 1,
          first_contact_at: new Date().toISOString(),
          last_contact_at: new Date().toISOString(),
          metadata: {}
        })
        .select()
        .single();
      memory = newMemory as ChatMemory;
      if (isOwnerByPhone) console.log('✅ Nova memória criada como OWNER!');
    }

    console.log('💾 Memória:', memory ? 'existente' : 'nova', 
                '- Mensagens:', memory?.messages_count,
                '- isOwner:', memory?.is_owner);

    // ====================
    // 2. BUSCAR DADOS DO CLIENTE E DETECTAR REVENDEDOR
    // ====================
    let customerData: any = null;
    let isReseller = memory?.is_reseller || false;
    
    // Tentar buscar por customer_id na memória
    if (memory?.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select(`
          *,
          customer_items (
            id, product_name, plan_name, status, price, due_date, expires_at, billing_cycle
          ),
          customer_charges (
            id, description, amount, due_date, status, paid_at
          )
        `)
        .eq('id', memory.customer_id)
        .single();
      customerData = customer;
      
      // Verificar se é revendedor (tem customer_tenant_id)
      if (customer?.customer_tenant_id) {
        isReseller = true;
      }
    }
    
    // Se não encontrou, tentar buscar por WhatsApp
    if (!customerData) {
      const phoneVariations = [
        cleanPhone,
        `55${cleanPhone}`,
        `+55${cleanPhone}`,
        cleanPhone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3'),
        cleanPhone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
      ];

      for (const phoneVar of phoneVariations) {
        const { data: customer } = await supabase
          .from('customers')
          .select(`
            *,
            customer_items (
              id, product_name, plan_name, status, price, due_date, expires_at, billing_cycle
            ),
            customer_charges (
              id, description, amount, due_date, status, paid_at
            )
          `)
          .eq('tenant_id', tenantId)
          .or(`whatsapp.eq.${phoneVar},whatsapp.eq.${phoneVar.replace(/\D/g, '')}`)
          .maybeSingle();

        if (customer) {
          customerData = customer;
          
          // Verificar se é revendedor
          if (customer.customer_tenant_id) {
            isReseller = true;
          }
          
          // Atualizar memória com customer_id e status de revendedor
          if (memory && (!memory.customer_id || !memory.is_reseller)) {
            await supabase
              .from('chat_memory')
              .update({ 
                customer_id: customer.id, 
                is_customer: true,
                is_reseller: isReseller,
                contact_name: customer.full_name || memory.contact_name
              })
              .eq('id', memory.id);
            memory.customer_id = customer.id;
            memory.is_customer = true;
            memory.is_reseller = isReseller;
          }
          break;
        }
      }
    }

    // Calcular nível de permissão
    if (memory) {
      memory.is_reseller = isReseller;
      memory.permission_level = calculatePermissionLevel(memory);
    }

    console.log('👤 Cliente:', customerData ? customerData.full_name : 'não cadastrado',
                '| Revendedor:', isReseller,
                '| Permissão:', memory?.permission_level);

    // ====================
    // 3. BUSCAR HISTÓRICO DE CONVERSA (últimas 10 mensagens)
    // ====================
    const { data: conversationHistory } = await supabase
      .from('conversation_history')
      .select('role, content, timestamp')
      .eq('tenant_id', tenantId)
      .eq('phone', cleanPhone)
      .order('timestamp', { ascending: false })
      .limit(10);

    const history: ConversationHistory[] = (conversationHistory || []).reverse();
    console.log('📜 Histórico:', history.length, 'mensagens');

    // ====================
    // 4. BUSCAR BASE DE CONHECIMENTO COMPLETA
    // ====================
    
    // 4.1 Buscar TODA a base de conhecimento (ordenada por prioridade)
    const { data: knowledgeBase } = await supabase
      .from('chatbot_knowledge_base')
      .select('id, type, category, question, answer, content, priority, file_url, file_name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('priority', { ascending: false }) // Maior prioridade primeiro
      .order('type');

    // 4.2 Buscar Serviços disponíveis
    const { data: services } = await supabase
      .from('services')
      .select('id, name, description, price, billing_cycle')
      .eq('seller_tenant_id', tenantId)
      .eq('active', true)
      .limit(20);

    // 4.3 Buscar Planos
    const { data: plans } = await supabase
      .from('plans')
      .select('id, name, description, price, billing_cycle, features')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .limit(10);

    console.log('📚 Base:', (knowledgeBase?.length || 0), 'itens,', (services?.length || 0), 'serviços,', (plans?.length || 0), 'planos');

    // (settings já foram buscadas antes)

    // ====================
    // 4.5 FASE C: DETECTAR INTENÇÃO
    // ====================
    const intent = detectIntent(messageBody, memory);
    console.log('🎯 Intenção detectada:', intent);
    
    // Atualizar last_intent na memória
    if (memory) {
      await supabase
        .from('chat_memory')
        .update({ last_intent: intent })
        .eq('id', memory.id);
    }
    
    // Verificar se pode dar resposta rápida (sem chamar IA)
    const quickResponse = getQuickResponse(intent, memory, contactName);
    
    if (quickResponse.response && !quickResponse.shouldCallAI) {
      console.log('⚡ Resposta rápida (sem IA):', quickResponse.response.substring(0, 50));
      
      // Salvar no histórico
      try {
        await supabase.from('conversation_history').insert([
          { tenant_id: tenantId, phone: cleanPhone, role: 'user', content: messageBody, timestamp: new Date().toISOString() },
          { tenant_id: tenantId, phone: cleanPhone, role: 'assistant', content: quickResponse.response, timestamp: new Date().toISOString() }
        ]);
      } catch (e) { console.log('⚠️ Erro ao salvar histórico rápido'); }
      
      // Enviar resposta
      const chatId = from.includes('@') ? from : `${from}@c.us`;
      await fetch(`${wahaUrl}/api/sendText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
        body: JSON.stringify({ session: sessionName, chatId, text: quickResponse.response }),
      });
      
      return new Response(JSON.stringify({ success: true, quick: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ====================
    // 5. MONTAR SYSTEM PROMPT COMPLETO
    // ====================
    
    // 5.1 Prompt base
    let systemPrompt = settingsMap['ai_system_prompt'] || 'Você é um assistente virtual inteligente.';
    
    // IMPORTANTE: Instruções de formatação para WhatsApp
    systemPrompt += `\n\n=== FORMATAÇÃO OBRIGATÓRIA (WhatsApp) ===
⚠️ REGRAS CRÍTICAS:
1. NUNCA use formato Markdown para links. NÃO use [texto](url)
2. Escreva URLs diretamente: https://exemplo.com
3. Para destaque use *negrito* com asterisco
4. Não repita o mesmo link várias vezes
5. Seja conciso - máximo 3 parágrafos por resposta
6. Use emojis com moderação
7. Quebre linhas para melhor leitura`;

    // 5.1.5 FASE C: Adicionar intenção detectada ao contexto
    const intentDescriptions: Record<string, string> = {
      'greeting': 'Saudação/cumprimento',
      'pricing': 'Pergunta sobre preços/valores',
      'support': 'Pedido de suporte/problema',
      'cancel': 'Intenção de cancelamento',
      'payment': 'Assunto sobre pagamento/PIX',
      'owner_claim': 'Alega ser dono/admin',
      'signup': 'Quer se cadastrar',
      'rejection': 'Recusa/não quer',
      'thanks': 'Agradecimento',
      'service_inquiry': 'Pergunta sobre serviço contratado',
      'status_inquiry': 'Pergunta sobre status',
      'referral': 'Interesse em indicação/revenda',
      'handoff': 'Quer falar com humano',
      'general': 'Pergunta geral'
    };
    
    systemPrompt += `\n\n=== INTENÇÃO DETECTADA ===`;
    systemPrompt += `\n🎯 Intenção: ${intentDescriptions[intent] || intent}`;
    
    // Instruções baseadas na intenção
    if (intent === 'pricing') {
      systemPrompt += `\n💡 AÇÃO: Foque em mostrar preços/planos disponíveis`;
    } else if (intent === 'support') {
      systemPrompt += `\n💡 AÇÃO: Seja empático, pergunte qual o problema e ofereça ajuda`;
    } else if (intent === 'cancel') {
      systemPrompt += `\n💡 AÇÃO: Tente entender o motivo, ofereça alternativas se possível`;
    } else if (intent === 'payment') {
      systemPrompt += `\n💡 AÇÃO: Ofereça gerar PIX ou mostrar cobranças. Use [ACTION:generate_pix] ou [ACTION:show_charges]`;
    } else if (intent === 'signup') {
      systemPrompt += `\n💡 AÇÃO: Apresente os serviços e ofereça link de cadastro se disponível`;
    } else if (intent === 'handoff') {
      systemPrompt += `\n💡 AÇÃO: Confirme que vai transferir para atendente. Use [ACTION:transfer_human]`;
    } else if (intent === 'service_inquiry' && customerData) {
      systemPrompt += `\n💡 AÇÃO: Use os dados do cliente acima para responder sobre serviços`;
    }
    
    // 5.2 Informações da empresa
    if (settingsMap['ai_company_name']) {
      systemPrompt += `\n\n=== EMPRESA ===\nNome: ${settingsMap['ai_company_name']}`;
    }
    if (settingsMap['ai_company_description']) {
      systemPrompt += `\nDescrição: ${settingsMap['ai_company_description']}`;
    }
    if (settingsMap['ai_tone']) {
      systemPrompt += `\nTom de voz: ${settingsMap['ai_tone']}`;
    }

    // 5.3 Base de Conhecimento COMPLETA (por tipo e prioridade)
    if (knowledgeBase && knowledgeBase.length > 0) {
      systemPrompt += `\n\n=== BASE DE CONHECIMENTO (USE SEMPRE QUE RELEVANTE!) ===`;
      
      // Agrupar por tipo
      const groupedByType: Record<string, any[]> = {};
      for (const kb of knowledgeBase) {
        const type = kb.type || 'geral';
        if (!groupedByType[type]) groupedByType[type] = [];
        groupedByType[type].push(kb);
      }

      // Mapear tipos para nomes amigáveis
      const typeNames: Record<string, string> = {
        'faq': '❓ FAQ (Perguntas e Respostas)',
        'procedure': '📋 Procedimentos',
        'pricing': '💰 Tabela de Preços',
        'policy': '📜 Políticas e Regras',
        'persona': '🎭 Tom de Voz/Persona',
        'contact': '📞 Contatos e Canais',
        'link': '🔗 Links Úteis',
        'glossary': '📖 Glossário',
        'fallback': '⚠️ Respostas de Erro',
        'info': 'ℹ️ Informações Gerais',
        'document': '📄 Documentos'
      };

      for (const [type, items] of Object.entries(groupedByType)) {
        const typeName = typeNames[type] || `📁 ${type.toUpperCase()}`;
        systemPrompt += `\n\n${typeName}:`;
        
        for (const kb of items) {
          // Prioridade alta = mais importante
          const priorityBadge = kb.priority >= 8 ? '⭐ IMPORTANTE: ' : '';
          
          if (kb.question && kb.answer) {
            // Tipo FAQ
            systemPrompt += `\n${priorityBadge}P: ${kb.question}`;
            systemPrompt += `\n   R: ${kb.answer}`;
          } else if (kb.content) {
            // Tipos com conteúdo livre
            const title = kb.category || kb.question || 'Info';
            systemPrompt += `\n${priorityBadge}${title}: ${kb.content}`;
          }
          
          // Se tiver arquivo/documento
          if (kb.file_url) {
            systemPrompt += `\n   📎 Arquivo: ${kb.file_name || kb.file_url}`;
          }
        }
      }
    }

    // 5.4 Serviços disponíveis
    if (services && services.length > 0) {
      systemPrompt += `\n\n=== SERVIÇOS DISPONÍVEIS ===`;
      for (const svc of services) {
        const price = svc.price ? `R$ ${svc.price.toFixed(2).replace('.', ',')}` : 'Sob consulta';
        systemPrompt += `\n- ${svc.name}: ${svc.description || 'Sem descrição'} | Preço: ${price}`;
      }
    }

    // 5.5 Planos
    if (plans && plans.length > 0) {
      systemPrompt += `\n\n=== PLANOS ===`;
      for (const plan of plans) {
        const price = plan.price ? `R$ ${plan.price.toFixed(2).replace('.', ',')}` : 'Sob consulta';
        systemPrompt += `\n- ${plan.name}: ${plan.description || ''} | ${price}/${plan.billing_cycle || 'mensal'}`;
        if (plan.features) {
          systemPrompt += ` | Recursos: ${JSON.stringify(plan.features)}`;
        }
      }
    }

    // 5.6 Contexto baseado no NÍVEL DE PERMISSÃO
    const permissionLevel = memory?.permission_level || 'VISITOR';
    const allowedActions = PERMISSION_ACTIONS[permissionLevel] || PERMISSION_ACTIONS['VISITOR'];
    
    // OWNER - tratamento especial
    if (memory?.is_owner && (!requireEmailVerification || memory.email_verified)) {
      systemPrompt += `\n\n=== 🔑 ADMINISTRADOR DO SISTEMA ===`;
      systemPrompt += `\n⭐ Este contato É O DONO/ADMINISTRADOR (${contactName || 'Admin'})`;
      systemPrompt += `\n- NÍVEL DE PERMISSÃO: MÁXIMO (OWNER)`;
      if (memory.email_verified) {
        systemPrompt += `\n- ✅ Identidade verificada por email: ${memory.verified_email}`;
      }
      systemPrompt += `\n- Pode executar QUALQUER comando do sistema`;
      systemPrompt += `\n- Trate com respeito especial como parceiro`;
      systemPrompt += `\n- NÃO ofereça cadastro - ele administra o sistema`;
      systemPrompt += `\n- Pergunte como pode ajudar com relatórios, clientes, configurações`;
      systemPrompt += `\n- Seja direto e eficiente nas respostas`;
      
    } else if (isOwnerByPhone && requireEmailVerification && !memory?.email_verified) {
      // OWNER que precisa verificar email
      systemPrompt += `\n\n=== 🔐 VERIFICAÇÃO DE IDENTIDADE NECESSÁRIA ===`;
      systemPrompt += `\n⚠️ Este contato parece ser o administrador pelo número, MAS precisa verificar por email.`;
      
      if (emailVerificationResult === 'pending') {
        systemPrompt += `\n\n📧 AÇÃO OBRIGATÓRIA: Peça para o usuário informar seu email cadastrado para confirmar a identidade.`;
        systemPrompt += `\nDiga algo como: "Para acessar funções administrativas, por favor confirme seu email cadastrado."`;
      } else if (emailVerificationResult === 'failed') {
        systemPrompt += `\n\n❌ O email informado NÃO confere com o cadastrado.`;
        systemPrompt += `\nDiga: "Desculpe, o email informado não corresponde ao cadastro. Por favor, tente novamente ou entre em contato pelo canal oficial."`;
      }
      
      systemPrompt += `\n- Até verificar, trate como VISITANTE comum`;
      systemPrompt += `\n- NÃO execute comandos administrativos`;
      
    } else if (memory?.is_reseller) {
      // REVENDEDOR
      systemPrompt += `\n\n=== 💼 REVENDEDOR/PARCEIRO ===`;
      systemPrompt += `\n⭐ Este contato é REVENDEDOR (${contactName || customerData?.full_name || 'Parceiro'})`;
      systemPrompt += `\n- NÍVEL DE PERMISSÃO: RESELLER`;
      systemPrompt += `\n- Pode ver seus clientes, comissões, cobranças`;
      systemPrompt += `\n- Ofereça suporte de revenda e relatórios`;
      systemPrompt += `\n- Seja prestativo e profissional`;
      
    } else if (customerData) {
      // CLIENTE CADASTRADO
      const customerName = customerData.full_name?.split(' ')[0] || 'Cliente';
      systemPrompt += `\n\n=== DADOS DO CLIENTE (Personalizado!) ===`;
      systemPrompt += `\n🧑 Nome: ${customerData.full_name}`;
      systemPrompt += `\n- NÍVEL DE PERMISSÃO: CUSTOMER`;
      systemPrompt += `\n📧 Email: ${customerData.email || 'não informado'}`;
      systemPrompt += `\n📱 WhatsApp: ${customerData.whatsapp}`;
      
      // Serviços contratados
      if (customerData.customer_items && customerData.customer_items.length > 0) {
        systemPrompt += `\n\n📦 SERVIÇOS CONTRATADOS:`;
        for (const item of customerData.customer_items) {
          const status = item.status === 'active' ? '✅ Ativo' : item.status === 'expired' ? '⚠️ Expirado' : `📋 ${item.status}`;
          const price = item.price ? `R$ ${item.price.toFixed(2).replace('.', ',')}` : '';
          const expires = item.expires_at ? `Expira: ${new Date(item.expires_at).toLocaleDateString('pt-BR')}` : '';
          systemPrompt += `\n- ${item.product_name}${item.plan_name ? ` (${item.plan_name})` : ''} | ${status} ${price} ${expires}`;
        }
      }

      // Cobranças pendentes
      const pendingCharges = customerData.customer_charges?.filter((c: any) => 
        c.status === 'pending' || c.status === 'overdue'
      ) || [];
      if (pendingCharges.length > 0) {
        systemPrompt += `\n\n💰 COBRANÇAS PENDENTES (MENCIONAR PROATIVAMENTE!):`;
        for (const charge of pendingCharges) {
          const amount = `R$ ${charge.amount.toFixed(2).replace('.', ',')}`;
          const dueDate = new Date(charge.due_date).toLocaleDateString('pt-BR');
          const isOverdue = new Date(charge.due_date) < new Date();
          systemPrompt += `\n- ${charge.description} | ${amount} | Vence: ${dueDate} ${isOverdue ? '⚠️ VENCIDO!' : ''}`;
        }
      }

      systemPrompt += `\n\n💡 INSTRUÇÕES PARA ESTE CLIENTE:`;
      systemPrompt += `\n- Use o primeiro nome: ${customerName}`;
      systemPrompt += `\n- Ele JÁ é cliente, não ofereça cadastro`;
      systemPrompt += `\n- Use os dados acima para responder sobre serviços/valores`;
      if (pendingCharges.length > 0) {
        systemPrompt += `\n- Ele tem cobranças pendentes - ofereça ajuda para pagar`;
      }
    } else {
      // VISITANTE (não é cliente)
      systemPrompt += `\n\n=== VISITANTE (NÃO É CLIENTE) ===`;
      systemPrompt += `\n- NÍVEL DE PERMISSÃO: VISITOR`;
      systemPrompt += `\nNome do contato: ${contactName || 'Desconhecido'}`;
      systemPrompt += `\nTelefone: ${cleanPhone}`;
      systemPrompt += `\nMensagens trocadas: ${memory?.messages_count || 1}`;
      systemPrompt += `\n\n💡 INSTRUÇÕES:`;
      systemPrompt += `\n- Seja acolhedor e apresente a empresa`;
      systemPrompt += `\n- Mostre os serviços/planos disponíveis`;
      systemPrompt += `\n- Tente converter em cliente`;
    }

    // 5.7 Histórico de conversa
    if (history.length > 0) {
      systemPrompt += `\n\n=== HISTÓRICO RECENTE (${history.length} mensagens) ===`;
      for (const msg of history.slice(-5)) {
        const role = msg.role === 'user' ? '👤 Cliente' : '🤖 Você';
        systemPrompt += `\n${role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`;
      }
      systemPrompt += `\n\n⚠️ Continue a conversa naturalmente, sem repetir o que já foi dito.`;
    }

    // 5.8 Instruções adicionais do tenant
    if (settingsMap['ai_instructions']) {
      systemPrompt += `\n\n=== INSTRUÇÕES ESPECIAIS ===\n${settingsMap['ai_instructions']}`;
    }

    // 5.9 Ações disponíveis BASEADAS NO NÍVEL DE PERMISSÃO
    const actionDescriptions: Record<string, string> = {
      'generate_pix': '💳 Gerar PIX para pagamento',
      'show_services': '📦 Listar serviços contratados',
      'show_charges': '💰 Listar cobranças pendentes',
      'transfer_human': '👤 Transferir para atendente humano',
      'create_ticket': '📝 Criar ticket de suporte',
      'view_reports': '📊 Ver relatórios (ADMIN+)',
      'manage_customers': '👥 Gerenciar clientes (ADMIN+)',
      'manage_services': '⚙️ Gerenciar serviços (OWNER)',
      'view_financials': '💵 Ver financeiro completo (OWNER)',
      'send_broadcast': '📢 Enviar mensagem em massa (OWNER)',
      'configure_ai': '🤖 Configurar IA (OWNER)',
      'export_data': '📤 Exportar dados (OWNER)',
      'view_my_customers': '👥 Ver meus clientes (RESELLER)',
      'view_my_commissions': '💸 Ver minhas comissões (RESELLER)',
      'request_signup': '📝 Solicitar cadastro'
    };
    
    systemPrompt += `\n\n=== AÇÕES DISPONÍVEIS (NÍVEL: ${permissionLevel}) ===`;
    systemPrompt += `\nQuando identificar uma intenção clara, inclua uma ação no final da resposta:`;
    
    for (const action of allowedActions) {
      const desc = actionDescriptions[action] || action;
      systemPrompt += `\n- [ACTION:${action}] - ${desc}`;
    }
    
    // Instruções especiais para ações com dados
    if (allowedActions.includes('create_ticket')) {
      systemPrompt += `\n\nPara criar ticket use: [ACTION:create_ticket:{"subject":"...","description":"..."}]`;
    }
    
    // Se for OWNER, instruções especiais
    if (permissionLevel === 'OWNER') {
      systemPrompt += `\n\n⚡ COMANDOS RÁPIDOS DE ADMIN:`;
      systemPrompt += `\n- "relatório de vendas" → [ACTION:view_reports:{"type":"sales"}]`;
      systemPrompt += `\n- "quantos clientes tenho" → [ACTION:manage_customers:{"action":"count"}]`;
      systemPrompt += `\n- "exportar clientes" → [ACTION:export_data:{"type":"customers"}]`;
    }

    console.log('✅ System prompt montado:', systemPrompt.length, 'caracteres');

    // ====================
    // 6. MONTAR HISTÓRICO DE CONVERSA PARA GEMINI
    // ====================
    const geminiContents = [];
    
    // Adicionar histórico
    for (const msg of history) {
      geminiContents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }
    
    // Adicionar mensagem atual
    geminiContents.push({
      role: 'user',
      parts: [{ text: messageBody }]
    });

    // Chamar Gemini AI
    console.log('🤖 Chamando Gemini com', geminiContents.length, 'mensagens...');
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiContents,
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: { 
            maxOutputTokens: 800,
            temperature: 0.7
          }
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ Erro Gemini:', aiResponse.status, errorText);
      return new Response(JSON.stringify({ success: false, error: 'Gemini error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiData = await aiResponse.json();
    let replyText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, não entendi.';
    
    console.log('✅ Resposta IA:', replyText.substring(0, 100));

    // ====================
    // 7. PROCESSAR AÇÕES [ACTION:xxx] COM VERIFICAÇÃO DE PERMISSÃO
    // ====================
    const actionMatch = replyText.match(/\[ACTION:([a-z_]+)(?::(.+?))?\]/i);
    let actionResult: string | null = null;
    
    if (actionMatch) {
      const actionType = actionMatch[1];
      let actionData: any = {};
      
      try {
        actionData = actionMatch[2] ? JSON.parse(actionMatch[2]) : {};
      } catch (e) {
        console.log('⚠️ Erro ao parsear action data:', actionMatch[2]);
      }
      
      console.log('🎯 Ação detectada:', actionType, 'Permissão:', permissionLevel);
      
      // Remover a action do texto de resposta
      replyText = replyText.replace(/\[ACTION:[^\]]+\]/g, '').trim();
      
      // VERIFICAR PERMISSÃO ANTES DE EXECUTAR
      if (canExecuteAction(permissionLevel, actionType)) {
        console.log('✅ Ação autorizada! Executando:', actionType);
        
        // EXECUTAR AÇÕES
        switch (actionType) {
          case 'show_services':
            if (customerData?.customer_items?.length > 0) {
              actionResult = '\n\n📦 *Seus serviços:*';
              for (const item of customerData.customer_items) {
                const status = item.status === 'active' ? '✅' : '⚠️';
                actionResult += `\n${status} ${item.product_name}${item.plan_name ? ` (${item.plan_name})` : ''}`;
              }
            } else {
              actionResult = '\n\n📦 Você ainda não possui serviços contratados.';
            }
            break;
            
          case 'show_charges':
            const charges = customerData?.customer_charges?.filter((c: any) => 
              c.status === 'pending' || c.status === 'overdue'
            ) || [];
            if (charges.length > 0) {
              actionResult = '\n\n💰 *Cobranças pendentes:*';
              for (const charge of charges) {
                const amount = `R$ ${charge.amount.toFixed(2).replace('.', ',')}`;
                const dueDate = new Date(charge.due_date).toLocaleDateString('pt-BR');
                const status = charge.status === 'overdue' ? '⚠️ VENCIDO' : '📅 Vence';
                actionResult += `\n• ${charge.description}: ${amount} | ${status}: ${dueDate}`;
              }
            } else {
              actionResult = '\n\n✅ Você não possui cobranças pendentes!';
            }
            break;
            
          case 'generate_pix':
            // TODO: Integrar com sistema de pagamento
            actionResult = '\n\n💳 Para gerar o PIX, um atendente entrará em contato em breve!';
            break;
            
          case 'transfer_human':
            // TODO: Marcar conversa para atendimento humano
            actionResult = '\n\n👤 Certo! Um atendente humano entrará em contato em breve.';
            // Atualizar memória para indicar que precisa de atendimento humano
            if (memory) {
              await supabase.from('chat_memory').update({
                metadata: { ...memory.metadata, needs_human: true, requested_at: new Date().toISOString() }
              }).eq('id', memory.id);
            }
            break;
            
          case 'create_ticket':
            // Criar ticket de suporte
            const ticketSubject = actionData.subject || 'Solicitação via WhatsApp';
            const ticketDescription = actionData.description || messageBody;
            
            const { data: newTicket, error: ticketError } = await supabase
              .from('tickets')
              .insert({
                tenant_id: tenantId,
                customer_id: memory?.customer_id || null,
                subject: ticketSubject,
                description: ticketDescription,
                status: 'open',
                priority: 'medium',
                source: 'whatsapp',
                metadata: { phone: cleanPhone, contact_name: contactName }
              })
              .select('id')
              .single();
            
            if (newTicket) {
              actionResult = `\n\n📝 Ticket #${newTicket.id} criado com sucesso! Nossa equipe entrará em contato.`;
            } else {
              console.log('⚠️ Erro ao criar ticket:', ticketError);
              actionResult = '\n\n📝 Sua solicitação foi registrada!';
            }
            break;
            
          case 'view_reports':
            // Apenas para OWNER/ADMIN
            if (permissionLevel === 'OWNER' || permissionLevel === 'ADMIN') {
              // Buscar estatísticas rápidas
              const { count: customerCount } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId);
              
              const { count: activeCount } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('status', 'active');
              
              actionResult = `\n\n📊 *Resumo rápido:*\n👥 Total de clientes: ${customerCount || 0}\n✅ Clientes ativos: ${activeCount || 0}`;
            }
            break;
            
          case 'manage_customers':
            if (actionData.action === 'count') {
              const { count } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId);
              actionResult = `\n\n👥 Você tem ${count || 0} clientes cadastrados.`;
            }
            break;
            
          case 'view_my_customers':
            // Para revendedores - buscar seus clientes
            if (customerData?.customer_tenant_id) {
              const { data: myCustomers, count: myCount } = await supabase
                .from('customers')
                .select('full_name, status', { count: 'exact' })
                .eq('tenant_id', customerData.customer_tenant_id)
                .limit(5);
              
              if (myCustomers && myCustomers.length > 0) {
                actionResult = `\n\n👥 *Seus clientes (${myCount} total):*`;
                for (const c of myCustomers) {
                  const status = c.status === 'active' ? '✅' : '⏳';
                  actionResult += `\n${status} ${c.full_name}`;
                }
                if ((myCount || 0) > 5) {
                  actionResult += `\n... e mais ${(myCount || 0) - 5} clientes`;
                }
              } else {
                actionResult = '\n\n👥 Você ainda não possui clientes cadastrados.';
              }
            }
            break;
            
          default:
            console.log('⚠️ Ação não implementada:', actionType);
        }
        
        // Anexar resultado da ação à resposta
        if (actionResult) {
          replyText += actionResult;
        }
        
      } else {
        console.log('❌ Ação NÃO autorizada:', actionType, 'para nível:', permissionLevel);
        // Não executar e avisar
        replyText += '\n\n⚠️ Desculpe, você não tem permissão para executar esta ação.';
      }
    }

    // ====================
    // 8. SALVAR MENSAGENS NO HISTÓRICO
    // ====================
    // 8.5 FASE E: PROCESSAR TEMPLATES NA RESPOSTA
    // ====================
    const activeItem = customerData?.customer_items?.find((i: any) => i.status === 'ativo' || i.status === 'active');
    
    const templateVars: TemplateVariables = {
      customerName: customerData?.full_name || contactName,
      customerFirstName: customerData?.full_name?.split(' ')[0] || contactName?.split(' ')[0],
      customerStatus: customerData?.status,
      customerWhatsapp: customerData?.whatsapp || cleanPhone,
      customerEmail: customerData?.email,
      customerCpfCnpj: customerData?.cpf_cnpj,
      serviceName: activeItem?.product_name,
      servicePrice: activeItem?.price,
      serviceDiscount: activeItem?.discount,
      serviceDueDate: activeItem?.due_date,
      serviceExpiresAt: activeItem?.expires_at,
      serviceStatus: activeItem?.status,
      tenantName: settingsMap['ai_company_name'],
      linkCadastro: settingsMap['signup_link_cliente'],
      linkCliente: settingsMap['signup_link_cliente'],
      linkRevenda: settingsMap['signup_link_revenda'],
    };
    
    // Processar variáveis na resposta
    replyText = processTemplate(replyText, templateVars);
    console.log('📝 Templates processados');

    // ====================
    // 8.6 SALVAR MENSAGENS NO HISTÓRICO
    // ====================
    try {
      // Salvar mensagem do usuário
      await supabase.from('conversation_history').insert({
        tenant_id: tenantId,
        phone: cleanPhone,
        role: 'user',
        content: messageBody,
        timestamp: new Date().toISOString()
      });

      // Salvar resposta do bot
      await supabase.from('conversation_history').insert({
        tenant_id: tenantId,
        phone: cleanPhone,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toISOString()
      });
    } catch (historyError) {
      console.log('⚠️ Erro ao salvar histórico:', historyError);
    }

    // ====================
    // 9. ENVIAR RESPOSTA VIA WAHA
    // ====================
    const sendChatId = from.includes('@') ? from : `${from}@c.us`;
    await fetch(`${wahaUrl}/api/sendText`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Api-Key': wahaApiKey
      },
      body: JSON.stringify({
        session: sessionName,
        chatId: sendChatId,
        text: replyText
      }),
    });

    console.log('✅ Mensagem enviada!');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ ERRO:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
