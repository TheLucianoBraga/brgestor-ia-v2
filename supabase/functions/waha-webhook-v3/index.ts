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
    'generate_pix', 'show_services', 'show_charges', 'transfer_human', 'request_signup', 'create_ticket'
  ]
};

// Helper: Normaliza telefone para formato padrão (apenas dígitos, sempre 11 dígitos)
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove tudo que não é dígito
  let digits = phone.replace(/\D/g, '');
  
  // Se começar com 55 (Brasil) e tiver mais de 11 dígitos, remove o 55
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.substring(2);
  }
  
  // Se tiver 10 dígitos (sem o 9), adiciona o 9 após o DDD
  if (digits.length === 10) {
    digits = digits.substring(0, 2) + '9' + digits.substring(2);
  }
  
  return digits;
}

// Helper: Verificar se telefone bate (normaliza ambos e compara)
function phonesMatch(phone1: string, phone2: string): boolean {
  const clean1 = normalizePhone(phone1);
  const clean2 = normalizePhone(phone2);
  
  console.log(`📱 phonesMatch: "${phone1}" -> "${clean1}" vs "${phone2}" -> "${clean2}"`);
  
  // Comparação exata após normalização
  if (clean1.length >= 10 && clean2.length >= 10 && clean1 === clean2) {
    return true;
  }
  
  // Fallback: comparar últimos 8 dígitos (número local sem DDD)
  const last8_1 = clean1.slice(-8);
  const last8_2 = clean2.slice(-8);
  
  if (last8_1.length >= 8 && last8_2.length >= 8 && last8_1 === last8_2) {
    console.log(`📱 phonesMatch (últimos 8): MATCH!`);
    return true;
  }
  
  return false;
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

    // ====================
    // 🚨 PROTEÇÃO ANTI-LOOP DE BOTS
    // ====================
    
    // 1. LISTA NEGRA - Apenas frases que CLARAMENTE indicam loop/bot
    const blacklistPhrases = [
      'Atendimento Automático',
      'O que mais posso ajudar',
      'Já notifiquei um atendente',
      'Em breve alguém entrará em contato',
      'ntfut.com',
      'braga-digital-suporte',
      'Vídeo de no mínimo',
      'agilizar seu suporte',
      '📩 Depois envie',
      // Detectar mensagens repetidas/duplicadas
      'Para agilizar seu suporte, siga estes passos',
      'Modelo do aparelho',
      'Descrição do problema',
    ];
    
    const containsBlacklist = blacklistPhrases.some(phrase => 
      messageBody.toLowerCase().includes(phrase.toLowerCase())
    );
    
    if (containsBlacklist) {
      console.log('🚫 LOOP BLOQUEADO: Contém frase de blacklist');
      return new Response(JSON.stringify({ success: true, skipped: 'blacklist' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // 2. Ignorar se tem muitos emojis (típico de bot) - aumentei para 8
    const emojiCount = (messageBody.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 8) {
      console.log('🚫 LOOP BLOQUEADO: Muitos emojis (bot):', emojiCount);
      return new Response(JSON.stringify({ success: true, skipped: 'too_many_emojis' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // 3. Ignorar mensagens muito curtas ou apenas emojis
    const cleanMessage = messageBody.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
    if (cleanMessage.length < 2) {
      console.log('⏭️ Ignorando mensagem muito curta ou apenas emojis');
      return new Response(JSON.stringify({ success: true, skipped: 'too_short' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // 4. Rate limiting - usar timestamp do payload
    const messageTimestamp = messagePayload?.timestamp || messagePayload?._data?.t || 0;
    const now = Math.floor(Date.now() / 1000);
    
    // Se a mensagem tem mais de 30 segundos, ignorar (possível replay)
    if (messageTimestamp && (now - messageTimestamp) > 30) {
      console.log('⏭️ Ignorando mensagem antiga (possível replay):', now - messageTimestamp, 'segundos');
      return new Response(JSON.stringify({ success: true, skipped: 'old_message' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // 4. Detectar se a mensagem é idêntica à última resposta que enviamos
    // (isso indica loop com outro bot que está copiando nossa resposta)
    
    // Detectar tipo de chat
    const isGroupMessage = from.endsWith('@g.us') || chatId.endsWith('@g.us');
    const isNewsletterChannel = from.endsWith('@newsletter') || chatId.endsWith('@newsletter');
    const isLidFormat = from.endsWith('@lid') || chatId.endsWith('@lid');
    // Considerar chat privado se termina com formatos conhecidos OU se contém número de telefone
    const isPrivateChat = from.endsWith('@c.us') || from.endsWith('@s.whatsapp.net') || 
                         chatId.endsWith('@c.us') || chatId.endsWith('@s.whatsapp.net') || 
                         isLidFormat ||
                         // Fallback: se tem telefone no 'from' e não é grupo, é privado
                         (!isGroupMessage && !isNewsletterChannel && /^\d+/.test(from));
    
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
    // O WAHA pode enviar diferentes formatos: @c.us, @s.whatsapp.net, @lid (linked device), @g.us (grupo)
    // Para @lid, precisamos tentar pegar o telefone real de _data.author ou chatId
    let phoneRaw = from;
    
    // Se é @lid (Linked Device ID), tentar pegar telefone real
    if (from.includes('@lid')) {
      // Tentar pegar de _data.author, chatId, ou participant
      const authorPhone = messagePayload?._data?.author?.replace(/@.*$/, '') || '';
      const chatIdPhone = chatId?.replace(/@.*$/, '') || '';
      const participantPhoneClean = participantPhone?.replace(/@.*$/, '') || '';
      
      // Usar o que parecer mais com telefone (10-13 dígitos, começando com 55 ou DDD)
      const possiblePhones = [authorPhone, chatIdPhone, participantPhoneClean].filter(p => {
        const digits = p.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 13;
      });
      
      phoneRaw = possiblePhones[0] || from;
      console.log('📱 @lid detectado, buscando telefone real:', { authorPhone, chatIdPhone, participantPhoneClean, escolhido: phoneRaw });
    }
    
    // Remover sufixos do WhatsApp
    phoneRaw = phoneRaw.replace(/@c\.us$/, '').replace(/@s\.whatsapp\.net$/, '').replace(/@lid$/, '').replace(/@g\.us$/, '');
    const cleanPhone = phoneRaw.replace(/\D/g, '');
    console.log('📱 Telefone final:', { from, phoneRaw, cleanPhone });
    
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
    
    // Verificar se auto-responder está ativado
    const autoEnabled = settingsMap['wa_auto_enabled'] !== 'false'; // Padrão: ativado
    if (!autoEnabled) {
      console.log('🚫 Auto-responder desativado nas configurações');
      return new Response(JSON.stringify({ success: true, skipped: 'auto_disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!geminiApiKey || !wahaUrl || !wahaApiKey) {
      console.error('❌ Configurações faltando - gemini:', !!geminiApiKey, 'waha:', !!wahaUrl, 'key:', !!wahaApiKey);
      return new Response(JSON.stringify({ success: false, error: 'Missing config' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Configurações OK - WAHA:', wahaUrl);

    // ====================
    // 🚨 PROTEÇÃO ANTI-LOOP - VERIFICAÇÃO NO BANCO
    // ====================
    
    // 5. Verificar se respondemos recentemente para este número (últimos 5 segundos)
    const { data: recentResponses } = await supabase
      .from('conversation_history')
      .select('content, timestamp')
      .eq('tenant_id', tenantId)
      .eq('phone', cleanPhone)
      .eq('role', 'assistant')
      .order('timestamp', { ascending: false })
      .limit(3);
    
    if (recentResponses && recentResponses.length > 0) {
      const lastResponse = recentResponses[0];
      const lastResponseTime = new Date(lastResponse.timestamp).getTime();
      const timeSinceLastResponse = Date.now() - lastResponseTime;
      
      // Se respondemos há menos de 5 segundos, ignorar
      if (timeSinceLastResponse < 5000) {
        console.log('⏳ Rate limit: respondemos há', Math.round(timeSinceLastResponse/1000), 'segundos - ignorando');
        return new Response(JSON.stringify({ success: true, skipped: 'rate_limited' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Verificar se a mensagem recebida é similar à nossa última resposta (loop)
      const similarity = (a: string, b: string) => {
        const wordsA = a.toLowerCase().split(/\s+/).slice(0, 10);
        const wordsB = b.toLowerCase().split(/\s+/).slice(0, 10);
        const matches = wordsA.filter(w => wordsB.includes(w)).length;
        return matches / Math.max(wordsA.length, wordsB.length);
      };
      
      const similarityScore = similarity(messageBody, lastResponse.content);
      if (similarityScore > 0.5) {
        console.log('🔄 LOOP DETECTADO! Mensagem similar à nossa resposta:', similarityScore.toFixed(2));
        return new Response(JSON.stringify({ success: true, skipped: 'loop_detected' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Verificar se recebemos a mesma mensagem múltiplas vezes (spam/loop)
      const { data: recentMessages } = await supabase
        .from('conversation_history')
        .select('content')
        .eq('tenant_id', tenantId)
        .eq('phone', cleanPhone)
        .eq('role', 'user')
        .order('timestamp', { ascending: false })
        .limit(5);
      
      if (recentMessages) {
        const sameMessageCount = recentMessages.filter(m => 
          similarity(m.content, messageBody) > 0.8
        ).length;
        
        if (sameMessageCount >= 3) {
          console.log('🔄 SPAM/LOOP DETECTADO! Mesma mensagem', sameMessageCount, 'vezes');
          return new Response(JSON.stringify({ success: true, skipped: 'spam_detected' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }
    
    console.log('✅ Proteção anti-loop: OK');

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
    const cleanOwnerPhone = ownerPhone?.replace(/\D/g, '') || '';
    const isOwnerByPhone = cleanOwnerPhone && phonesMatch(cleanPhone, cleanOwnerPhone);
    const ownerEmail = settingsMap['wa_owner_email'] || '';
    console.log('🔐 Owner check DETALHADO:', { 
      ownerPhoneRaw: ownerPhone, 
      ownerPhoneClean: cleanOwnerPhone,
      cleanPhoneIncoming: cleanPhone,
      last8Owner: cleanOwnerPhone.slice(-8),
      last8Incoming: cleanPhone.slice(-8),
      isOwnerByPhone, 
      requireEmailVerification 
    });
    
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
    // 4.4 BUSCAR CONFIGURAÇÕES DE IA AVANÇADA
    // ====================
    const aiExecutiveMode = settingsMap['ai_executive_mode'] === 'true';
    const aiProactiveSuggestions = settingsMap['ai_proactive_suggestions'] === 'true';
    const aiBackgroundAnalysis = settingsMap['ai_background_analysis'] === 'true';
    const aiLearningEnabled = settingsMap['ai_learning_enabled'] === 'true';
    
    console.log('🧠 IA Avançada:', { aiExecutiveMode, aiProactiveSuggestions, aiBackgroundAnalysis, aiLearningEnabled });

    // ====================
    // 4.5 ANÁLISE EM BACKGROUND (cobranças vencidas, alertas, etc)
    // ====================
    let backgroundAlerts: string[] = [];
    
    if (aiBackgroundAnalysis && customerData) {
      // Verificar cobranças vencidas
      const overdueCharges = customerData.customer_charges?.filter((c: any) => c.status === 'overdue') || [];
      if (overdueCharges.length > 0) {
        const totalOverdue = overdueCharges.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
        backgroundAlerts.push(`⚠️ ATENÇÃO: Cliente tem ${overdueCharges.length} cobrança(s) VENCIDA(S) totalizando R$ ${totalOverdue.toFixed(2).replace('.', ',')}`);
      }
      
      // Verificar vencimentos próximos (7 dias)
      const today = new Date();
      const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingCharges = customerData.customer_charges?.filter((c: any) => {
        if (c.status !== 'pending') return false;
        const dueDate = new Date(c.due_date);
        return dueDate >= today && dueDate <= in7Days;
      }) || [];
      
      if (upcomingCharges.length > 0) {
        backgroundAlerts.push(`📅 Cliente tem ${upcomingCharges.length} fatura(s) vencendo nos próximos 7 dias`);
      }
      
      // Verificar se é cliente novo (menos de 7 dias)
      if (memory && memory.messages_count <= 3) {
        backgroundAlerts.push('🆕 Este é um cliente NOVO ou com poucas interações - seja acolhedor!');
      }
    }
    
    // Análise para ADMIN/OWNER
    if (aiBackgroundAnalysis && (memory?.permission_level === 'OWNER' || memory?.permission_level === 'ADMIN')) {
      // Buscar métricas rápidas
      const { count: pendingChargesCount } = await supabase
        .from('customer_charges')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'pending');
      
      const { count: overdueCount } = await supabase
        .from('customer_charges')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'overdue');
      
      if ((overdueCount || 0) > 0) {
        backgroundAlerts.push(`📊 ADMIN: Há ${overdueCount} cobranças VENCIDAS no sistema`);
      }
      if ((pendingChargesCount || 0) > 10) {
        backgroundAlerts.push(`📊 ADMIN: ${pendingChargesCount} cobranças pendentes aguardando envio`);
      }
    }

    // ====================
    // 4.6 SISTEMA DE APRENDIZADO
    // ====================
    if (aiLearningEnabled && memory) {
      try {
        // Salvar padrão de interação (horário, canal, intenção)
        const hour = new Date().getHours();
        const timeSlot = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
        
        await supabase.from('expense_ai_learning').upsert({
          tenant_id: tenantId,
          type: 'interaction_pattern',
          key: `phone_${cleanPhone}_time`,
          value: timeSlot,
          confidence: 0.7,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,type,key' });
        
        // Salvar canal preferido
        await supabase.from('expense_ai_learning').upsert({
          tenant_id: tenantId,
          type: 'channel_preference',
          key: `phone_${cleanPhone}`,
          value: 'whatsapp',
          confidence: 0.9,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,type,key' });
        
      } catch (learnError) {
        console.log('⚠️ Erro no sistema de aprendizado:', learnError);
      }
    }

    // ====================
    // 4.7 FASE C: DETECTAR INTENÇÃO
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

    // REGRA CRÍTICA: TRANSFERÊNCIA PARA ATENDENTE
    systemPrompt += `\n\n🚫🚫🚫 REGRA SOBRE TRANSFERIR PARA ATENDENTE 🚫🚫🚫
⛔ NUNCA use [ACTION:transfer_human] automaticamente!
⛔ SOMENTE transfira se o cliente disser EXATAMENTE: "falar com atendente", "quero um humano", "pessoa real", "atendente humano"
⛔ "Links" NÃO é pedido de atendente!
⛔ "Sou master" NÃO é pedido de atendente!
⛔ Perguntas gerais NÃO são pedido de atendente!
⛔ RESPONDA a pergunta! NÃO transfira só porque não sabe!
✅ Sempre tente resolver a dúvida PRIMEIRO
✅ Só ofereça atendente se o cliente pedir explicitamente`;

    // REGRA CRÍTICA: NÃO INVENTAR DADOS
    systemPrompt += `\n\n🚨🚨🚨 REGRA SUPREMA - LEIA COM ATENÇÃO 🚨🚨🚨
⛔ NUNCA, EM HIPÓTESE ALGUMA, INVENTE:
   - Preços ou valores
   - Nomes de planos ou serviços
   - Recursos ou funcionalidades
   - Promoções ou descontos
   - CHAVES PIX (EXTREMAMENTE PROIBIDO!)
   
✅ Use APENAS os dados fornecidos abaixo nas seções "DADOS REAIS".
✅ Se não houver dados cadastrados, diga: "No momento ainda não temos ofertas cadastradas no sistema."
✅ Se perguntarem algo que não está nos dados, diga que vai verificar.`;

    // REGRA ESPECÍFICA PARA PIX
    const configuredPixKey = settingsMap['default_pix_key'] || settingsMap['wa_pix_key'] || '';
    if (configuredPixKey) {
      systemPrompt += `\n\n💳 === REGRA ABSOLUTA SOBRE PIX ===`;
      systemPrompt += `\n🚫🚫🚫 PROIBIDO ESCREVER QUALQUER CHAVE PIX NA SUA RESPOSTA! 🚫🚫🚫`;
      systemPrompt += `\n⛔ NÃO escreva números de CNPJ, CPF, email ou telefone como chave PIX!`;
      systemPrompt += `\n⛔ NÃO invente chaves como "03207303000125" ou qualquer outra!`;
      systemPrompt += `\n✅ SEMPRE que pedirem PIX, APENAS use: [ACTION:generate_pix]`;
      systemPrompt += `\n✅ O sistema vai enviar a chave correta automaticamente!`;
      systemPrompt += `\n⚠️ APÓS o PIX ser enviado, NÃO repita informações! Apenas pergunte: "Posso ajudar com mais alguma coisa?"`;
    } else {
      systemPrompt += `\n\n💳 === PIX NÃO CONFIGURADO ===`;
      systemPrompt += `\n⚠️ Chave PIX NÃO está cadastrada no sistema!`;
      systemPrompt += `\n⚠️ Se pedirem PIX, diga: "No momento não temos chave PIX configurada. Vou transferir para um atendente."`;
      systemPrompt += `\n⚠️ E use [ACTION:transfer_human] para transferir!`;
    }

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
      systemPrompt += `\n💡 AÇÃO: SOMENTE use [ACTION:transfer_human] se o cliente EXPLICITAMENTE pedir para falar com atendente/humano!`;
      systemPrompt += `\n⚠️ NÃO transfira automaticamente! Pergunte primeiro se deseja falar com um atendente.`;
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
      systemPrompt += `\n\n=== SERVIÇOS DISPONÍVEIS (DADOS REAIS) ===`;
      for (const svc of services) {
        const price = svc.price ? `R$ ${svc.price.toFixed(2).replace('.', ',')}` : 'Sob consulta';
        systemPrompt += `\n- ${svc.name}: ${svc.description || 'Sem descrição'} | Preço: ${price}`;
      }
    } else {
      systemPrompt += `\n\n=== SERVIÇOS ===`;
      systemPrompt += `\n⚠️ NENHUM SERVIÇO CADASTRADO NO MOMENTO.`;
      systemPrompt += `\n💡 Se perguntarem sobre serviços/preços, informe que ainda não há ofertas disponíveis no catálogo.`;
    }

    // 5.5 Planos
    if (plans && plans.length > 0) {
      systemPrompt += `\n\n=== PLANOS DISPONÍVEIS (DADOS REAIS) ===`;
      for (const plan of plans) {
        const price = plan.price ? `R$ ${plan.price.toFixed(2).replace('.', ',')}` : 'Sob consulta';
        systemPrompt += `\n- ${plan.name}: ${plan.description || ''} | ${price}/${plan.billing_cycle || 'mensal'}`;
        if (plan.features) {
          systemPrompt += ` | Recursos: ${JSON.stringify(plan.features)}`;
        }
      }
    } else {
      systemPrompt += `\n\n=== PLANOS ===`;
      systemPrompt += `\n⚠️ NENHUM PLANO CADASTRADO NO MOMENTO.`;
    }
    
    // INSTRUÇÃO CRÍTICA: NÃO INVENTAR VALORES
    const hasAnyData = (services && services.length > 0) || (plans && plans.length > 0);
    if (!hasAnyData) {
      systemPrompt += `\n\n🚨 INSTRUÇÃO CRÍTICA: NÃO HÁ SERVIÇOS OU PLANOS CADASTRADOS!`;
      systemPrompt += `\n⛔ NUNCA invente preços, valores ou nomes de planos.`;
      systemPrompt += `\n⛔ Se perguntarem sobre preços/planos, diga: "No momento ainda não temos ofertas cadastradas no sistema. Por favor, entre em contato com a equipe para mais informações."`;
    } else {
      systemPrompt += `\n\n⚠️ REGRA ABSOLUTA: Use APENAS os dados listados acima!`;
      systemPrompt += `\n⛔ NUNCA invente preços, planos ou serviços que não estejam listados.`;
      systemPrompt += `\n⛔ Se não encontrar o que o cliente pergunta, diga que verificará ou que não está no catálogo.`;
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

    // ====================
    // 5.10 ALERTAS DE BACKGROUND (ANÁLISE INTELIGENTE)
    // ====================
    if (backgroundAlerts.length > 0) {
      systemPrompt += `\n\n🔔 === ALERTAS IMPORTANTES ===`;
      for (const alert of backgroundAlerts) {
        systemPrompt += `\n${alert}`;
      }
      systemPrompt += `\n\n💡 Use esses alertas para guiar a conversa de forma proativa!`;
    }

    // ====================
    // 5.11 SUGESTÕES PROATIVAS
    // ====================
    if (aiProactiveSuggestions) {
      systemPrompt += `\n\n=== MODO SUGESTÕES PROATIVAS ATIVO ===`;
      systemPrompt += `\nAo final de CADA resposta, inclua 2-3 sugestões relevantes:`;
      systemPrompt += `\n\n💡 *O que mais posso ajudar?*`;
      
      // Sugestões baseadas no contexto
      if (customerData && !customerData.customer_charges?.some((c: any) => c.status === 'pending' || c.status === 'overdue')) {
        systemPrompt += `\n• "Ver meus serviços" → [ACTION:show_services]`;
      }
      if (customerData?.customer_charges?.some((c: any) => c.status === 'pending' || c.status === 'overdue')) {
        systemPrompt += `\n• "Ver minhas faturas" → [ACTION:show_charges]`;
        systemPrompt += `\n• "Gerar PIX" → [ACTION:generate_pix]`;
      }
      if (!customerData) {
        systemPrompt += `\n• "Conhecer planos"`;
        systemPrompt += `\n• "Me cadastrar"`;
      }
      
      systemPrompt += `\n\n⚡ Inclua sempre sugestões para manter a conversa fluindo!`;
    }

    // ====================
    // 5.12 MODO EXECUTIVO
    // ====================
    if (aiExecutiveMode) {
      systemPrompt += `\n\n=== MODO EXECUTIVO ATIVO ===`;
      systemPrompt += `\n🚀 Você está no modo EXECUTIVO - seja mais direto e ágil:`;
      systemPrompt += `\n• NÃO pergunte "posso ajudar?" - já vá ajudando`;
      systemPrompt += `\n• NÃO peça confirmação para ações de visualização`;
      systemPrompt += `\n• Seja conciso - máximo 2 parágrafos por resposta`;
      systemPrompt += `\n• Execute ações automaticamente quando for óbvio`;
      systemPrompt += `\n• Se o cliente perguntar sobre cobrança, já execute [ACTION:show_charges]`;
      systemPrompt += `\n• Se pedir PIX, já execute [ACTION:generate_pix]`;
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
    let skipAIReply = false; // Flag para pular resposta da IA quando ação já enviou mensagens
    
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
            // LÓGICA INTELIGENTE DE PIX - BUSCA DAS CONFIGURAÇÕES
            const pixKey = settingsMap['default_pix_key'] || settingsMap['wa_pix_key'] || '';
            const pixHolderName = settingsMap['pix_holder_name'] || settingsMap['ai_company_name'] || 'Empresa';
            
            // USAR TIPO CONFIGURADO (prioridade) ou auto-detectar como fallback
            const configuredPixType = settingsMap['pix_key_type'] || '';
            
            const detectPixKeyType = (key: string): string => {
              // Se tem tipo configurado, usar ele!
              if (configuredPixType) return configuredPixType;
              
              // Fallback: auto-detectar apenas para CNPJ e E-mail (únicos que não conflitam)
              const cleanKey = key.replace(/\D/g, '');
              // CNPJ: 14 dígitos (único caso sem ambiguidade)
              if (/^\d{14}$/.test(cleanKey)) return 'CNPJ';
              // E-mail (único caso sem ambiguidade)
              if (key.includes('@') && key.includes('.')) return 'E-mail';
              // Chave aleatória (32 caracteres hexadecimais ou UUID)
              if (/^[a-f0-9-]{32,36}$/i.test(key)) return 'Chave Aleatória';
              // CPF ou Telefone: 11 dígitos - NÃO DÁ PARA SABER, retornar genérico
              return 'PIX';
            };
            
            const pixKeyType = detectPixKeyType(pixKey);
            
            // SE NÃO TEM PIX CONFIGURADO - TRANSFERIR PARA SUPORTE
            if (!pixKey) {
              console.log('⚠️ Chave PIX não configurada - transferindo para suporte');
              actionResult = '\n\n⚠️ No momento não temos chave PIX configurada no sistema. Vou transferir você para um atendente que poderá ajudar!';
              
              // Notificar admin
              const adminPhonePix = settingsMap['wa_owner_phone'] || '';
              if (adminPhonePix) {
                const cleanAdminPix = adminPhonePix.replace(/\D/g, '');
                const pixNotifyMsg = `🔔 *SOLICITAÇÃO DE PIX*\n\n👤 Cliente: ${contactName || cleanPhone}\n📱 Telefone: ${cleanPhone}\n⚠️ PIX não configurado no sistema!`;
                try {
                  await fetch(`${wahaUrl}/api/sendText`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
                    body: JSON.stringify({ session: sessionName, chatId: `${cleanAdminPix}@c.us`, text: pixNotifyMsg }),
                  });
                } catch (e) { console.log('⚠️ Erro ao notificar admin sobre PIX'); }
              }
              break;
            }
            
            // TEM PIX CONFIGURADO - ENVIAR 2 MENSAGENS
            const sendPixKey = async () => {
              const sendChatIdPix = from.includes('@') ? from : `${from}@c.us`;
              
              // MENSAGEM 1: Formatada completa com a chave
              const pixMsg = `💳 *Chave PIX para pagamento:*\n\n📋 *Tipo:* ${pixKeyType}\n👤 *Titular:* ${pixHolderName}\n🔑 *Chave:* ${pixKey}`;
              
              await fetch(`${wahaUrl}/api/sendText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
                body: JSON.stringify({ session: sessionName, chatId: sendChatIdPix, text: pixMsg }),
              });
              
              // Pequeno delay para garantir ordem
              await new Promise(r => setTimeout(r, 500));
              
              // MENSAGEM 2: APENAS A CHAVE SOLTA (facilita copiar)
              await fetch(`${wahaUrl}/api/sendText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
                body: JSON.stringify({ session: sessionName, chatId: sendChatIdPix, text: pixKey }),
              });
              
              console.log('✅ Chave PIX enviada:', pixKey, '| Tipo:', pixKeyType, '| Titular:', pixHolderName);
            };
            
            // Verificar se cliente está cadastrado
            if (customerData && customerData.id) {
              // Cliente cadastrado - verificar se tem cobranças pendentes
              const pendingChargesForPix = customerData.customer_charges?.filter((c: any) => 
                c.status === 'pending' || c.status === 'overdue'
              ) || [];
              
              if (pendingChargesForPix.length > 0) {
                // Tem faturas pendentes - mostrar e perguntar
                const totalPending = pendingChargesForPix.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
                const formattedTotal = `R$ ${totalPending.toFixed(2).replace('.', ',')}`;
                
                actionResult = `\n\n💳 *Olá ${customerData.full_name?.split(' ')[0] || 'Cliente'}!*`;
                actionResult += `\n\nVocê possui ${pendingChargesForPix.length} fatura(s) pendente(s), totalizando *${formattedTotal}*.`;
                actionResult += `\n\n📝 *Suas faturas:*`;
                for (const charge of pendingChargesForPix.slice(0, 3)) {
                  const amount = `R$ ${charge.amount.toFixed(2).replace('.', ',')}`;
                  const dueDate = new Date(charge.due_date).toLocaleDateString('pt-BR');
                  const status = charge.status === 'overdue' ? '⚠️ VENCIDO' : '📅';
                  actionResult += `\n${status} ${charge.description}: ${amount} (venc: ${dueDate})`;
                }
                
                // Enviar a chave PIX também
                await sendPixKey();
                actionResult += `\n\n✅ Chave PIX enviada! Posso ajudar com mais alguma coisa?`;
                
                // Marcar para não enviar resposta duplicada da IA
                skipAIReply = true;
                replyText = actionResult.trim();
                
                // Salvar contexto
                if (memory) {
                  await supabase.from('chat_memory').update({
                    metadata: { ...memory.metadata, pix_sent: true, pending_amount: totalPending }
                  }).eq('id', memory.id);
                }
              } else {
                // Cliente sem faturas - enviar apenas a chave PIX
                await sendPixKey();
                // Mensagem simples e direta
                skipAIReply = true;
                replyText = '✅ Chave PIX enviada! Posso ajudar com mais alguma coisa?';
              }
            } else {
              // Cliente NÃO cadastrado - enviar apenas a chave PIX
              await sendPixKey();
              // Mensagem simples e direta
              skipAIReply = true;
              replyText = '✅ Chave PIX enviada!\n\n💡 Após o pagamento, envie o comprovante aqui para confirmação.';
            }
            break;
            
          case 'transfer_human':
            // TRANSFERIR PARA ATENDENTE HUMANO COM NOTIFICAÇÃO
            const adminPhone = settingsMap['wa_owner_phone'] || settingsMap['wa_admin_phone'] || '';
            const cleanAdminPhone = adminPhone.replace(/\D/g, '');
            
            // Atualizar memória para indicar que precisa de atendimento humano
            if (memory) {
              await supabase.from('chat_memory').update({
                metadata: { 
                  ...memory.metadata, 
                  needs_human: true, 
                  requested_at: new Date().toISOString(),
                  reason: actionData.reason || messageBody
                }
              }).eq('id', memory.id);
            }
            
            // Notificar o admin/owner via WhatsApp
            if (cleanAdminPhone) {
              const clienteName = customerData?.full_name || contactName || 'Cliente';
              const clientePhone = cleanPhone;
              const motivo = actionData.reason || 'Solicitou atendimento humano';
              
              const adminMessage = `🔔 *ATENDIMENTO SOLICITADO*\n\n` +
                `👤 *Cliente:* ${clienteName}\n` +
                `📱 *Telefone:* ${clientePhone}\n` +
                `💬 *Motivo:* ${motivo}\n` +
                `⏰ *Horário:* ${new Date().toLocaleString('pt-BR')}\n\n` +
                `📝 *Última mensagem:*\n${messageBody.substring(0, 200)}...`;
              
              try {
                await fetch(`${wahaUrl}/api/sendText`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
                  body: JSON.stringify({
                    session: sessionName,
                    chatId: `${cleanAdminPhone}@c.us`,
                    text: adminMessage
                  }),
                });
                console.log('✅ Admin notificado:', cleanAdminPhone);
              } catch (notifyError) {
                console.log('⚠️ Erro ao notificar admin:', notifyError);
              }
              
              actionResult = '\n\n👤 Entendido! Já notifiquei um atendente sobre sua solicitação. Em breve alguém entrará em contato!';
            } else {
              actionResult = '\n\n👤 Certo! Um atendente humano entrará em contato em breve.';
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
    // 8.7 SISTEMA DE APRENDIZADO - APÓS RESPOSTA
    // ====================
    if (aiLearningEnabled && intent) {
      try {
        // Aprender padrão de intenção para este contato
        const intentKey = `phone_${cleanPhone}_intent_${intent}`;
        
        // Incrementar confiança para este padrão
        const { data: existingPattern } = await supabase
          .from('expense_ai_learning')
          .select('confidence')
          .eq('tenant_id', tenantId)
          .eq('type', 'intent_pattern')
          .eq('key', intentKey)
          .maybeSingle();
        
        const newConfidence = Math.min((existingPattern?.confidence || 0) + 0.1, 1.0);
        
        await supabase.from('expense_ai_learning').upsert({
          tenant_id: tenantId,
          type: 'intent_pattern',
          key: intentKey,
          value: intent,
          confidence: newConfidence,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,type,key' });
        
        // Se ação foi executada, aprender padrão mensagem → ação
        if (actionMatch) {
          const actionType = actionMatch[1];
          const messagePattern = messageBody.toLowerCase().substring(0, 50);
          
          await supabase.from('expense_ai_learning').upsert({
            tenant_id: tenantId,
            type: 'action_pattern',
            key: `msg_${messagePattern.replace(/[^a-z0-9]/g, '_')}`,
            value: actionType,
            confidence: 0.8,
            updated_at: new Date().toISOString()
          }, { onConflict: 'tenant_id,type,key' });
        }
        
        console.log('🧠 Padrão aprendido:', intent);
      } catch (learnError) {
        console.log('⚠️ Erro no aprendizado pós-resposta:', learnError);
      }
    }

    // ====================
    // 9. FILTRO DE SEGURANÇA - REMOVER PIX INVENTADO
    // ====================
    // Se a IA inventou uma chave PIX diferente da configurada, remover
    const realPixKey = settingsMap['default_pix_key'] || settingsMap['wa_pix_key'] || '';
    
    // Padrões de PIX inventado (CNPJ, CPF, email, telefone que não seja a chave real)
    const fakePixPatterns = [
      /A chave PIX.*é:?\s*[\d\.\-\/]+/gi,
      /Chave:?\s*\`?[\d]{11,14}\`?/gi,  // CNPJ/CPF
      /PIX:?\s*[\d]{11,14}/gi,
      /03207303000125/g,  // CNPJ específico que está aparecendo errado
      /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g,  // CNPJ formatado
      /\d{3}\.\d{3}\.\d{3}-\d{2}/g,  // CPF formatado
    ];
    
    let cleanedReply = replyText;
    for (const pattern of fakePixPatterns) {
      if (realPixKey && cleanedReply.match(pattern)) {
        const match = cleanedReply.match(pattern)?.[0];
        // Só remove se NÃO for a chave real
        if (match && !match.includes(realPixKey.replace(/\D/g, ''))) {
          console.log('🚫 Removendo PIX inventado:', match);
          cleanedReply = cleanedReply.replace(pattern, '[PIX será enviado separadamente]');
        }
      }
    }
    replyText = cleanedReply;

    // ====================
    // 10. ENVIAR RESPOSTA VIA WAHA (apenas se não foi skipAIReply)
    // ====================
    const sendChatId = from.includes('@') ? from : `${from}@c.us`;
    
    // Se skipAIReply=true, a ação já enviou as mensagens necessárias
    // Apenas enviar se tiver conteúdo útil
    if (!skipAIReply || replyText.trim().length > 10) {
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
    } else {
      console.log('⏭️ skipAIReply ativo, ação já enviou mensagens');
    }

    // ====================
    // 11. LÓGICA DE AVALIAÇÃO (PEDIR 1X APÓS ATENDIMENTO)
    // ====================
    try {
      // Condições para pedir avaliação:
      // 1. Configuração habilitada
      // 2. Pelo menos 3 mensagens trocadas
      // 3. Não pediu avaliação nos últimos 7 dias
      // 4. Intenção atual indica fim de atendimento (thanks, handoff resolvido, etc)
      
      const askRatingEnabled = settingsMap['wa_ask_rating'] !== 'false'; // Padrão: habilitado
      const finishIntents = ['thanks', 'goodbye', 'rejection'];
      const isFinishingConversation = finishIntents.includes(intent) || 
        messageBody.toLowerCase().match(/obrigad[oa]|valeu|vlw|brigad[oa]|tchau|até|falou|resolvido|era isso/);
      
      if (askRatingEnabled && memory && isFinishingConversation) {
        const messagesCount = memory.messages_count || 0;
        const lastRatingAsked = memory.metadata?.last_rating_asked;
        const daysSinceLastRating = lastRatingAsked 
          ? Math.floor((Date.now() - new Date(lastRatingAsked).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        
        // Se tem pelo menos 3 mensagens E não pediu avaliação nos últimos 7 dias
        if (messagesCount >= 3 && daysSinceLastRating >= 7) {
          console.log('⭐ Enviando pedido de avaliação...');
          
          // Aguardar um pouco para não parecer automático demais
          await new Promise(r => setTimeout(r, 2000));
          
          const ratingMessage = `⭐ *Sua opinião é importante!*\n\nComo foi seu atendimento hoje?\n\n` +
            `1️⃣ - Péssimo 😠\n` +
            `2️⃣ - Ruim 😕\n` +
            `3️⃣ - Regular 😐\n` +
            `4️⃣ - Bom 🙂\n` +
            `5️⃣ - Excelente 😍\n\n` +
            `_Responda com o número de 1 a 5_`;
          
          await fetch(`${wahaUrl}/api/sendText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
            body: JSON.stringify({ session: sessionName, chatId: sendChatId, text: ratingMessage }),
          });
          
          // Marcar que pediu avaliação
          await supabase.from('chat_memory').update({
            metadata: { 
              ...memory.metadata, 
              last_rating_asked: new Date().toISOString(),
              awaiting_rating: true
            }
          }).eq('id', memory.id);
          
          console.log('✅ Pedido de avaliação enviado!');
        }
      }
      
      // Verificar se está respondendo à avaliação
      if (memory?.metadata?.awaiting_rating) {
        const ratingMatch = messageBody.match(/^[1-5]$/);
        if (ratingMatch) {
          const rating = parseInt(ratingMatch[0]);
          console.log('⭐ Avaliação recebida:', rating);
          
          // Salvar avaliação
          await supabase.from('chat_ratings').insert({
            tenant_id: tenantId,
            phone: cleanPhone,
            customer_id: customerData?.id || null,
            rating: rating,
            created_at: new Date().toISOString()
          });
          
          // Limpar flag de aguardando
          await supabase.from('chat_memory').update({
            metadata: { ...memory.metadata, awaiting_rating: false, last_rating: rating }
          }).eq('id', memory.id);
          
          // Agradecer
          const thankMessages: Record<number, string> = {
            1: '😔 Sentimos muito pela experiência. Vamos melhorar!',
            2: '😕 Obrigado pelo feedback. Vamos trabalhar para melhorar!',
            3: '😐 Obrigado pela avaliação! Sempre buscamos melhorar.',
            4: '🙂 Fico feliz que gostou! Obrigado pelo feedback!',
            5: '😍 Que alegria! Muito obrigado pela avaliação! ⭐'
          };
          
          await fetch(`${wahaUrl}/api/sendText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
            body: JSON.stringify({ session: sessionName, chatId: sendChatId, text: thankMessages[rating] || 'Obrigado!' }),
          });
        }
      }
    } catch (ratingError) {
      console.log('⚠️ Erro na lógica de avaliação:', ratingError);
    }

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
