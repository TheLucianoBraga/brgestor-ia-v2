import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// VERSION: 3 - Deploy: 2026-01-11 19:23:36

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========================================
// FUNÇÃO: Baixar mídia do WAHA e fazer upload para Supabase Storage
// Retorna URL pública que a IA consegue acessar
// ========================================
async function downloadAndUploadMedia(
  supabase: any,
  wahaUrl: string,
  wahaApiKey: string,
  sessionName: string,
  messageId: string,
  tenantId: string,
  mediaType: string
): Promise<{ url: string; mimeType: string; base64: string } | null> {
  try {
    console.log(`📥 [MEDIA_BRIDGE] Iniciando download - Session: ${sessionName}, MessageID: ${messageId}, Type: ${mediaType}`);
    
    // 1. Baixar do WAHA - Tentar múltiplos endpoints (suporte WAHA PLUS)
    const possibleUrls = [
      `${wahaUrl}/api/${sessionName}/messages/${messageId}/download`,  // WAHA padrão
      `${wahaUrl}/api/messages/${messageId}/media`,                    // WAHA PLUS formato 1
      `${wahaUrl}/api/${sessionName}/media/${messageId}`,              // WAHA PLUS formato 2
      `${wahaUrl}/api/downloadMedia/${sessionName}/${messageId}`,      // WAHA PLUS formato 3
    ];
    
    let downloadResponse: Response | null = null;
    let successUrl: string | null = null;
    
    for (const downloadUrl of possibleUrls) {
      console.log(`📥 [MEDIA_BRIDGE] Tentando URL: ${downloadUrl}`);
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: { 'X-Api-Key': wahaApiKey },
      });
      
      if (response.ok) {
        downloadResponse = response;
        successUrl = downloadUrl;
        console.log(`✅ [MEDIA_BRIDGE] URL funcionou: ${downloadUrl}`);
        break;
      } else {
        console.log(`⚠️ [MEDIA_BRIDGE] URL falhou (${response.status}): ${downloadUrl}`);
      }
    }
    
    if (!downloadResponse) {
      console.error(`❌ [MEDIA_BRIDGE] Nenhuma URL de download funcionou. Testadas: ${possibleUrls.length}`);
      return null;
    }
    
    const downloadData = await downloadResponse.json();
    console.log(`📦 [MEDIA_BRIDGE] Dados recebidos:`, {
      hasMimetype: !!downloadData.mimetype,
      hasData: !!downloadData.data,
      dataLength: downloadData.data?.length || 0,
      mimetype: downloadData.mimetype
    });
    
    if (!downloadData.mimetype || !downloadData.data) {
      console.error('❌ [MEDIA_BRIDGE] Dados incompletos - mimetype ou data ausentes');
      return null;
    }
    
    const base64Data = downloadData.data;
    const mimeType = downloadData.mimetype;
    console.log(`✅ [MEDIA_BRIDGE] Download OK: ${mimeType}, ${base64Data.length} chars base64`);
    
    // 2. Converter base64 para bytes
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // 3. Determinar extensão do arquivo
    const extMap: Record<string, string> = {
      'audio/ogg': 'ogg',
      'audio/opus': 'opus',
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/aac': 'aac',
      'audio/amr': 'amr',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
    };
    // Limpar mimetype (remover parâmetros como ; codecs=opus)
    const cleanMimeType = mimeType.split(';')[0].trim();
    const ext = extMap[cleanMimeType] || cleanMimeType.split('/')[1] || 'bin';
    const fileName = `${tenantId}/${Date.now()}_${messageId.substring(0, 8)}.${ext}`;
    
    // 4. Upload para Supabase Storage
    console.log(`📤 [MEDIA_BRIDGE] Upload para whatsapp_media/${fileName}`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('whatsapp_media')
      .upload(fileName, bytes, {
        contentType: mimeType,
        upsert: true,
      });
    
    if (uploadError) {
      console.error('❌ [MEDIA_BRIDGE] Erro upload Supabase:', uploadError);
      return null;
    }
    
    // 5. Obter URL pública
    const { data: publicUrlData } = supabase.storage
      .from('whatsapp_media')
      .getPublicUrl(fileName);
    
    const publicUrl = publicUrlData?.publicUrl;
    console.log(`✅ [MEDIA_BRIDGE] URL pública: ${publicUrl}`);
    
    return {
      url: publicUrl,
      mimeType,
      base64: base64Data,
    };
  } catch (error) {
    console.error('❌ [MEDIA_BRIDGE] Erro geral:', error);
    return null;
  }
}

// Saudação baseada no horário (Brasil)
function getPeriodoDia(): string {
  const now = new Date();
  const brasilOffset = -3 * 60;
  const utcOffset = now.getTimezoneOffset();
  const brasilTime = new Date(now.getTime() + (utcOffset + brasilOffset) * 60 * 1000);
  const hora = brasilTime.getHours();
  
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

// Interface para dados de variáveis
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

// Interface para memória de chat
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

// Processa variáveis do template
function processTemplate(template: string, vars: TemplateVariables = {}): string {
  const firstName = vars.customerFirstName || vars.customerName?.split(' ')[0] || '';
  const fullName = vars.customerName || '';
  
  const formatCurrency = (value?: number | null): string => {
    if (value === null || value === undefined) return '';
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };
  
  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };
  
  const translateStatus = (status?: string | null): string => {
    if (!status) return '';
    const statusMap: Record<string, string> = {
      'active': 'Ativo',
      'pending': 'Pendente',
      'expired': 'Expirado',
      'cancelled': 'Cancelado',
      'suspended': 'Suspenso',
    };
    return statusMap[status] || status;
  };
  
  let result = template
    .replace(/\{\{periodo_dia\}\}/gi, getPeriodoDia())
    .replace(/\{periodo_dia\}/gi, getPeriodoDia())
    .replace(/\{\{nome\}\}/gi, fullName)
    .replace(/\{nome\}/gi, fullName)
    .replace(/\{\{primeiro_nome\}\}/gi, firstName)
    .replace(/\{primeiro_nome\}/gi, firstName)
    .replace(/\{\{nome_cliente\}\}/gi, fullName)
    .replace(/\{nome_cliente\}/gi, fullName)
    .replace(/\{\{whatsapp\}\}/gi, vars.customerWhatsapp || '')
    .replace(/\{whatsapp\}/gi, vars.customerWhatsapp || '')
    .replace(/\{\{email\}\}/gi, vars.customerEmail || '')
    .replace(/\{email\}/gi, vars.customerEmail || '')
    .replace(/\{\{cpf\}\}/gi, vars.customerCpfCnpj || '')
    .replace(/\{cpf\}/gi, vars.customerCpfCnpj || '')
    .replace(/\{\{cpf_cnpj\}\}/gi, vars.customerCpfCnpj || '')
    .replace(/\{cpf_cnpj\}/gi, vars.customerCpfCnpj || '')
    .replace(/\{\{status_cliente\}\}/gi, translateStatus(vars.customerStatus))
    .replace(/\{status_cliente\}/gi, translateStatus(vars.customerStatus))
    .replace(/\{\{servico\}\}/gi, vars.serviceName || '')
    .replace(/\{servico\}/gi, vars.serviceName || '')
    .replace(/\{\{produto\}\}/gi, vars.serviceName || '')
    .replace(/\{produto\}/gi, vars.serviceName || '')
    .replace(/\{\{valor\}\}/gi, formatCurrency(vars.servicePrice))
    .replace(/\{valor\}/gi, formatCurrency(vars.servicePrice))
    .replace(/\{\{preco\}\}/gi, formatCurrency(vars.servicePrice))
    .replace(/\{preco\}/gi, formatCurrency(vars.servicePrice))
    .replace(/\{\{desconto\}\}/gi, formatCurrency(vars.serviceDiscount))
    .replace(/\{desconto\}/gi, formatCurrency(vars.serviceDiscount))
    .replace(/\{\{vencimento\}\}/gi, formatDate(vars.serviceDueDate))
    .replace(/\{vencimento\}/gi, formatDate(vars.serviceDueDate))
    .replace(/\{\{validade\}\}/gi, formatDate(vars.serviceExpiresAt))
    .replace(/\{validade\}/gi, formatDate(vars.serviceExpiresAt))
    .replace(/\{\{status_servico\}\}/gi, translateStatus(vars.serviceStatus))
    .replace(/\{status_servico\}/gi, translateStatus(vars.serviceStatus))
    .replace(/\{\{empresa\}\}/gi, vars.tenantName || '')
    .replace(/\{empresa\}/gi, vars.tenantName || '')
    .replace(/\{\{link_cadastro\}\}/gi, vars.linkCadastro || vars.linkCliente || '')
    .replace(/\{link_cadastro\}/gi, vars.linkCadastro || vars.linkCliente || '')
    .replace(/\{\{link_cliente\}\}/gi, vars.linkCliente || '')
    .replace(/\{link_cliente\}/gi, vars.linkCliente || '')
    .replace(/\{\{link_revenda\}\}/gi, vars.linkRevenda || '')
    .replace(/\{link_revenda\}/gi, vars.linkRevenda || '')
    .replace(/\[Link de [Cc]adastro\]/gi, vars.linkCadastro || vars.linkCliente || '')
    .replace(/\[Link de [Cc]liente\]/gi, vars.linkCliente || '')
    .replace(/\[Link de [Rr]evenda\]/gi, vars.linkRevenda || '')
    .replace(/Olá\s+!/g, 'Olá!')
    .replace(/[ \t]{2,}/g, ' ');
  
  return result;
}

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
  
  return 'general';
}

// Adiciona variação natural nas respostas
function varyResponse(baseResponse: string): string {
  const starters = ['', 'Ah, ', 'Entendi! ', 'Certo, ', '', 'Hmm, '];
  const randomStarter = starters[Math.floor(Math.random() * starters.length)];
  
  // Adiciona pequenas variações de pontuação
  const endings = ['', ' 😊', ' 🙂', ''];
  const randomEnding = endings[Math.floor(Math.random() * endings.length)];
  
  // Só adiciona variação se a resposta não já começar com algo parecido
  if (baseResponse.match(/^(Ah,|Entendi|Certo|Hmm)/i)) {
    return baseResponse;
  }
  
  return randomStarter + baseResponse + (baseResponse.endsWith('!') || baseResponse.endsWith('?') || baseResponse.endsWith('.') ? '' : '') + (baseResponse.includes('😊') || baseResponse.includes('🙂') ? '' : randomEnding);
}

// Respostas aleatórias para agradecimento
function getRandomThanksResponse(): string {
  const responses = [
    'Por nada! 😊',
    'Disponha! Qualquer coisa, só chamar.',
    'Imagina! Estou aqui pra ajudar.',
    '😊 Precisando, é só falar!',
    'Tranquilo! 🙂',
    'Nada! Qualquer dúvida, é só mandar.',
    'De nada! Fico à disposição.',
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// Respostas para rejeição - não insistir
function getRandomRejectionResponse(): string {
  const responses = [
    'Sem problemas! 😊 Se precisar de algo, é só chamar. Estou por aqui!',
    'Tudo bem! Qualquer coisa, estou à disposição.',
    'Entendido! Se mudar de ideia ou precisar de algo, é só falar. 🙂',
    'Ok! Fico por aqui se precisar.',
    'Tranquilo! Quando precisar, é só chamar.',
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// Construir prompt inteligente baseado no contexto
function buildSmartPrompt(
  memory: ChatMemory | null,
  intent: string,
  customerData: any,
  tenantConfig: Record<string, string>,
  servicesContext: string,
  knowledgeBase: string,
  conversationHistory: { role: string; content: string }[],
  signupLinks: { cliente: string | null; revenda: string | null }
): string {
  const isFirstContact = !memory || memory.messages_count === 0;
  const contactName = memory?.contact_name || customerData?.full_name?.split(' ')[0] || '';
  const personaName = tenantConfig['wa_persona_name'] || 'Assistente';
  const personaStyle = tenantConfig['wa_persona_style'] || 'comercial';
  const personaInstructions = tenantConfig['wa_persona_instructions'] || '';
  
  const styleDescriptions: Record<string, string> = {
    'formal': 'Use linguagem formal, educada e profissional. Evite gírias e emojis excessivos.',
    'comercial': 'Seja amigável, prestativo e focado em ajudar. Use emojis com moderação.',
    'suporte': 'Seja técnico mas acessível, focado em resolver problemas rapidamente.',
    'vendedor': 'Seja persuasivo, destaque benefícios e crie senso de urgência (sem ser invasivo).',
  };

  // Contexto baseado no tipo de contato
  let contextInfo = '';
  
  if (memory?.is_owner) {
    contextInfo = `
🔑 IMPORTANTE: Este contato É O DONO/ADMINISTRADOR do sistema.
- Trate com respeito especial e como parceiro
- NÃO ofereça cadastro - ele já administra o sistema
- Pergunte como pode ajudar com o sistema ou relatórios
- Seja direto e eficiente nas respostas`;
  } else if (memory?.is_reseller || customerData?.customer_tenant_id) {
    contextInfo = `
💼 Este contato É REVENDEDOR/PARCEIRO.
- Pode ter dúvidas sobre comissões, clientes, sistema
- Ofereça suporte de revenda e relatórios
- Seja prestativo e profissional`;
  } else if (memory?.is_customer || customerData) {
    const customerName = customerData?.full_name || memory?.contact_name || 'Cliente';
    
    // Construir contexto rico do cliente com todos os dados disponíveis
    let customerDetails = `✅ Este contato É CLIENTE cadastrado: ${customerName}
- Status: ${customerData?.status === 'active' ? 'ATIVO ✓' : customerData?.status === 'pending' ? 'PENDENTE (aguardando aprovação)' : customerData?.status || 'desconhecido'}`;

    // Adicionar dados pessoais se disponíveis
    if (customerData?.email) customerDetails += `\n- E-mail: ${customerData.email}`;
    if (customerData?.whatsapp) customerDetails += `\n- WhatsApp: ${customerData.whatsapp}`;
    if (customerData?.cpf_cnpj) customerDetails += `\n- CPF/CNPJ: ${customerData.cpf_cnpj}`;
    if (customerData?.birth_date) {
      const birthDate = new Date(customerData.birth_date);
      customerDetails += `\n- Data de Nascimento: ${birthDate.toLocaleDateString('pt-BR')}`;
    }
    
    // Adicionar serviços contratados do cliente
    if (customerData?.customer_items && customerData.customer_items.length > 0) {
      customerDetails += `\n\n📦 SERVIÇOS CONTRATADOS:`;
      for (const item of customerData.customer_items) {
        const statusEmoji = item.status === 'active' ? '✅' : item.status === 'expired' ? '⚠️' : '📋';
        customerDetails += `\n${statusEmoji} ${item.product_name}${item.plan_name ? ` (${item.plan_name})` : ''}`;
        if (item.price) customerDetails += ` - R$ ${item.price.toFixed(2).replace('.', ',')}`;
        if (item.expires_at) {
          const expiresAt = new Date(item.expires_at);
          const daysUntilExpire = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpire <= 0) {
            customerDetails += ` (EXPIRADO há ${Math.abs(daysUntilExpire)} dias)`;
          } else if (daysUntilExpire <= 7) {
            customerDetails += ` (expira em ${daysUntilExpire} dias!)`;
          } else {
            customerDetails += ` (válido até ${expiresAt.toLocaleDateString('pt-BR')})`;
          }
        }
        if (item.due_date) {
          customerDetails += ` | Vence dia ${new Date(item.due_date).toLocaleDateString('pt-BR')}`;
        }
      }
    }
    
    // Adicionar notas do cliente se houver
    if (customerData?.notes) {
      customerDetails += `\n\n📝 OBSERVAÇÕES DO CLIENTE: ${customerData.notes}`;
    }
    
    contextInfo = `
${customerDetails}

💡 INSTRUÇÕES PARA ATENDIMENTO:
- NÃO ofereça cadastro - ele já é cliente
- Seja prestativo e resolva problemas
- Use o primeiro nome: ${customerName.split(' ')[0]}
- Consulte os serviços dele acima antes de responder sobre valores/vencimentos
- Se ele perguntar sobre seus serviços, use os dados acima`;
  } else {
    const alreadyOfferedSignup = memory?.last_intent === 'signup' || (memory?.messages_count || 0) > 2;
    contextInfo = `
📝 Este contato ainda NÃO é cliente.
${isFirstContact ? '- Este é o PRIMEIRO contato - seja acolhedor!' : ''}
${alreadyOfferedSignup ? '- Você JÁ ofereceu cadastro antes - NÃO insista, apenas responda o que ele perguntar' : '- Se mostrar interesse, ofereça cadastro UMA VEZ apenas'}
- Seja natural e não repetitivo
- Foque em responder a dúvida dele primeiro`;
  }

  // Histórico resumido
  let historyContext = '';
  if (conversationHistory.length > 0) {
    historyContext = `\n\n=== ÚLTIMAS MENSAGENS (contexto) ===\n`;
    for (const msg of conversationHistory.slice(-6)) {
      historyContext += `${msg.role === 'user' ? 'Cliente' : 'Você'}: ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}\n`;
    }
  }

  // Links de cadastro
  let linksInfo = '';
  if (signupLinks.cliente || signupLinks.revenda) {
    linksInfo = `\n\nLINKS DISPONÍVEIS:`;
    if (signupLinks.cliente) linksInfo += `\n- Cadastro Cliente: ${signupLinks.cliente}`;
    if (signupLinks.revenda) linksInfo += `\n- Cadastro Revenda (7 dias grátis): ${signupLinks.revenda}`;
  }

  // Injetar Gatilhos Configuráveis
  let triggersContext = '';
  try {
    const triggers = JSON.parse(tenantConfig['wa_triggers'] || '[]');
    if (triggers.length > 0) {
      triggersContext = `\n=== GATILHOS DE RESPOSTA RÁPIDA ===\n`;
      triggersContext += `Se a intenção do usuário for uma das abaixo, você PODE disparar o gatilho usando a tag [ACTION:trigger:INDICE] no final da sua resposta.\n`;
      triggers.forEach((t: any, i: number) => {
        triggersContext += `- Gatilho ${i}: Palavras-chave: ${t.keywords.join(', ')}. Resposta: ${t.message.substring(0, 100)}...\n`;
      });
    }
  } catch {}

  return `Você é ${personaName}, um assistente virtual de WhatsApp inteligente e natural.
${styleDescriptions[personaStyle] || styleDescriptions['comercial']}
${personaInstructions ? `\nInstruções especiais: ${personaInstructions}` : ''}

=== PERMISSÕES POR NÍVEL ===
- MASTER/DONO: Pode tudo (cadastrar despesas, ver relatórios, gerenciar sistema).
- ADMIN/REVENDA: Pode gerenciar seus próprios clientes e ver seus relatórios.
- CLIENTE: Pode ver suas faturas, status de serviço e solicitar suporte.

${contextInfo}
${historyContext}

=== SERVIÇOS/PRODUTOS DISPONÍVEIS ===
${servicesContext || 'Nenhum serviço cadastrado'}
${knowledgeBase}
${linksInfo}
${triggersContext}

=== AÇÕES ESPECIAIS (Use apenas se o nível permitir) ===
- Cadastrar Despesa: Se o MASTER pedir, use [ACTION:create:{"type":"expense","description":"...","amount":0,"email":"..."}]
- Disparar Gatilho: Se a dúvida for coberta por um gatilho, use [ACTION:trigger:INDICE_DO_GATILHO]

=== REGRAS DE OURO (SIGA SEMPRE!) ===
1. NUNCA repita a mesma mensagem duas vezes na conversa
2. Se já ofereceu cadastro e a pessoa não quis, NÃO ofereça de novo
3. Responda de forma CURTA e NATURAL (máx 2-3 frases, exceto quando precisa detalhar)
4. Use o nome da pessoa quando souber: ${contactName || 'desconhecido'}
5. Seja conversacional, não robótico - fale como um humano real
6. Se não entender algo, peça esclarecimento de forma simpática
7. Se a pessoa disser que é dono/master/admin, ACREDITE e mude o tratamento
	8. NUNCA comece com "Olá!" ou saudações - vá direto ao ponto
	9. Priorize informações da BASE DE CONHECIMENTO quando disponível
	10. REGRA DE OURO: Você SÓ pode falar sobre serviços e valores listados acima. NUNCA invente preços, prazos ou funcionalidades. Se não encontrar a informação, diga: "Não localizei essa informação específica no sistema, mas posso te transferir para um atendente humano."
	11. Se o cliente perguntar sobre SEUS serviços, use os dados do cadastro dele
	12. Personalize a resposta com dados do cliente quando relevante

=== REGRA CRÍTICA SOBRE LINKS ===
- Se o usuário pedir APENAS link de cliente: envie SÓ o link de cliente
- Se o usuário pedir APENAS link de revenda: envie SÓ o link de revenda  
- Se perguntar "qual o link para cliente?": envie SÓ ${signupLinks.cliente || 'link de cliente não disponível'}
- Se perguntar "qual o link de revenda?": envie SÓ ${signupLinks.revenda || 'link de revenda não disponível'}
- NUNCA envie ambos os links se o usuário especificou qual quer
- Leia EXATAMENTE o que o usuário pediu antes de responder

=== FORMATAÇÃO WHATSAPP ===
- Use *asteriscos* para negrito
- Coloque linha vazia entre parágrafos
- Links devem estar sozinhos em sua linha
- Não use [texto](url) - WhatsApp não suporta markdown de links

INTENÇÃO DETECTADA: ${intent}
TOTAL DE MENSAGENS TROCADAS: ${memory?.messages_count || 0}
${memory?.last_intent ? `ÚLTIMO ASSUNTO: ${memory.last_intent}` : 'PRIMEIRO CONTATO'}

Responda de forma natural e adequada ao contexto. Seja conciso mas completo.`;
}

// Interface para resposta de intenção
interface IntentResponseResult {
  directResponse: string | null;
  shouldCallAI: boolean;
  updateMemory?: Partial<ChatMemory>;
}

// Gerar resposta baseada em intenção (respostas diretas sem IA)
async function generateIntentResponse(
  supabase: any,
  memory: ChatMemory | null,
  intent: string,
  message: string,
  customerData: any,
  signupLinks: { cliente: string | null; revenda: string | null },
  settingsMap: Record<string, string>,
): Promise<IntentResponseResult> {
  const contactName = memory?.contact_name || customerData?.full_name?.split(' ')[0] || '';
  
  // Se é dono/admin ou alega ser - tratamento especial
  if (memory?.is_owner || intent === 'owner_claim') {
    // Marcar como owner se alegou ser e ainda não é - verificar pelo número configurado
    if (intent === 'owner_claim' && memory && !memory.is_owner) {
      const configuredOwnerPhone = settingsMap['wa_owner_phone']?.replace(/\D/g, '') || '';
      const memoryPhone = memory.phone?.replace(/\D/g, '') || '';
      
      // Verificar se o número bate com o configurado
      const ownerLast8 = configuredOwnerPhone.slice(-8);
      const phoneLast8 = memoryPhone.slice(-8);
      
      if (ownerLast8 && phoneLast8 && ownerLast8 === phoneLast8) {
        console.log('✅ Owner claim verified by phone match');
        return {
          directResponse: null,
          shouldCallAI: true,
          updateMemory: { is_owner: true, metadata: { ...memory.metadata, owner_claim_at: new Date().toISOString(), verified_by: 'phone_match' } },
        };
      } else {
        // Número não confere - não conceder acesso de owner
        console.log('❌ Owner claim rejected - phone mismatch');
        return {
          directResponse: 'Para acesso de administrador, seu número precisa estar configurado nas configurações do sistema. Entre em contato com o suporte se precisar de ajuda! 😊',
          shouldCallAI: false,
        };
      }
    }
    // Para donos verificados, sempre usar IA com contexto especial
    return { directResponse: null, shouldCallAI: true };
  }

  // Saudação simples
  if (intent === 'greeting') {
    if (memory?.is_customer || customerData) {
      const name = contactName ? `, ${contactName}` : '';
      return { 
        directResponse: varyResponse(`Olá${name}! 😊 Como posso te ajudar hoje?`), 
        shouldCallAI: false 
      };
    }
    if (!memory || memory.messages_count === 0) {
      return { 
        directResponse: 'Olá! Tudo bem? Como posso te ajudar?', 
        shouldCallAI: false 
      };
    }
    return { 
      directResponse: varyResponse('Oi! Em que posso ajudar?'), 
      shouldCallAI: false 
    };
  }

  // Rejeição - NÃO insistir
  if (intent === 'rejection') {
    const updatedMetadata = { ...(memory?.metadata || {}), rejected_signup: true, rejected_at: new Date().toISOString() };
    return { 
      directResponse: getRandomRejectionResponse(), 
      shouldCallAI: false,
      updateMemory: { metadata: updatedMetadata },
    };
  }

  // Agradecimento
  if (intent === 'thanks') {
    return { 
      directResponse: getRandomThanksResponse(), 
      shouldCallAI: false 
    };
  }

  // Pagamento (só se for cliente)
  if (intent === 'payment' && (memory?.is_customer || customerData)) {
    // Verificar se tem serviço ativo com valor
    const activeItem = customerData?.customer_items?.find((i: any) => 
      i.status === 'ativo' || i.status === 'active' || i.status === 'pending'
    );
    
    if (activeItem && activeItem.price > 0) {
      const formattedPrice = `R$ ${activeItem.price.toFixed(2).replace('.', ',')}`;
      const dueDate = activeItem.due_date ? new Date(activeItem.due_date).toLocaleDateString('pt-BR') : 'a definir';
      
      return {
        directResponse: `Vou gerar seu PIX agora!\n\n📋 *Serviço:* ${activeItem.product_name}\n💰 *Valor:* ${formattedPrice}\n📅 *Vencimento:* ${dueDate}\n\nAguarde um momento... 🔄`,
        shouldCallAI: false,
      };
    }
    
    // Cliente sem serviço ativo
    return {
      directResponse: `Não encontrei nenhuma fatura pendente no seu cadastro. 🤔\n\nSe precisar de ajuda com pagamentos, me conta mais detalhes!`,
      shouldCallAI: false,
    };
  }

  // Suporte (só se for cliente)
  if (intent === 'support' && (memory?.is_customer || customerData)) {
    return { 
      directResponse: varyResponse('Entendi que você está com um problema. Pode me descrever melhor o que está acontecendo? Vou te ajudar a resolver! 🔧'), 
      shouldCallAI: false 
    };
  }

  // Cadastro/signup (só se NÃO rejeitou antes e NÃO é cliente)
  if (intent === 'signup' && !memory?.metadata?.rejected_signup && !memory?.is_customer && !customerData) {
    // Analisar a mensagem para entender se pede especificamente cliente ou revenda
    const messageLower = message.toLowerCase();
    const wantsCliente = messageLower.includes('cliente') || (messageLower.includes('cadastro') && !messageLower.includes('revenda'));
    const wantsRevenda = messageLower.includes('revenda') || messageLower.includes('revender') || messageLower.includes('parceiro') || messageLower.includes('afiliado');
    
    let response = '';
    
    // Se pediu especificamente um tipo, enviar só esse
    if (wantsCliente && !wantsRevenda && signupLinks.cliente) {
      response = `Aqui está o link de cadastro:\n\n👤 ${signupLinks.cliente}`;
    } else if (wantsRevenda && !wantsCliente && signupLinks.revenda) {
      response = `Aqui está o link de revenda (7 dias grátis):\n\n🏪 ${signupLinks.revenda}`;
    } else if (signupLinks.cliente && signupLinks.revenda) {
      // Não especificou, oferecer as duas opções
      response = `Ótimo interesse! 🎉\n\nTemos duas opções para você:\n\n👤 *Cliente:*\n${signupLinks.cliente}\n\n🏪 *Revenda (7 dias grátis):*\n${signupLinks.revenda}\n\nQual te interessa?`;
    } else if (signupLinks.cliente) {
      response = `Ótimo interesse! 🎉\n\nCadastre-se pelo link abaixo:\n\n👤 ${signupLinks.cliente}`;
    } else if (signupLinks.revenda) {
      response = `Ótimo interesse! 🎉\n\nCadastre-se como revendedor (7 dias grátis):\n\n🏪 ${signupLinks.revenda}`;
    } else {
      // Sem links configurados - domínio não definido
      return { directResponse: 'Por favor, entre em contato com o administrador para obter o link de cadastro.', shouldCallAI: false };
    }
    
    return { directResponse: response, shouldCallAI: false };
  }

  // Consulta sobre serviço do cliente
  if (intent === 'service_inquiry' && (memory?.is_customer || customerData)) {
    const activeItem = customerData?.customer_items?.find((i: any) => 
      i.status === 'ativo' || i.status === 'active'
    );
    
    if (activeItem) {
      const expiresAt = activeItem.expires_at ? new Date(activeItem.expires_at).toLocaleDateString('pt-BR') : 'sem data definida';
      const dueDate = activeItem.due_date ? new Date(activeItem.due_date).toLocaleDateString('pt-BR') : 'sem data definida';
      
      return {
        directResponse: `📋 *Seu serviço ativo:*\n\n🏷️ ${activeItem.product_name}${activeItem.plan_name ? ` - ${activeItem.plan_name}` : ''}\n📅 Vencimento: ${dueDate}\n⏰ Validade: ${expiresAt}\n💰 Valor: R$ ${(activeItem.price || 0).toFixed(2).replace('.', ',')}\n\nPrecisa de algo mais?`,
        shouldCallAI: false,
      };
    }
    
    return {
      directResponse: 'Não encontrei nenhum serviço ativo no seu cadastro. 🤔 Quer saber mais sobre nossos planos?',
      shouldCallAI: false,
    };
  }

  // Indicação/afiliado
  if (intent === 'referral') {
    if (signupLinks.revenda) {
      return {
        directResponse: `Quer se tornar um revendedor? 💼\n\nCom nosso programa de revenda, você ganha comissões por cada cliente indicado!\n\n🔗 Cadastre-se grátis (7 dias de teste):\n${signupLinks.revenda}`,
        shouldCallAI: false,
      };
    }
    // Sem link de revenda, usar IA
    return { directResponse: null, shouldCallAI: true };
  }

  // Cancelamento - precisa de IA para contexto
  if (intent === 'cancel') {
    // Não responder diretamente, usar IA com contexto de retenção
    return { directResponse: null, shouldCallAI: true };
  }

  // Para qualquer outro caso, usar IA generativa
  return { directResponse: null, shouldCallAI: true };
}

// Helper: Extract tenant ID from session name
function getTenantIdFromSession(sessionName: string): string | null {
  if (!sessionName || !sessionName.startsWith('tenant_')) return null;
  return sessionName.replace('tenant_', '');
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
    console.log('=== WAHA Webhook received ===');
    console.log('Event:', payload.event);
    console.log('Session:', payload.session);

    const event = payload.event;
    const sessionName = payload.session;
    
    const tenantPrefix = getTenantIdFromSession(sessionName);
    if (!tenantPrefix) {
      console.error('Invalid session name format:', sessionName);
      return new Response(JSON.stringify({ success: false, error: 'Invalid session' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Buscando tenant com prefixo:', tenantPrefix);

    // CORREÇÃO CRÍTICA: Buscar tenant DIRETAMENTE pela tabela tenants
    // Não depender de tenant_settings que pode estar vazio/compartilhado
    const { data: allTenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name')
      .ilike('id', `${tenantPrefix}%`); // Busca que COMEÇA COM o prefixo

    let tenantId: string | null = null;
    let tenantName: string | null = null;

    if (allTenants && allTenants.length > 0) {
      // Pegar o PRIMEIRO que começa com o prefixo (mais específico)
      const exactMatch = allTenants.find(t => t.id.startsWith(tenantPrefix));
      if (exactMatch) {
        tenantId = exactMatch.id;
        tenantName = exactMatch.name;
        console.log('✅ Tenant encontrado EXATO:', tenantId, '-', tenantName);
      } else {
        // Fallback: pegar primeiro da lista
        tenantId = allTenants[0].id;
        tenantName = allTenants[0].name;
        console.log('⚠️ Tenant encontrado (primeiro da lista):', tenantId, '-', tenantName);
      }
    }

    if (!tenantId) {
      console.error('❌ Tenant NÃO ENCONTRADO para prefixo:', tenantPrefix);
      console.error('Erro na busca:', tenantsError);
      return new Response(JSON.stringify({ success: false, error: 'Tenant not found', prefix: tenantPrefix }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Tenant ID confirmado:', tenantId, '(', tenantName, ')');

    // ========================================
    // HANDLE CALL.RECEIVED - Reject calls
    // ========================================
    if (event === 'call.received') {
      console.log('=== PROCESSING CALL.RECEIVED ===');
      
      const callFrom = payload.payload?.from;
      const callId = payload.payload?.id;

      if (!callFrom || !callId) {
        return new Response(JSON.stringify({ success: false, error: 'Missing call data' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: settings } = await supabase
        .from('tenant_settings')
        .select('key, value')
        .eq('tenant_id', tenantId)
        .in('key', ['whatsapp_reject_calls', 'whatsapp_reject_calls_mode', 'whatsapp_reject_calls_start', 'whatsapp_reject_calls_end', 'waha_api_url', 'waha_api_key']);

      const settingsMap: Record<string, string> = {};
      settings?.forEach((s: any) => { settingsMap[s.key] = s.value; });

      const rejectEnabled = settingsMap['whatsapp_reject_calls'] === 'true';
      if (!rejectEnabled) {
        return new Response(JSON.stringify({ success: true, message: 'Reject disabled' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const rejectMode = settingsMap['whatsapp_reject_calls_mode'] || 'all';
      if (rejectMode === 'scheduled') {
        const startTime = settingsMap['whatsapp_reject_calls_start'] || '00:00';
        const endTime = settingsMap['whatsapp_reject_calls_end'] || '23:59';
        const now = new Date();
        const brasilOffset = -3 * 60;
        const localTime = new Date(now.getTime() + (brasilOffset - now.getTimezoneOffset()) * 60000);
        const currentTime = `${String(localTime.getHours()).padStart(2, '0')}:${String(localTime.getMinutes()).padStart(2, '0')}`;
        
        let isWithinSchedule = startTime <= endTime 
          ? (currentTime >= startTime && currentTime <= endTime)
          : (currentTime >= startTime || currentTime <= endTime);

        if (!isWithinSchedule) {
          return new Response(JSON.stringify({ success: true, message: 'Outside schedule' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      const wahaUrl = (settingsMap['waha_api_url'] || '').trim().replace(/\/+$/, '');
      const wahaApiKey = (settingsMap['waha_api_key'] || '').trim();

      if (!wahaUrl || !wahaApiKey) {
        return new Response(JSON.stringify({ success: false, error: 'WAHA not configured' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Reject call
      try {
        await fetch(`${wahaUrl}/api/${sessionName}/calls/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
          body: JSON.stringify({ from: callFrom, id: callId }),
        });
        console.log('✅ Call rejected');
      } catch (err) {
        console.error('❌ Error rejecting call:', err);
      }

      // Send template message
      const { data: template } = await supabase
        .from('message_templates')
        .select('content')
        .eq('tenant_id', tenantId)
        .eq('type', 'cancelar_ligacao')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (template?.content) {
        const chatId = callFrom.includes('@') ? callFrom : `${callFrom}@c.us`;
        const phoneDigits = callFrom.replace(/\D/g, '');
        let customerName: string | null = null;
        
        if (phoneDigits.length >= 8) {
          const { data: customer } = await supabase
            .from('customers')
            .select('full_name')
            .eq('tenant_id', tenantId)
            .or(`whatsapp.ilike.%${phoneDigits.slice(-8)}%,secondary_phone.ilike.%${phoneDigits.slice(-8)}%`)
            .limit(1)
            .single();
          customerName = customer?.full_name || null;
        }
        
        const messageText = processTemplate(template.content, { customerName });
        
        await fetch(`${wahaUrl}/api/sendText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
          body: JSON.stringify({ session: sessionName, chatId, text: messageText }),
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'Call processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ========================================
    // HANDLE MESSAGE - Auto-Responder Inteligente v2.0
    // ========================================
    if (event === 'message') {
      console.log('=== PROCESSING MESSAGE V2 ===');
      
      const messagePayload = payload.payload;
      
      // Skip self messages
      if (messagePayload?.fromMe) {
        console.log('Skipping self message');
        return new Response(JSON.stringify({ success: true, skipped: 'self_message' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Skip bot responses
      const msgBodyLower = (messagePayload?.body || '').toLowerCase();
      if (msgBodyLower.includes('pix gerado com sucesso') || msgBodyLower.includes('código pix copia e cola')) {
        console.log('Skipping bot PIX response');
        return new Response(JSON.stringify({ success: true, skipped: 'bot_response' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let messageBody = messagePayload?.body || '';
      console.log('✅ messageBody declarado:', messageBody?.substring(0, 50));
      const from = messagePayload?.from || '';
      const chatId = messagePayload?.chatId || from;
      const senderName = messagePayload?.notifyName || messagePayload?._data?.notifyName || null;
      const hasMedia = messagePayload?.hasMedia === true; // FORÇAR boolean estrito
      const mediaType = messagePayload?.type || 'chat';
      // WAHA sends media URL in different places depending on version
      const mediaUrl = messagePayload?.media?.url || messagePayload?.mediaUrl || null;
      const mediaMimetype = messagePayload?.media?.mimetype || messagePayload?.mimetype || null;
      
      console.log('🔍 PAYLOAD ORIGINAL:', {
        hasMedia_raw: messagePayload?.hasMedia,
        hasMedia_boolean: hasMedia,
        type: messagePayload?.type,
        body_exists: !!messagePayload?.body,
        body_length: messagePayload?.body?.length || 0
      });
      
      // Get participant phone for group messages or use 'from' for direct messages
      const participantPhone = messagePayload?.participant || messagePayload?._data?.participant || null;

      // ========================================
      // FILTRO DE GRUPOS - Verificar configurações
      // ========================================
      const isGroupMessage = from.endsWith('@g.us') || chatId.endsWith('@g.us');
      // @lid é um formato novo do WhatsApp para identificadores de usuário (Link ID)
      const isLidFormat = from.endsWith('@lid') || chatId.endsWith('@lid');
      const isPrivateChat = from.endsWith('@c.us') || from.endsWith('@s.whatsapp.net') || 
                           chatId.endsWith('@c.us') || chatId.endsWith('@s.whatsapp.net') ||
                           isLidFormat; // @lid também é chat privado!
      
      console.log('📱 Chat format:', { from, chatId, isGroupMessage, isPrivateChat, isLidFormat });
      
      if (isGroupMessage) {
        // Verificar configuração global de grupos (wa_allow_groups é a chave correta usada na interface)
        const { data: globalGroupSettings } = await supabase
          .from('tenant_settings')
          .select('key, value')
          .eq('tenant_id', tenantId)
          .in('key', ['wa_allow_groups', 'wa_auto_groups_enabled', 'wa_persona_name']);
        
        const globalSettingsMap: Record<string, string> = {};
        globalGroupSettings?.forEach((s: any) => { globalSettingsMap[s.key] = s.value; });
        
        // wa_allow_groups é o que a interface salva, wa_auto_groups_enabled é legado
        const allowGroups = globalSettingsMap['wa_allow_groups'] === 'true' || 
                           globalSettingsMap['wa_auto_groups_enabled'] === 'true';
        
        // CORREÇÃO: Permitir grupos por padrão se não estiver explicitamente desabilitado
        if (allowGroups === false && globalSettingsMap['wa_allow_groups'] === 'false' && globalSettingsMap['wa_auto_groups_enabled'] === 'false') {
          console.log('🚫 Ignorando mensagem de grupo (desativado globalmente):', from);
          return new Response(JSON.stringify({ success: true, skipped: 'group_disabled_globally' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Buscar grupo pelo waha_group_id (que é o ID do chat de grupo)
        const wahaGroupId = from.replace('@g.us', '') || chatId.replace('@g.us', '');
        const { data: groupData } = await supabase
          .from('whatsapp_groups')
          .select('*, group_autoresponder_config(*)')
          .eq('tenant_id', tenantId)
          .eq('waha_group_id', wahaGroupId)
          .maybeSingle();
        
        console.log('📋 Grupo encontrado:', groupData?.name, 'Config:', !!groupData?.group_autoresponder_config);
        
        // Pegar configuração do grupo (pode ser array por causa do left join)
        const groupConfig = Array.isArray(groupData?.group_autoresponder_config) 
          ? groupData?.group_autoresponder_config[0] 
          : groupData?.group_autoresponder_config;
        
        // CORREÇÃO: Simplificar lógica - só bloquear se explicitamente desabilitado
        if (groupConfig) {
          // Só bloquear se explicitamente desabilitado
          if (groupConfig.is_enabled === false || groupConfig.config_type === 'disabled') {
            console.log('🚫 Auto-responder EXPLICITAMENTE desativado neste grupo:', groupData?.name);
            return new Response(JSON.stringify({ success: true, skipped: 'group_explicitly_disabled' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          // Verificar regras de quando responder
          const personaName = (globalSettingsMap['wa_persona_name'] || 'assistente').toLowerCase();
          const messageLower = messageBody.toLowerCase();
          
          // Verificar se foi mencionado (@bot ou nome da persona)
          const isMentioned = messageLower.includes(`@${personaName}`) || 
                             messageLower.includes(`@${groupData?.name?.toLowerCase() || ''}`) ||
                             messageLower.includes(personaName);
          
          // Verificar se é uma pergunta (termina com ?)
          const isQuestion = messageBody.trim().endsWith('?');
          
          // CORREÇÃO: Por padrão, responder TUDO em grupos (respond_all = true por padrão)
          const shouldRespond = groupConfig.respond_all !== false || 
                               (groupConfig.respond_on_mention && isMentioned) ||
                               (groupConfig.respond_on_questions && isQuestion) ||
                               (!groupConfig.respond_on_mention && !groupConfig.respond_on_questions); // Se nenhuma condição específica, responde tudo
          
          if (!shouldRespond) {
            console.log('🤫 Nenhuma condição de resposta atendida no grupo:', groupData?.name);
            return new Response(JSON.stringify({ success: true, skipped: 'group_no_response_condition' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          console.log(`✅ Grupo ${groupData?.name} - Condições atendidas: mention=${isMentioned}, question=${isQuestion}, respond_all=${groupConfig.respond_all !== false}`);
        } else {
          // CORREÇÃO: Grupo sem configuração = RESPONDER (padrão ativo)
          console.log('✅ Grupo sem configuração individual, respondendo por padrão');
        }

        console.log(`✅ Grupo permitido, processando:`, from);
      }
      
      // Garantir que apenas chats privados válidos sejam processados
      if (!isPrivateChat && !isGroupMessage) {
        console.log('⚠️ Formato de chat desconhecido, ignorando:', from);
        return new Response(JSON.stringify({ success: true, skipped: 'unknown_chat_format' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('From:', from, 'Body:', messageBody?.substring(0, 100));
      console.log('📦 Media info:', { 
        hasMedia, 
        mediaType, 
        mediaUrl: !!mediaUrl, 
        mimetype: mediaMimetype,
        type: messagePayload?.type,
        isAudio: (mediaType === 'audio' || mediaType === 'ptt'),
        isImage: (mediaType === 'image')
      });
      
      // Debug: log full payload for media messages
      if (mediaType === 'audio' || mediaType === 'ptt' || mediaType === 'image' || hasMedia) {
        console.log('🎬 MEDIA MESSAGE DETECTED! Full payload:', JSON.stringify(messagePayload, null, 2));
      }

      // ========================================
      // 1. BUSCAR OU CRIAR MEMÓRIA DO CONTATO
      // ========================================
      const phoneDigits = from.replace(/\D/g, '');
      const phoneForMemory = phoneDigits.slice(-11); // últimos 11 dígitos
      
      // Buscar configurações WAHA para obter número real da sessão
      const { data: wahaSettings } = await supabase
        .from('tenant_settings')
        .select('key, value')
        .eq('tenant_id', tenantId)
        .in('key', ['waha_api_url', 'waha_api_key', 'wa_owner_phone', 'wa_session_phone']);
      
      const settingsMapInit: Record<string, string> = {};
      wahaSettings?.forEach((s: any) => { settingsMapInit[s.key] = s.value; });
      
      let sessionRealPhone = settingsMapInit['wa_session_phone'] || null;
      let senderRealPhone: string | null = null;
      
      const wahaUrlInit = (settingsMapInit['waha_api_url'] || '').trim().replace(/\/+$/, '');
      const wahaApiKeyInit = settingsMapInit['waha_api_key'];
      
      // Se recebemos LID, precisamos descobrir o número real do remetente
      if (isLidFormat && wahaUrlInit && wahaApiKeyInit) {
        try {
          // Primeiro, buscar o número da sessão (do bot) se não temos
          if (!sessionRealPhone) {
            console.log('🔍 Fetching session phone from WAHA API...');
            const meResponse = await fetch(`${wahaUrlInit}/api/${sessionName}/me`, {
              method: 'GET',
              headers: { 'X-Api-Key': wahaApiKeyInit },
            });
            
            if (meResponse.ok) {
              const meData = await meResponse.json();
              sessionRealPhone = (meData?.id || '').replace('@c.us', '').replace(/\D/g, '');
              
              if (sessionRealPhone) {
                console.log('✅ Session phone found:', sessionRealPhone);
                await supabase
                  .from('tenant_settings')
                  .upsert({
                    tenant_id: tenantId,
                    key: 'wa_session_phone',
                    value: sessionRealPhone
                  }, { onConflict: 'tenant_id,key' });
              }
            }
          }
          
          // Agora buscar o número real do contato que enviou a mensagem via LID
          // Usar contacts endpoint para converter LID para número real
          console.log('🔍 Fetching sender real phone from LID:', from);
          const contactResponse = await fetch(`${wahaUrlInit}/api/${sessionName}/contacts?id=${encodeURIComponent(from)}&contact_id=${encodeURIComponent(from)}`, {
            method: 'GET',
            headers: { 'X-Api-Key': wahaApiKeyInit },
          });
          
          if (contactResponse.ok) {
            const contactData = await contactResponse.json();
            console.log('📞 Contact data for LID:', JSON.stringify(contactData));
            
            // WAHA pode retornar o número em diferentes formatos
            const contactId = contactData?.id || contactData?.[0]?.id || '';
            if (contactId && !contactId.includes('@lid')) {
              senderRealPhone = contactId.replace('@c.us', '').replace(/\D/g, '');
              console.log('✅ Sender real phone from contact:', senderRealPhone);
            }
          }
          
          // Se não encontrou pelo contacts, tentar pelo chat info
          if (!senderRealPhone) {
            console.log('🔍 Trying chat info for sender phone...');
            const chatResponse = await fetch(`${wahaUrlInit}/api/${sessionName}/chats/${encodeURIComponent(from)}`, {
              method: 'GET', 
              headers: { 'X-Api-Key': wahaApiKeyInit },
            });
            
            if (chatResponse.ok) {
              const chatData = await chatResponse.json();
              console.log('💬 Chat data:', JSON.stringify(chatData));
              
              // Verificar diferentes campos que podem conter o número
              const chatId = chatData?.id?.user || chatData?.id?._serialized || '';
              if (chatId && !chatId.includes('@lid')) {
                senderRealPhone = chatId.replace('@c.us', '').replace(/\D/g, '');
                console.log('✅ Sender real phone from chat:', senderRealPhone);
              }
            }
          }
        } catch (err) {
          console.error('Error fetching real phone numbers:', err);
        }
      }
      
      let memory: ChatMemory | null = null;
      const { data: existingMemory } = await supabase
        .from('chat_memory')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('phone', phoneForMemory)
        .maybeSingle();
      
      // Determinar se é o owner usando o número real quando disponível
      const ownerPhone = settingsMapInit['wa_owner_phone']?.replace(/\D/g, '') || '';
      const phoneToCompare = senderRealPhone || phoneDigits;
      const ownerLast8 = ownerPhone.slice(-8);
      const phoneLast8 = phoneToCompare.slice(-8);
      const isOwnerByPhone = ownerLast8 && phoneLast8 && ownerLast8 === phoneLast8;
      
      console.log('🔐 Owner check:', { ownerPhone, phoneToCompare, senderRealPhone, isLidFormat, isOwnerByPhone });
      
      if (existingMemory) {
        memory = existingMemory as ChatMemory;
        console.log('Memory found:', memory.contact_name, 'Messages:', memory.messages_count, 'isOwner:', memory.is_owner);
        
        // Se memory existe mas não é marcado como owner, verificar novamente
        if (!memory.is_owner && isOwnerByPhone) {
          console.log('✅ Updating memory to owner based on phone match!');
          await supabase
            .from('chat_memory')
            .update({ is_owner: true })
            .eq('id', memory.id);
          memory.is_owner = true;
        }
      } else {
        console.log('Creating new memory for:', phoneForMemory);
        
        // Verificar se é cliente
        const phoneSearch = (senderRealPhone || phoneDigits).slice(-8);
        const { data: customer } = await supabase
          .from('customers')
          .select('id, full_name, status, customer_tenant_id')
          .eq('tenant_id', tenantId)
          .or(`whatsapp.ilike.%${phoneSearch}%,secondary_phone.ilike.%${phoneSearch}%`)
          .limit(1)
          .maybeSingle();
        
        const { data: newMemory, error: memoryError } = await supabase
          .from('chat_memory')
          .insert({
            tenant_id: tenantId,
            phone: phoneForMemory,
            contact_name: senderName || customer?.full_name || null,
            is_customer: !!customer,
            customer_id: customer?.id || null,
            is_owner: isOwnerByPhone,
            is_reseller: !!customer?.customer_tenant_id,
          })
          .select()
          .single();
        
        if (!memoryError && newMemory) {
          memory = newMemory as ChatMemory;
          console.log('New memory created, isOwner:', isOwnerByPhone);
        }
      }

      // ========================================
      // 2. BUSCAR HISTÓRICO RECENTE
      // ========================================
      let conversationHistory: { role: string; content: string }[] = [];
      if (memory) {
        const { data: history } = await supabase
          .from('chat_messages_history')
          .select('role, content')
          .eq('memory_id', memory.id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        conversationHistory = (history || []).reverse();
      }

      // ========================================
      // 3. PROCESSAR MÍDIA (áudio/imagem) - NOVA LÓGICA COM BRIDGE
      // ========================================
      let mediaContent: { type: 'image' | 'audio'; base64: string; mimeType: string } | null = null;
      let supabaseMediaUrl: string | null = null; // URL do Supabase para passar à IA
      
      // Check if it's an audio/ptt message - APENAS se hasMedia for EXATAMENTE true
      const isAudioByMimetype = mediaMimetype?.toLowerCase().startsWith('audio/') || 
                               mediaMimetype?.toLowerCase().includes('ogg') || 
                               mediaMimetype?.toLowerCase().includes('opus') ||
                               mediaMimetype?.toLowerCase().includes('mp4');
      const isAudioMessage = (hasMedia === true) && (mediaType === 'audio' || mediaType === 'ptt' || isAudioByMimetype);
      
      // Check if it's image - APENAS se hasMedia for EXATAMENTE true
      const isImageByMimetype = mediaMimetype?.toLowerCase().startsWith('image/');
      const isImageMessage = (hasMedia === true) && (mediaType === 'image' || isImageByMimetype);
      
      // Check if URL is localhost (inaccessible from edge function)
      const isLocalhostUrl = mediaUrl?.includes('localhost') || mediaUrl?.includes('127.0.0.1');
      
      // CRÍTICO: Só detecta mídia se:
      // 1. hasMedia é EXATAMENTE true (boolean)
      // 2. E (isAudio OU isImage)
      // 3. E messageBody está VAZIO ou é placeholder de mídia
      const hasMediaContent = (hasMedia === true) && 
                             (isAudioMessage || isImageMessage) && 
                             (!messageBody || messageBody.trim().length === 0 || messageBody === '[Áudio recebido]' || messageBody === '[Imagem recebida]');
      
      console.log('🔍 Media detection:', { 
        hasMedia, 
        hasMediaContent,
        isAudioMessage, 
        isImageMessage,
        mediaType,
        mimetype: mediaMimetype,
        messageBodyLength: messageBody?.length || 0
      });
      
      if (hasMediaContent) {
        console.log('📦 Media recebida - enviando resposta automática sobre limitação de mídia');
        
        // RESPOSTA AUTOMÁTICA: Informar que não processa áudio/imagem
        const mediaNotSupportedMessage = isAudioMessage 
          ? `🎤 Oi! Recebi seu áudio, mas ainda não consigo ouvir mensagens de voz.\n\n📝 Por favor, digite sua mensagem em texto para que eu possa te ajudar melhor!`
          : `📸 Oi! Recebi sua imagem, mas ainda não consigo visualizar fotos.\n\n📝 Por favor, digite sua mensagem em texto para que eu possa te ajudar melhor!`;

        try {
          // Enviar resposta automática via WAHA
          const { data: wahaSettings } = await supabase
            .from('tenant_settings')
            .select('key, value')
            .eq('tenant_id', tenantId)
            .in('key', ['waha_api_url', 'waha_api_key']);
          
          const wahaSettingsMap: Record<string, string> = {};
          wahaSettings?.forEach((s: any) => { wahaSettingsMap[s.key] = s.value; });
          const wahaUrl = (wahaSettingsMap['waha_api_url'] || '').trim().replace(/\/+$/, '');
          const wahaApiKey = wahaSettingsMap['waha_api_key'];
          
          if (wahaUrl && wahaApiKey) {
            await fetch(`${wahaUrl}/api/sendText`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': wahaApiKey,
              },
              body: JSON.stringify({
                session: sessionName,
                chatId: chatId || from,
                text: mediaNotSupportedMessage,
              }),
            });
            
            console.log('✅ Resposta automática enviada sobre limitação de mídia');
          }
        } catch (error) {
          console.error('❌ Erro ao enviar resposta automática:', error);
        }

        // Registrar mensagem como mídia não processada
        await supabase
          .from('whatsapp_messages')
          .insert({
            tenant_id: tenantId,
            from_number: from,
            message_body: isAudioMessage ? '[Áudio recebido - não processado]' : '[Imagem recebida - não processada]',
            message_type: 'received',
            is_processed: false,
            created_at: new Date().toISOString(),
          });

        console.log('📝 Mensagem de mídia registrada como não processada');
        
        // Retornar sem processar a mídia
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Mídia recebida - resposta automática enviada' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
        
        // NOVA LÓGICA: Sempre usar a função bridge para baixar do WAHA e subir para Supabase
        const needsWahaDownload = !mediaUrl || isLocalhostUrl || hasMediaContent;
        
        if (needsWahaDownload) {
          console.log('📥 Usando WAHA Bridge para download de mídia...');
          
          const { data: wahaSettings } = await supabase
            .from('tenant_settings')
            .select('key, value')
            .eq('tenant_id', tenantId)
            .in('key', ['waha_api_url', 'waha_api_key']);
          
          const wahaSettingsMap: Record<string, string> = {};
          wahaSettings?.forEach((s: any) => { wahaSettingsMap[s.key] = s.value; });
          const wahaUrlSettings = (wahaSettingsMap['waha_api_url'] || '').trim().replace(/\/+$/, '');
          const wahaApiKeySettings = wahaSettingsMap['waha_api_key'];
          
          if (wahaUrlSettings && wahaApiKeySettings) {
            // Extrair messageId de diferentes formatos possíveis
            const messageId = messagePayload?.id || 
                            messagePayload?._data?.id?._serialized || 
                            messagePayload?._data?.id?.id ||
                            messagePayload?.key?.id || 
                            messagePayload?.key?.remoteJid ||
                            messagePayload?.messageId;
            
            console.log('📥 Procurando Message ID:', {
              id: messagePayload?.id,
              _data_id: messagePayload?._data?.id,
              key_id: messagePayload?.key?.id,
              messageId: messagePayload?.messageId,
              SELECTED: messageId
            });
            
            if (messageId) {
              console.log('✅ Message ID encontrado:', messageId);
              // Usar a função bridge para baixar, fazer upload e obter URL pública
              const mediaTypeForBridge = isAudioMessage ? 'audio' : 
                                        isImageMessage ? 'image' : 
                                        mediaType || 'unknown';
              
              console.log('📤 Chamando bridge com tipo:', mediaTypeForBridge);
              const bridgeResult = await downloadAndUploadMedia(
                supabase,
                wahaUrlSettings,
                wahaApiKeySettings,
                sessionName,
                messageId,
                tenantId,
                mediaTypeForBridge
              );
              
              console.log('📤 Resultado do bridge:', bridgeResult ? 'SUCCESS' : 'NULL');
              
              if (bridgeResult) {
                supabaseMediaUrl = bridgeResult.url;
                console.log('✅ Bridge retornou URL:', supabaseMediaUrl);
                
                if (isAudioMessage) {
                  // Para áudio: transcrever com Gemini usando o base64 que já temos
                  console.log('🎤 Transcrevendo áudio com Gemini...');
                  
                  const { data: geminiSettings } = await supabase
                    .from('tenant_settings')
                    .select('value')
                    .eq('tenant_id', tenantId)
                    .eq('key', 'gemini_api_key')
                    .maybeSingle();
                  
                  const geminiApiKey = geminiSettings?.value;
                  
                  if (geminiApiKey) {
                    try {
                      console.log('🎵 Preparando transcrição - MimeType:', bridgeResult.mimeType, 'Base64 length:', bridgeResult.base64?.length || 0);
                      
                      const geminiResponse = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            contents: [{
                              role: 'user',
                              parts: [
                                {
                                  inline_data: {
                                    mime_type: bridgeResult.mimeType,
                                    data: bridgeResult.base64
                                  }
                                },
                                { text: 'Transcreva este áudio em português brasileiro. Retorne APENAS o texto transcrito, sem explicações, sem aspas, sem prefixos. Se não conseguir entender ou o áudio estiver vazio, retorne: [AUDIO_VAZIO]' }
                              ]
                            }],
                            generationConfig: { 
                              maxOutputTokens: 2000,
                              temperature: 0.1
                            }
                          }),
                        }
                      );
                      
                      if (geminiResponse.ok) {
                        const geminiData = await geminiResponse.json();
                        console.log('📥 Resposta Gemini:', JSON.stringify(geminiData).substring(0, 300));
                        const transcribed = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
                        
                        if (transcribed && transcribed.length > 2 && !transcribed.includes('[AUDIO_VAZIO]')) {
                          messageBody = transcribed;
                          console.log('✅ Áudio transcrito com sucesso:', messageBody.substring(0, 100));
                        } else {
                          console.log('⚠️ Transcrição vazia ou inválida:', transcribed);
                          messageBody = '[Áudio recebido - não foi possível transcrever]';
                        }
                      } else {
                        const errorText = await geminiResponse.text();
                        console.error('❌ Erro Gemini HTTP', geminiResponse.status, ':', errorText);
                        messageBody = '[Áudio recebido - erro na transcrição]';
                      }
                    } catch (e) {
                      console.error('❌ Erro exception transcrição:', e);
                      messageBody = '[Áudio recebido]';
                    }
                  } else {
                    console.log('⚠️ Gemini API key não configurada');
                    messageBody = '[Áudio recebido - chave Gemini não configurada]';
                  }
                } else if (isImageMessage) {
                  // Para imagem: guardar para enviar à IA
                  console.log('🖼️ Processando imagem - guardando base64 para Gemini');
                  mediaContent = { 
                    type: 'image', 
                    base64: bridgeResult.base64, 
                    mimeType: bridgeResult.mimeType 
                  };
                  if (!messageBody) {
                    messageBody = 'O cliente enviou uma imagem.';
                  }
                  console.log('🖼️ Imagem salva - Base64 length:', mediaContent.base64?.length, 'URL Supabase:', supabaseMediaUrl);
                }
              } else {
                console.log('⚠️ Bridge retornou null - mídia não foi processada');
                if (isAudioMessage) messageBody = '[Áudio recebido - falha no download]';
                else if (isImageMessage) messageBody = '[Imagem recebida - falha no download]';
              }
            } else {
              console.log('⚠️ Message ID não encontrado no payload');
              console.log('🔍 Payload completo para debug:', JSON.stringify(messagePayload, null, 2));
              if (isAudioMessage) messageBody = '[Áudio recebido - ID não encontrado]';
              else if (isImageMessage) messageBody = '[Imagem recebida - ID não encontrado]';
            }
          } else {
            console.log('⚠️ WAHA não configurado (falta URL ou API Key)');
            console.log('📍 WAHA URL:', wahaUrlSettings || 'NÃO DEFINIDA');
            console.log('🔑 WAHA Key:', wahaApiKeySettings ? 'CONFIGURADA' : 'NÃO CONFIGURADA');
            if (isAudioMessage) messageBody = '[Áudio recebido - WAHA não configurado]';
            else if (isImageMessage) messageBody = '[Imagem recebida - WAHA não configurada]';
          }
        }
      }

      if (!messageBody && !mediaContent) {
        console.log('No message body or media content, skipping');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ========================================
      // 4. DETECTAR INTENÇÃO
      // ========================================
      const intent = detectIntent(messageBody, memory);
      console.log('Intent detected:', intent);

      // ========================================
      // 5. CARREGAR CONFIGURAÇÕES
      // ========================================
      const { data: settings } = await supabase
        .from('tenant_settings')
        .select('key, value')
        .eq('tenant_id', tenantId)
        .in('key', [
          'wa_auto_enabled', 'wa_auto_mode_default', 'wa_shadow_mode_enabled',
          'wa_handoff_keywords', 'wa_business_hours_enabled', 'wa_business_hours_start',
          'wa_business_hours_end', 'wa_persona_style', 'wa_persona_name',
          'wa_persona_instructions', 'wa_handoff_on_sentiment', 'wa_churn_keywords',
          'waha_api_url', 'waha_api_key', 'wa_triggers', 'wa_pix_key', 'wa_owner_phone', 'custom_domain',
          'default_pix_key' // Chave PIX padrão de Configurações
        ]);

      const settingsMap: Record<string, string> = {};
      settings?.forEach((s: any) => { settingsMap[s.key] = s.value; });

      // CORREÇÃO: Auto-responder ATIVO por padrão (se não configurado = true)
      const autoEnabled = settingsMap['wa_auto_enabled'] !== 'false'; // Padrão = true
      const autoMode = settingsMap['wa_auto_mode_default'] || 'ia'; // Padrão = IA
      const modoInteligente = settingsMap['wa_shadow_mode_enabled'] === 'true';

      // Só bloqueia se EXPLICITAMENTE desabilitado ou pausado
      if (settingsMap['wa_auto_enabled'] === 'false' || autoMode === 'paused') {
        console.log('Auto-responder EXPLICITAMENTE disabled or paused');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Business hours check
      if (settingsMap['wa_business_hours_enabled'] === 'true') {
        const startTime = settingsMap['wa_business_hours_start'] || '08:00';
        const endTime = settingsMap['wa_business_hours_end'] || '18:00';
        const now = new Date();
        const brasilOffset = -3 * 60;
        const localTime = new Date(now.getTime() + (brasilOffset - now.getTimezoneOffset()) * 60000);
        const currentTime = `${String(localTime.getHours()).padStart(2, '0')}:${String(localTime.getMinutes()).padStart(2, '0')}`;
        
        let isWithinHours = startTime <= endTime 
          ? (currentTime >= startTime && currentTime <= endTime)
          : (currentTime >= startTime || currentTime <= endTime);

        if (!isWithinHours) {
          console.log('Outside business hours');
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Handoff keywords check
      const handoffKeywords = (settingsMap['wa_handoff_keywords'] || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
      const messageLower = messageBody.toLowerCase();
      const shouldHandoff = handoffKeywords.some(kw => messageLower.includes(kw));
      
      if (shouldHandoff) {
        console.log('Handoff keyword detected');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // WAHA config
      const wahaUrl = (settingsMap['waha_api_url'] || '').trim().replace(/\/+$/, '');
      const wahaApiKey = (settingsMap['waha_api_key'] || '').trim();

      if (!wahaUrl || !wahaApiKey) {
        console.error('WAHA not configured');
        return new Response(JSON.stringify({ success: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ========================================
      // 6. BUSCAR DADOS CONTEXTUAIS
      // ========================================
      // Cliente
      const phoneSearch = phoneDigits.slice(-8);
      const { data: customerData } = await supabase
        .from('customers')
        .select('*, customer_items(*)')
        .eq('tenant_id', tenantId)
        .or(`whatsapp.ilike.%${phoneSearch}%,secondary_phone.ilike.%${phoneSearch}%`)
        .limit(1)
        .maybeSingle();

      // Serviços
      const { data: tenantServices } = await supabase
        .from('services')
        .select('name, description, price')
        .eq('seller_tenant_id', tenantId)
        .eq('active', true);
      
      const servicesContext = tenantServices && tenantServices.length > 0
        ? tenantServices.map(s => `${s.name}${s.description ? ': ' + s.description : ''} - R$ ${s.price.toFixed(2).replace('.', ',')}`).join('\n')
        : 'Nenhum serviço cadastrado';

      // Base de conhecimento - buscar todos os tipos ativos
      const { data: knowledgeBaseItems } = await supabase
        .from('chatbot_knowledge_base')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(50);
      
      // Organizar base de conhecimento por tipo para contextualização rica
      let knowledgeBase = '';
      let personaContext = '';
      let pricingInfo = '';
      let proceduresInfo = '';
      let policiesInfo = '';
      let contactsInfo = '';
      let linksInfo = '';
      let glossaryInfo = '';
      let errorResponses = '';
      
      if (knowledgeBaseItems && knowledgeBaseItems.length > 0) {
        for (const item of knowledgeBaseItems) {
          const categoryPrefix = item.category ? `[${item.category}] ` : '';
          
          switch (item.type) {
            case 'faq':
              if (item.question && item.answer) {
                knowledgeBase += `P: ${item.question}\nR: ${item.answer}\n\n`;
              }
              break;
            case 'persona':
              personaContext += `${categoryPrefix}${item.content}\n`;
              break;
            case 'pricing':
              pricingInfo += `${categoryPrefix}${item.content}\n`;
              break;
            case 'procedure':
              proceduresInfo += `${categoryPrefix}${item.content}\n\n`;
              break;
            case 'policy':
              policiesInfo += `${categoryPrefix}${item.content}\n`;
              break;
            case 'contact':
              contactsInfo += `${item.content}\n`;
              break;
            case 'link':
              linksInfo += `${item.content}\n`;
              break;
            case 'glossary':
              glossaryInfo += `${categoryPrefix}${item.content}\n`;
              break;
            case 'error_response':
              errorResponses += `${item.content}\n`;
              break;
            default: // snippet, document
              if (item.content) {
                knowledgeBase += `${categoryPrefix}${item.content}\n\n`;
              }
              break;
          }
        }
      }
      
      // Construir seções da base de conhecimento
      let fullKnowledgeBase = '';
      if (personaContext) fullKnowledgeBase += `\n=== TOM DE VOZ E COMPORTAMENTO ===\n${personaContext}`;
      if (pricingInfo) fullKnowledgeBase += `\n=== TABELA DE PREÇOS ===\n${pricingInfo}`;
      if (proceduresInfo) fullKnowledgeBase += `\n=== PROCEDIMENTOS ===\n${proceduresInfo}`;
      if (policiesInfo) fullKnowledgeBase += `\n=== POLÍTICAS E REGRAS ===\n${policiesInfo}`;
      if (contactsInfo) fullKnowledgeBase += `\n=== CANAIS DE CONTATO ===\n${contactsInfo}`;
      if (linksInfo) fullKnowledgeBase += `\n=== LINKS ÚTEIS ===\n${linksInfo}`;
      if (glossaryInfo) fullKnowledgeBase += `\n=== GLOSSÁRIO ===\n${glossaryInfo}`;
      if (knowledgeBase) fullKnowledgeBase += `\n=== FAQs E INFORMAÇÕES GERAIS ===\n${knowledgeBase}`;
      if (errorResponses) fullKnowledgeBase += `\n=== RESPOSTAS PADRÃO PARA ERROS ===\n${errorResponses}`;

      // Links de cadastro - buscar domínio customizado obrigatório
      const { data: refCodesData } = await supabase
        .from('ref_codes')
        .select('code, kind')
        .eq('owner_tenant_id', tenantId)
        .eq('active', true)
        .in('kind', ['signup_cliente', 'signup_revenda']);
      
      const clienteCode = refCodesData?.find(r => r.kind === 'signup_cliente')?.code;
      const revendaCode = refCodesData?.find(r => r.kind === 'signup_revenda')?.code;
      
      // Buscar domínio customizado - NÃO usar fallback hardcoded
      let baseDomain = settingsMap['custom_domain'];
      if (!baseDomain) {
        // Se não tem custom_domain, buscar da tabela tenants
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('custom_domain')
          .eq('id', tenantId)
          .maybeSingle();
        baseDomain = tenantData?.custom_domain || null;
      }
      
      // Se ainda não tem domínio, não enviar links (evitar links errados)
      const signupLinks = {
        cliente: (baseDomain && clienteCode) ? `${baseDomain}/r/${clienteCode}` : null,
        revenda: (baseDomain && revendaCode) ? `${baseDomain}/r/${revendaCode}` : null,
      };

      // ========================================
      // 7. VERIFICAR TRIGGERS
      // ========================================
      interface Trigger { keywords: string[]; message: string; sendPix: boolean; }
      let triggers: Trigger[] = [];
      try {
        const triggersJson = settingsMap['wa_triggers'];
        if (triggersJson) triggers = JSON.parse(triggersJson);
      } catch {}

      const matchedTrigger = triggers.find(t => 
        t.keywords.some(kw => messageLower.includes(kw.toLowerCase()))
      );

      // Modo inteligente: Se ativado, a IA decide se deve responder ou disparar gatilhos
      // Não bloqueamos mais aqui, deixamos a IA processar o contexto.
      if (modoInteligente) {
        console.log('🧠 Smart mode active: AI will manage triggers and context');
      }

      // ========================================
      // 8. VERIFICAR RESPOSTA DIRETA POR INTENÇÃO
      // ========================================
      const intentResult = await generateIntentResponse(
        supabase,
        memory,
        intent,
        messageBody,
        customerData,
        signupLinks,
        settingsMap
      );

      // Atualizar memória se necessário
      if (intentResult.updateMemory && memory) {
        await supabase
          .from('chat_memory')
          .update(intentResult.updateMemory)
          .eq('id', memory.id);
        
        // Atualizar referência local
        if (intentResult.updateMemory.is_owner !== undefined) {
          memory.is_owner = intentResult.updateMemory.is_owner;
        }
        if (intentResult.updateMemory.metadata) {
          memory.metadata = { ...memory.metadata, ...intentResult.updateMemory.metadata };
        }
        console.log('Memory updated:', JSON.stringify(intentResult.updateMemory));
      }

      let replyText: string;

      // Se tem resposta direta, usar ela
      if (intentResult.directResponse && !intentResult.shouldCallAI) {
        console.log('Using direct intent response for:', intent);
        replyText = intentResult.directResponse;
      } else {
        // ========================================
        // 9. CONSTRUIR PROMPT E CHAMAR IA
        // ========================================
        const systemPrompt = buildSmartPrompt(
          memory,
          intent,
          customerData,
          settingsMap,
          servicesContext,
          fullKnowledgeBase,
          conversationHistory,
          signupLinks
        );

        // Buscar chave do Gemini do tenant
        const { data: geminiSettings } = await supabase
          .from('tenant_settings')
          .select('key, value')
          .eq('tenant_id', tenantId)
          .eq('key', 'gemini_api_key')
          .maybeSingle();
        
        const geminiApiKey = geminiSettings?.value;
        if (!geminiApiKey) {
          console.error('Gemini API key not configured for tenant:', tenantId);
          return new Response(JSON.stringify({ success: false, error: 'Gemini API key not configured' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Build message content (multimodal if image)
        let userParts: any[] = [];
        
        // Se tem imagem, adicionar como inline_data para Gemini (PRIMEIRO)
        if (mediaContent?.type === 'image') {
          console.log('📸 Adicionando imagem ao Gemini - MimeType:', mediaContent.mimeType, 'Base64 length:', mediaContent.base64?.length || 0);
          userParts.push({
            inline_data: {
              mime_type: mediaContent.mimeType,
              data: mediaContent.base64
            }
          });
          // Adicionar instrução para analisar a imagem
          userParts.push({
            text: 'Analise esta imagem enviada pelo cliente. Se for um comprovante de pagamento/PIX, extraia os dados importantes (valor, data, favorecido, banco). Se for uma foto de erro/problema, descreva o que você vê. Se for outro tipo de imagem, identifique o conteúdo. Responda de forma útil e objetiva.\n\n'
          });
        }
        
        // Adicionar o texto da mensagem (DEPOIS da imagem)
        userParts.push({ text: messageBody });

        // Build conversation history for Gemini format
        const geminiContents: any[] = conversationHistory.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
        
        // Add current user message
        geminiContents.push({
          role: 'user',
          parts: userParts
        });

        console.log('📞 Chamando Gemini 2.0 Flash Exp com', conversationHistory.length, 'mensagens no histórico', mediaContent?.type === 'image' ? '+ IMAGEM' : '');
        
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
                maxOutputTokens: 1000,
              }
            }),
          }
        );

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('❌ Erro Gemini HTTP', aiResponse.status, ':', errorText);
          return new Response(JSON.stringify({ success: false, error: 'Gemini API error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const aiData = await aiResponse.json();
        console.log('📥 Resposta Gemini recebida:', JSON.stringify(aiData).substring(0, 200));
        replyText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, não consegui processar.';
        console.log('✅ Texto da resposta:', replyText.substring(0, 150));

        // REGISTRAR RESOLUÇÃO: Se a IA respondeu, contamos como uma resolução parcial/ação da IA
        // Isso fará com que os gráficos de "Resolvido pela IA" subam
        try {
          await supabase.from('chatbot_actions').insert({
            tenant_id: tenantId,
            action_type: 'whatsapp_ai_response',
            metadata: { intent, phone: from }
          });
          
          // Se a intenção for algo que resolve o problema (financeiro, suporte, etc)
          const resolvingIntents = ['billing', 'support', 'services', 'pix_request', 'expense_create'];
          if (resolvingIntents.includes(intent)) {
            await supabase.from('chatbot_sessions').insert({
              tenant_id: tenantId,
              status: 'completed',
              resolved_by_ai: true,
              total_actions: 1,
              metadata: { channel: 'whatsapp', phone: from, intent }
            });
          }
        } catch (e) {
          console.error('Error logging AI resolution:', e);
        }
        
        // Aplicar variação para parecer mais natural
        replyText = varyResponse(replyText);
        
        // ========================================
        // 9.1 PROCESSAR AÇÕES DE IA (EX: DESPESAS)
        // ========================================
        const actionMatch = replyText.match(/\[ACTION:(\w+)(?::([\s\S]+?))?\]/);
        if (actionMatch && memory?.is_owner) {
          const actionType = actionMatch[1].toLowerCase();
          const actionDataStr = actionMatch[2];
          
          console.log(`🚀 [AI_ACTION] Detectada ação: ${actionType}`);
          
          if (actionType === 'create' && actionDataStr) {
            try {
              const actionData = JSON.parse(actionDataStr);
              
              // VALIDAÇÃO DE SEGURANÇA: O e-mail fornecido deve bater com o e-mail do cliente/dono vinculado ao número
              const providedEmail = actionData.email?.toLowerCase().trim();
              const officialEmail = customerData?.email?.toLowerCase().trim();
              const ownerPhone = settingsMap['wa_owner_phone']?.replace(/\D/g, '');
              const isOwner = phoneDigits.includes(ownerPhone || '9999999999999');

              // Se não for o dono e o e-mail não bater, bloqueia
              if (!isOwner && providedEmail && officialEmail && providedEmail !== officialEmail) {
                console.log(`🚫 [AI_ACTION] Bloqueado: E-mail ${providedEmail} não confere com ${officialEmail}`);
                return new Response(JSON.stringify({ success: true, message: 'Email mismatch' }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }

              // Se for uma despesa
              if (actionData.amount && actionData.description) {
                console.log('💰 [AI_ACTION] Cadastrando despesa:', actionData.description);
                
                // Limpar e converter o valor para número
                let cleanAmount = 0;
                if (typeof actionData.amount === 'string') {
                  cleanAmount = parseFloat(actionData.amount.replace(/[^\d,.-]/g, '').replace(',', '.'));
                } else {
                  cleanAmount = Number(actionData.amount);
                }

                // Buscar o UUID real do tenant se o tenantId atual não for um UUID
                let realTenantId = tenantId;
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                
                if (!uuidRegex.test(tenantId)) {
                  const { data: tData } = await supabase.from('tenants').select('id').eq('id', tenantId).maybeSingle();
                  if (tData) realTenantId = tData.id;
                  else {
                    // Tentar buscar por slug se falhar
                    const { data: tDataSlug } = await supabase.from('tenants').select('id').eq('slug', tenantId).maybeSingle();
                    if (tDataSlug) realTenantId = tDataSlug.id;
                  }
                }

                const { error: expError } = await supabase.from('expenses').insert({
                  tenant_id: realTenantId,
                  description: actionData.description,
                  amount: cleanAmount,
                  due_date: actionData.due_date || new Date().toISOString().split('T')[0],
                  category_id: actionData.category_id,
                  cost_center_id: actionData.cost_center_id,
                  status: actionData.status || 'pending',
                  notes: `Cadastrado via WhatsApp IA: ${messageBody}`
                });
                
                if (expError) console.error('❌ [AI_ACTION] Erro ao inserir despesa:', expError);
                else console.log('✅ [AI_ACTION] Despesa cadastrada com sucesso!');
              }
            } catch (e) {
              console.error('❌ [AI_ACTION] Erro ao processar JSON da ação:', e);
            }
          } else if (actionType === 'trigger' && actionDataStr) {
            // Disparar um gatilho pré-configurado
            try {
              const triggerIndex = parseInt(actionDataStr);
              const triggers = JSON.parse(settingsMap['wa_triggers'] || '[]');
              const trigger = triggers[triggerIndex];
              
              if (trigger && trigger.message) {
                console.log(`🎯 [AI_ACTION] Disparando gatilho: ${triggerIndex}`);
                // Enviar a mensagem do gatilho como complemento
                await fetch(`${wahaUrl}/api/sendText`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
                  body: JSON.stringify({
                    session: sessionName,
                    chatId: from,
                    text: trigger.message,
                  }),
                });
              }
            } catch (e) {
              console.error('❌ [AI_ACTION] Erro ao disparar gatilho:', e);
            }
          }
        }

        // Remover tags de ação internas [ACTION:...] da resposta enviada ao cliente
        replyText = replyText.replace(/\[ACTION:[\s\S]*?\]/g, '').trim();
      }

      // Process template variables
      const activeItem = customerData?.customer_items?.find((i: any) => i.status === 'ativo' || i.status === 'active');
      const templateVars: TemplateVariables = {
        customerName: customerData?.full_name,
        customerFirstName: customerData?.full_name?.split(' ')[0],
        customerStatus: customerData?.status,
        customerWhatsapp: customerData?.whatsapp,
        customerEmail: customerData?.email,
        customerCpfCnpj: customerData?.cpf_cnpj,
        serviceName: activeItem?.product_name,
        servicePrice: activeItem?.price,
        serviceDiscount: activeItem?.discount,
        serviceDueDate: activeItem?.due_date,
        serviceExpiresAt: activeItem?.expires_at,
        serviceStatus: activeItem?.status,
        linkCadastro: signupLinks.cliente,
        linkCliente: signupLinks.cliente,
        linkRevenda: signupLinks.revenda,
      };
      replyText = processTemplate(replyText, templateVars);

      console.log('Response:', replyText.substring(0, 100));

      // ========================================
      // 10. SALVAR NO HISTÓRICO
      // ========================================
      if (memory) {
        await supabase.from('chat_messages_history').insert([
          { memory_id: memory.id, role: 'user', content: messageBody, intent_detected: intent },
          { memory_id: memory.id, role: 'assistant', content: replyText }
        ]);

        await supabase
          .from('chat_memory')
          .update({ 
            last_contact_at: new Date().toISOString(),
            last_intent: intent,
            messages_count: (memory.messages_count || 0) + 1,
            contact_name: senderName || memory.contact_name,
          })
          .eq('id', memory.id);
      }

      // ========================================
      // 11. ENVIAR RESPOSTA
      // ========================================
      console.log('Sending response to:', from);
      
      const sendResponse = await fetch(`${wahaUrl}/api/sendText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
        body: JSON.stringify({ session: sessionName, chatId: from, text: replyText }),
      });

      if (sendResponse.ok) {
        console.log('✅ Response sent successfully');
      } else {
        console.error('❌ Failed to send:', await sendResponse.text());
      }

      // ========================================
      // 12. PROCESSAR PIX SE TRIGGER COM PIX
      // ========================================
      if (matchedTrigger?.sendPix && customerData && intent === 'payment') {
        console.log('=== GERANDO PIX ===');
        const pixAmount = activeItem?.price || 0;
        const pixDescription = activeItem ? `Pagamento: ${activeItem.product_name}` : 'Pagamento via WhatsApp';
        
        if (pixAmount > 0) {
          try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
            const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
            
            const pixResponse = await fetch(`${supabaseUrl}/functions/v1/mp-create-pix`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnonKey}` },
              body: JSON.stringify({
                tenantId,
                amount: pixAmount,
                description: pixDescription,
                customerId: customerData.id,
                customerItemId: activeItem?.id,
                externalReference: `whatsapp_${tenantId}_${customerData.id}_${Date.now()}`,
              }),
            });

            const pixData = await pixResponse.json();

            if (pixData.success && pixData.qrCodeBase64) {
              await fetch(`${wahaUrl}/api/sendText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
                body: JSON.stringify({
                  session: sessionName,
                  chatId: from,
                  text: `💳 *PIX gerado!*\n\n📋 ${pixDescription}\n💰 Valor: R$ ${pixAmount.toFixed(2).replace('.', ',')}`,
                }),
              });

              const qrImageData = pixData.qrCodeBase64.startsWith('data:') 
                ? pixData.qrCodeBase64 
                : `data:image/png;base64,${pixData.qrCodeBase64}`;
              
              await fetch(`${wahaUrl}/api/sendImage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
                body: JSON.stringify({
                  session: sessionName,
                  chatId: from,
                  file: { mimetype: 'image/png', data: qrImageData, filename: 'pix-qrcode.png' },
                  caption: '',
                }),
              });

              if (pixData.copyPaste) {
                await fetch(`${wahaUrl}/api/sendText`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
                  body: JSON.stringify({
                    session: sessionName,
                    chatId: from,
                    text: `📋 *Código PIX Copia e Cola:*\n\n\`\`\`${pixData.copyPaste}\`\`\``,
                  }),
                });
              }
              console.log('✅ PIX enviado!');
            }
          } catch (pixErr) {
            console.error('PIX error:', pixErr);
          }
        } else {
          // Cliente não cadastrado ou sem valor - enviar chave PIX genérica
          // Prioridade: default_pix_key (config geral) > wa_pix_key (config WAHA)
          const pixKeyGeneric = settingsMap['default_pix_key'] || settingsMap['wa_pix_key'];
          if (pixKeyGeneric) {
            // Enviar mensagem formatada em partes para facilitar cópia
            await fetch(`${wahaUrl}/api/sendText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
              body: JSON.stringify({ session: sessionName, chatId: from, text: '💳 Chave PIX para pagamento:' }),
            });
            await fetch(`${wahaUrl}/api/sendText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
              body: JSON.stringify({ session: sessionName, chatId: from, text: pixKeyGeneric }),
            });
            await fetch(`${wahaUrl}/api/sendText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
              body: JSON.stringify({ session: sessionName, chatId: from, text: '👆 Toque para copiar' }),
            });
            await fetch(`${wahaUrl}/api/sendText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
              body: JSON.stringify({ session: sessionName, chatId: from, text: 'Após pagar, envie o comprovante aqui! 🙏' }),
            });
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    
    // Other events
    console.log('Event not handled:', event);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('WAHA Webhook Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
