import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface WAHAResponse {
  success: boolean;
  data?: any;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔵 WAHA-API: Iniciando requisição');
    
    // Validar autenticação do usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Authorization header ausente');
      return json({ success: false, error: 'Não autenticado' }, 401);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Erro de autenticação:', authError?.message);
      return json({ success: false, error: 'Sessão inválida' }, 401);
    }

    console.log('✅ Usuário autenticado:', user.id);

    // Client admin para acessar tenant_settings
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, tenantId, data } = body;
    
    console.log(`🔵 WAHA-API: ${action} para tenant ${tenantId}`);

    // Validar se o usuário tem acesso ao tenant
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ Erro ao buscar perfil:', profileError?.message);
      return json({ success: false, error: 'Perfil não encontrado' }, 403);
    }

    if (profile.current_tenant_id !== tenantId) {
      console.error('❌ Tentativa de acesso ao tenant não autorizado');
      return json({ success: false, error: 'Acesso negado ao tenant' }, 403);
    }

    // Get WAHA settings
    const { data: settings, error: settingsError } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenantId)
      .in('key', ['waha_api_url', 'waha_api_key', 'whatsapp_reject_calls', 'whatsapp_reject_calls_mode', 'whatsapp_reject_calls_start', 'whatsapp_reject_calls_end']);

    if (settingsError) {
      console.error('❌ Erro ao buscar settings:', settingsError.message);
      return json({ success: false, error: 'Erro ao buscar configurações' }, 500);
    }

    const cfg: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => cfg[s.key] = s.value);

    const baseUrl = cfg['waha_api_url']?.replace(/\/$/, '');
    const apiKey = cfg['waha_api_key'];

    if (!baseUrl || !apiKey) {
      console.error('❌ WAHA não configurado - URL:', !!baseUrl, 'Key:', !!apiKey);
      return json({ success: false, error: 'WAHA não configurado. Configure nas Configurações primeiro.' }, 400);
    }

    console.log('✅ WAHA configurado:', baseUrl);

    const session = `tenant_${tenantId.substring(0, 8)}`;
    let result: WAHAResponse;

    switch (action) {
      case 'get-qr':
        result = await getQRCode(baseUrl, apiKey, session);
        break;
      case 'get-status':
        result = await getStatus(baseUrl, apiKey, session);
        break;
      case 'logout':
        result = await logout(baseUrl, apiKey, session);
        break;
      case 'stop-session':
        result = await stopSession(baseUrl, apiKey, session);
        break;
      case 'send-message':
        result = await sendMessage(baseUrl, apiKey, session, data);
        break;
      case 'send-image':
        result = await sendImage(baseUrl, apiKey, session, data);
        break;
      case 'send-voice':
        result = await sendVoice(baseUrl, apiKey, session, data);
        break;
      case 'reject-call':
        result = await rejectCall(baseUrl, apiKey, session, data, cfg);
        break;
      case 'syncGroups':
        result = await syncGroups(baseUrl, apiKey, session, tenantId, supabase);
        break;
      default:
        result = { success: false, error: 'Ação inválida' };
    }

    return json(result);
  } catch (error) {
    console.error('❌ WAHA-API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return json({ success: false, error: errorMessage }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// ============================================
// GET QR CODE - Simple and Direct
// ============================================
async function getQRCode(baseUrl: string, apiKey: string, session: string): Promise<WAHAResponse> {
  const headers = { 'Accept': 'application/json', 'X-Api-Key': apiKey };

  try {
    console.log(`🔵 getQRCode: Verificando sessão ${session}`);
    
    // 1. Check if session exists and its status
    const statusRes = await fetch(`${baseUrl}/api/sessions/${session}`, { headers });
    
    let sessionStatus = 'NOT_FOUND';
    let sessionData: any = null;
    
    if (statusRes.ok) {
      sessionData = await statusRes.json();
      sessionStatus = sessionData.status;
      console.log(`✅ Status da sessão: ${sessionStatus}`);
    } else if (statusRes.status === 404) {
      console.log('ℹ️ Sessão não encontrada, será criada');
    } else {
      console.error(`❌ Erro ao verificar status: ${statusRes.status}`);
    }

    // 2. If already working, return connected
    if (sessionStatus === 'WORKING') {
      console.log('✅ Sessão já conectada');
      return { 
        success: false, 
        error: 'already_connected',
        data: { status: 'WORKING', me: sessionData?.me }
      };
    }

    // 3. If session is in SCAN_QR_CODE, get QR immediately
    if (sessionStatus === 'SCAN_QR_CODE') {
      console.log('🔵 Sessão aguardando QR, buscando...');
      const qr = await fetchQR(baseUrl, apiKey, session);
      if (qr) {
        console.log('✅ QR Code obtido imediatamente');
        return { success: true, data: { value: qr } };
      }
    }

    // 4. Create or restart session
    console.log('🔵 Criando ou reiniciando sessão...');
    await createOrRestartSession(baseUrl, apiKey, session);

    // 5. Wait for SCAN_QR_CODE status and get QR
    console.log('🔵 Aguardando QR Code...');
    const qr = await waitForQRAndFetch(baseUrl, apiKey, session);
    
    if (qr) {
      console.log('✅ QR Code gerado com sucesso');
      return { success: true, data: { value: qr } };
    }

    console.error('❌ Não foi possível gerar QR após todas as tentativas');
    return { success: false, error: 'Não foi possível gerar QR. Tente novamente.' };
  } catch (error) {
    console.error('❌ getQRCode error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Erro ao gerar QR Code';
    return { success: false, error: errorMsg };
  }
}

async function createOrRestartSession(baseUrl: string, apiKey: string, session: string): Promise<void> {
  const headers = { 
    'Accept': 'application/json', 
    'Content-Type': 'application/json',
    'X-Api-Key': apiKey 
  };

  // Try to start existing session first
  const startRes = await fetch(`${baseUrl}/api/sessions/${session}/start`, {
    method: 'POST',
    headers
  });

  if (startRes.ok) {
    console.log('Session started');
    return;
  }

  // Create new session
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/waha-webhook`;
  
  const createRes = await fetch(`${baseUrl}/api/sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: session,
      start: true,
      config: {
        webhooks: [{
          url: webhookUrl,
          events: ['message', 'session.status', 'call', 'call.received', 'call.accepted', 'call.rejected']
        }]
      }
    })
  });

  if (createRes.ok) {
    console.log('Session created');
  } else {
    const error = await createRes.text();
    console.log('Create session response:', error);
  }
}

async function waitForQRAndFetch(baseUrl: string, apiKey: string, session: string): Promise<string | null> {
  const headers = { 'Accept': 'application/json', 'X-Api-Key': apiKey };
  
  // Poll for SCAN_QR_CODE status - max 10 seconds
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    
    const res = await fetch(`${baseUrl}/api/sessions/${session}`, { headers });
    if (!res.ok) continue;
    
    const data = await res.json();
    console.log(`Poll ${i + 1}: ${data.status}`);
    
    if (data.status === 'WORKING') {
      return null; // Already connected
    }
    
    if (data.status === 'SCAN_QR_CODE') {
      // Get QR immediately
      const qr = await fetchQR(baseUrl, apiKey, session);
      if (qr) return qr;
    }
  }
  
  return null;
}

async function fetchQR(baseUrl: string, apiKey: string, session: string): Promise<string | null> {
  console.log(`🔵 fetchQR: Tentando buscar QR para ${session}`);
  
  // Method 1: GET image as base64 (most reliable according to docs)
  try {
    console.log('🔵 Método 1: Buscando como imagem PNG');
    const res = await fetch(`${baseUrl}/api/${session}/auth/qr`, {
      method: 'GET',
      headers: { 'Accept': 'image/png', 'X-Api-Key': apiKey }
    });
    
    if (res.ok && res.headers.get('content-type')?.includes('image')) {
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > 100) {
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        console.log(`✅ QR obtido como imagem (${buffer.byteLength} bytes)`);
        return base64;
      } else {
        console.log(`⚠️ Imagem muito pequena: ${buffer.byteLength} bytes`);
      }
    } else {
      console.log(`⚠️ Método 1 falhou: status ${res.status}, type: ${res.headers.get('content-type')}`);
    }
  } catch (e) {
    console.log('⚠️ Método 1 erro:', e instanceof Error ? e.message : e);
  }

  // Method 2: GET as JSON base64
  try {
    console.log('🔵 Método 2: Buscando como JSON');
    const res = await fetch(`${baseUrl}/api/${session}/auth/qr`, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'X-Api-Key': apiKey }
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.data) {
        console.log('✅ QR obtido como JSON base64');
        return data.data;
      }
      if (data.value) {
        console.log('✅ QR obtido como value');
        return data.value;
      }
      console.log('⚠️ JSON não contém data nem value:', Object.keys(data));
    } else {
      console.log(`⚠️ Método 2 falhou: status ${res.status}`);
    }
  } catch (e) {
    console.log('⚠️ Método 2 erro:', e instanceof Error ? e.message : e);
  }

  // Method 3: GET raw format
  try {
    console.log('🔵 Método 3: Buscando formato raw');
    const res = await fetch(`${baseUrl}/api/${session}/auth/qr?format=raw`, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'X-Api-Key': apiKey }
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.value) {
        console.log('✅ QR obtido como raw');
        return `raw:${data.value}`;
      }
      console.log('⚠️ Raw não contém value:', Object.keys(data));
    } else {
      console.log(`⚠️ Método 3 falhou: status ${res.status}`);
    }
  } catch (e) {
    console.log('⚠️ Método 3 erro:', e instanceof Error ? e.message : e);
  }

  console.error('❌ Nenhum método conseguiu obter o QR');
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// GET STATUS
// ============================================
async function getStatus(baseUrl: string, apiKey: string, session: string): Promise<WAHAResponse> {
  try {
    const res = await fetch(`${baseUrl}/api/sessions/${session}`, {
      headers: { 'Accept': 'application/json', 'X-Api-Key': apiKey }
    });

    if (res.status === 404) {
      return { success: true, data: { status: 'STOPPED', me: null } };
    }

    if (!res.ok) {
      return { success: false, error: 'Erro ao obter status' };
    }

    const data = await res.json();
    return { success: true, data: { status: data.status, me: data.me } };
  } catch (error) {
    console.error('getStatus error:', error);
    return { success: false, error: 'Erro de conexão' };
  }
}

// ============================================
// LOGOUT
// ============================================
async function logout(baseUrl: string, apiKey: string, session: string): Promise<WAHAResponse> {
  try {
    // WAHA docs: POST /api/sessions/{session}/logout
    const res = await fetch(`${baseUrl}/api/sessions/${session}/logout`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'X-Api-Key': apiKey }
    });

    if (res.ok) {
      return { success: true, data: { message: 'Desconectado' } };
    }

    // Fallback: delete session
    await fetch(`${baseUrl}/api/sessions/${session}`, {
      method: 'DELETE',
      headers: { 'X-Api-Key': apiKey }
    });

    return { success: true, data: { message: 'Sessão removida' } };
  } catch (error) {
    console.error('logout error:', error);
    return { success: false, error: 'Erro ao desconectar' };
  }
}

// ============================================
// STOP SESSION
// ============================================
async function stopSession(baseUrl: string, apiKey: string, session: string): Promise<WAHAResponse> {
  try {
    await fetch(`${baseUrl}/api/sessions/${session}/stop`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey }
    });
    return { success: true, data: { message: 'Sessão parada' } };
  } catch (error) {
    console.error('stopSession error:', error);
    return { success: false, error: 'Erro ao parar sessão' };
  }
}

// ============================================
// SEND MESSAGE
// ============================================
async function sendMessage(baseUrl: string, apiKey: string, session: string, data: { phone: string; message: string }): Promise<WAHAResponse> {
  try {
    const chatId = data.phone.replace(/\D/g, '') + '@c.us';

    const res = await fetch(`${baseUrl}/api/sendText`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify({
        session,
        chatId,
        text: data.message
      })
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('sendMessage error:', error);
      return { success: false, error: 'Erro ao enviar mensagem' };
    }

    return { success: true, data: await res.json() };
  } catch (error) {
    console.error('sendMessage error:', error);
    return { success: false, error: 'Erro ao enviar mensagem' };
  }
}

// ============================================
// SEND IMAGE
// ============================================
async function sendImage(baseUrl: string, apiKey: string, session: string, data: { phone: string; imageUrl: string; caption?: string }): Promise<WAHAResponse> {
  try {
    const chatId = data.phone.replace(/\D/g, '') + '@c.us';

    const res = await fetch(`${baseUrl}/api/sendImage`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify({
        session,
        chatId,
        file: { url: data.imageUrl },
        caption: data.caption || ''
      })
    });

    if (!res.ok) {
      return { success: false, error: 'Erro ao enviar imagem' };
    }

    return { success: true, data: await res.json() };
  } catch (error) {
    console.error('sendImage error:', error);
    return { success: false, error: 'Erro ao enviar imagem' };
  }
}

// ============================================
// SEND VOICE (PTT)
// ============================================
async function sendVoice(baseUrl: string, apiKey: string, session: string, data: { phone: string; audioUrl: string }): Promise<WAHAResponse> {
  try {
    const chatId = data.phone.replace(/\D/g, '') + '@c.us';

    // WAHA Plus endpoint for voice
    const res = await fetch(`${baseUrl}/api/sendVoice`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify({
        session,
        chatId,
        file: { url: data.audioUrl }
      })
    });

    if (!res.ok) {
      // Fallback to sendFile if sendVoice is not available (Core version)
      console.log('sendVoice failed, trying sendFile as fallback');
      const fallbackRes = await fetch(`${baseUrl}/api/sendFile`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey
        },
        body: JSON.stringify({
          session,
          chatId,
          file: { url: data.audioUrl }
        })
      });

      if (!fallbackRes.ok) {
        return { success: false, error: 'Erro ao enviar áudio' };
      }
      return { success: true, data: await fallbackRes.json() };
    }

    return { success: true, data: await res.json() };
  } catch (error) {
    console.error('sendVoice error:', error);
    return { success: false, error: 'Erro ao enviar áudio' };
  }
}

// ============================================
// REJECT CALL
// ============================================
async function rejectCall(baseUrl: string, apiKey: string, session: string, data: { callId: string }, cfg: Record<string, string>): Promise<WAHAResponse> {
  try {
    const rejectEnabled = cfg['whatsapp_reject_calls'] === 'true';
    if (!rejectEnabled) {
      return { success: false, error: 'Rejeição de chamadas desabilitada' };
    }

    const mode = cfg['whatsapp_reject_calls_mode'] || 'all';
    
    if (mode === 'scheduled') {
      const start = cfg['whatsapp_reject_calls_start'] || '08:00';
      const end = cfg['whatsapp_reject_calls_end'] || '18:00';
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentTime < start || currentTime > end) {
        return { success: false, error: 'Fora do horário de rejeição' };
      }
    }

    const res = await fetch(`${baseUrl}/api/${session}/calls/${data.callId}/reject`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey }
    });

    return { success: res.ok, data: { rejected: res.ok } };
  } catch (error) {
    console.error('rejectCall error:', error);
    return { success: false, error: 'Erro ao rejeitar chamada' };
  }
}

// ============================================
// SYNC GROUPS
// ============================================
async function syncGroups(baseUrl: string, apiKey: string, session: string, tenantId: string, supabase: any): Promise<WAHAResponse> {
  try {
    const headers = { 
      'Accept': 'application/json', 
      'X-Api-Key': apiKey 
    };

    // Use the groups endpoint which returns participant data
    const groupsRes = await fetch(`${baseUrl}/api/${session}/groups`, {
      method: 'GET',
      headers
    });

    if (!groupsRes.ok) {
      const errorText = await groupsRes.text();
      console.error('Failed to fetch groups:', errorText);
      return { success: false, error: 'Erro ao buscar grupos do WhatsApp' };
    }

    const groupsData = await groupsRes.json();
    const groups = Array.isArray(groupsData) ? groupsData : [];
    console.log(`Found ${groups.length} groups`);
    
    // Log first group structure for debugging
    if (groups.length > 0) {
      console.log('Sample group structure:', JSON.stringify(groups[0], null, 2));
    }

    // Upsert each group to database
    const upsertPromises = groups.map(async (group: any) => {
      // Data might be in groupMetadata (WAHA format)
      const metadata = group.groupMetadata || group;
      
      // Handle different id formats
      const idSource = metadata.id || group.id;
      const groupId = typeof idSource === 'string' 
        ? idSource 
        : (idSource?._serialized || (idSource?.user ? `${idSource.user}@${idSource.server}` : String(idSource || '')));
      
      // Get participant count - check groupMetadata first, then fallback
      const participants = metadata.participants || group.participants || [];
      const participantCount = metadata.size || participants.length || group.participantsCount || group.size || 0;
      
      // Check if current user is admin - check in groupMetadata
      const isAdmin = group.isAdmin || 
        group.iAmAdmin ||
        metadata.announce !== undefined ||
        false;
      
      // Get group name from various possible fields
      const groupName = metadata.subject || metadata.name || group.name || group.subject || groupId;

      console.log(`Group "${groupName}": ${participantCount} participants (size: ${metadata.size}, array: ${participants.length})`);

      const groupData = {
        tenant_id: tenantId,
        waha_group_id: groupId,
        name: groupName,
        participant_count: participantCount,
        is_admin: isAdmin,
        synced_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('whatsapp_groups')
        .upsert(groupData, { 
          onConflict: 'tenant_id,waha_group_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`Error upserting group ${groupId}:`, error);
      }

      return error ? null : groupData;
    });

    await Promise.all(upsertPromises);

    return { 
      success: true, 
      data: { 
        synced: groups.length,
        message: `${groups.length} grupos sincronizados` 
      } 
    };
  } catch (error) {
    console.error('syncGroups error:', error);
    return { success: false, error: 'Erro ao sincronizar grupos' };
  }
}
