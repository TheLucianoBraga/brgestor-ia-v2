import { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  MessageSquare, 
  Clock, 
  History, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  LogOut, 
  Trash2, 
  Send,
  PhoneOff,
  Phone,
  Pause,
  Play,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Receipt,
  CreditCard,
  Mail,
  Calendar
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useScheduledMessages } from '@/hooks/useScheduledMessages';
import { useChargeSchedules } from '@/hooks/useChargeSchedules';
import { useTemplates } from '@/hooks/useTemplates';
import { useTenant } from '@/contexts/TenantContext';
import { useChargeScheduleGenerator } from '@/hooks/useChargeScheduleGenerator';
import { useWahaCreateSession } from '@/hooks/useWahaCreateSession';
import { supabase } from '@/lib/supabase-postgres';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScheduleMessageModal } from '@/components/templates/ScheduleMessageModal';

interface WAHAStatus {
  status: 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED';
  me?: {
    id: string;
    pushName?: string;
  } | null;
}

// Interface para Evolution API (API 2)
interface EvolutionStatus {
  instance?: {
    instanceName: string;
    state: 'open' | 'close' | 'connecting';
  };
  qrcode?: {
    base64?: string;
  };
}

export default function WhatsApp() {
  const { settings, getSetting, updateMultipleSettings } = useTenantSettings();
  const { scheduledMessages, isLoading: messagesLoading, deleteScheduledMessage, retryScheduledMessage, cancelScheduledMessage, createScheduledMessage } = useScheduledMessages();
  const { 
    schedules: chargeSchedules,
    pendingChargeSchedules, 
    sentChargeSchedules, 
    failedChargeSchedules,
    isLoading: chargesLoading, 
    cancelSchedule: cancelChargeSchedule, 
    deleteSchedule: deleteChargeSchedule, 
    retrySchedule: retryChargeSchedule 
  } = useChargeSchedules();
  const { templates } = useTemplates();
  const { currentTenant } = useTenant();
  const { pendingCount, testScheduledCharges, isLoadingCount } = useChargeScheduleGenerator();
  const wahaCreateSession = useWahaCreateSession();

  // API Provider state
  const [selectedApiProvider, setSelectedApiProvider] = useState<'api1' | 'api2'>('api1');

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'waiting_qr'>('disconnected');
  const [connectedPhone, setConnectedPhone] = useState('');
  const [connectedName, setConnectedName] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Automation state
  const [automationPaused, setAutomationPaused] = useState(false);
  
  // Test message
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Olá! Esta é uma mensagem de teste do Gestor Braga.');

  // Call rejection settings
  const [rejectCalls, setRejectCalls] = useState(false);
  const [rejectCallsMode, setRejectCallsMode] = useState<'all' | 'scheduled'>('all');
  const [rejectCallsStartTime, setRejectCallsStartTime] = useState('08:00');
  const [rejectCallsEndTime, setRejectCallsEndTime] = useState('18:00');

  // Schedule modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Check which API is configured
  useEffect(() => {
    if (settings) {
      const provider = getSetting('whatsapp_api_provider') as 'api1' | 'api2' || 'api1';
      setSelectedApiProvider(provider);
      
      // Check if selected API is configured
      if (provider === 'api1') {
        const api1Url = getSetting('waha_api_url');
        const api1Key = getSetting('waha_api_key');
        setApiConfigured(!!(api1Url && api1Key));
      } else {
        const api2Url = getSetting('api2_url');
        const api2Key = getSetting('api2_api_key');
        setApiConfigured(!!(api2Url && api2Key));
      }
      
      setAutomationPaused(getSetting('whatsapp_automation_paused') === 'true');
      setRejectCalls(getSetting('whatsapp_reject_calls') === 'true');
      setRejectCallsMode(getSetting('whatsapp_reject_calls_mode') as 'all' | 'scheduled' || 'all');
      setRejectCallsStartTime(getSetting('whatsapp_reject_calls_start') || '08:00');
      setRejectCallsEndTime(getSetting('whatsapp_reject_calls_end') || '18:00');
    }
  }, [settings, getSetting]);

  // Auto-refresh status on mount and periodically when connected
  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout | null = null;
    
    const checkStatusApi1 = async () => {
      if (!currentTenant?.id || !mounted) return;
      
      const apiUrl = getSetting('waha_api_url')!;
      const apiKey = getSetting('waha_api_key')!;
      const sessionName = `tenant_${currentTenant.id.substring(0, 8)}`;
      
      try {
        const res = await fetch(`${apiUrl}/api/sessions/${sessionName}`, {
          method: 'GET',
          headers: { 'X-Api_Key': apiKey },
        });
        
        if (res.ok && mounted) {
          const data = await res.json();
          const status = data.status as WAHAStatus['status'];
          
          if (status === 'WORKING') {
            setConnectionStatus('connected');
            setQrCode('');
            
            if (data.me) {
              const phoneId = data.me.id?.split('@')[0] || '';
              setConnectedPhone(phoneId);
              setConnectedName(data.me.pushName || '');
            }
          } else if (status === 'SCAN_QR_CODE') {
            setConnectionStatus('waiting_qr');
          } else {
            setConnectionStatus('disconnected');
          }
        }
      } catch (error) {
        console.error('API 1 status check error:', error);
        if (mounted) setConnectionStatus('disconnected');
      }
    };

    const checkStatusApi2 = async () => {
      if (!currentTenant?.id || !mounted) return;
      
      const apiUrl = getSetting('api2_url')!;
      const apiKey = getSetting('api2_api_key')!;
      const instanceName = `tenant_${currentTenant.id.substring(0, 8)}`;
      
      try {
        const res = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': apiKey },
        });
        
        if (res.ok && mounted) {
          const data = await res.json();
          
          if (data.instance?.state === 'open') {
            setConnectionStatus('connected');
            setQrCode('');
            // API 2 pode não retornar phone/name no connectionState
          } else if (data.instance?.state === 'connecting') {
            setConnectionStatus('waiting_qr');
          } else {
            setConnectionStatus('disconnected');
          }
        }
      } catch (error) {
        console.error('API 2 status check error:', error);
        if (mounted) setConnectionStatus('disconnected');
      }
    };
    
    const checkStatus = async () => {
      if (apiConfigured && currentTenant?.id && mounted) {
        setIsRefreshing(true);
        try {
          if (selectedApiProvider === 'api1') {
            await checkStatusApi1();
          } else {
            await checkStatusApi2();
          }
        } finally {
          if (mounted) {
            setIsRefreshing(false);
          }
        }
      }
    };
    
    // Initial check
    checkStatus();
    
    // Set up auto-refresh every 30 seconds when API is configured
    if (apiConfigured && currentTenant?.id) {
      intervalId = setInterval(checkStatus, 30000);
    }
    
    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiConfigured, currentTenant?.id, selectedApiProvider]);

  const formatQrCodeValue = (value?: string) => {
    if (!value) {
      return null;
    }

    if (value.startsWith('data:image/')) {
      return value;
    }

    if (value.startsWith('raw:')) {
      const rawValue = value.substring(4);
      return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(rawValue)}`;
    }

    return value.startsWith('data:') ? value : `data:image/png;base64,${value}`;
  };

  const handleGenerateQRCode = async () => {
    if (!apiConfigured) {
      toast.error('Configure a URL e Token da API nas Configurações primeiro');
      return;
    }

    setIsRefreshing(true);
    setConnectionStatus('waiting_qr');
    setQrCode('');

    try {
      const instanceName = `tenant_${currentTenant?.id?.substring(0, 8) || 'default'}`;
      
      if (selectedApiProvider === 'api1') {
        await generateQRCodeApi1(instanceName);
      } else {
        await generateQRCodeApi2(instanceName);
      }
    } catch (error) {
      console.error('QR error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro de conexão');
      setConnectionStatus('disconnected');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Generate QR Code for API 1
  const generateQRCodeApi1 = async (sessionName: string) => {
    const apiUrl = getSetting('waha_api_url')!;
    const apiKey = getSetting('waha_api_key')!;
    const webhookUrl = `https://brgestor.com/api/webhooks/whatsapp`;
    
    console.log('🔵 [API 1] Gerando QR Code...', sessionName);
    
    // Step 1: Criar/iniciar sessão COM WEBHOOK
    try {
      const createRes = await fetch(`${apiUrl}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content_Type': 'application/json',
          'X-Api_Key': apiKey,
        },
        body: JSON.stringify({
          name: sessionName,
          start: true,
          config: {
            webhooks: [{
              url: webhookUrl,
              events: ['message']
            }]
          }
        }),
      });
      
      if (!createRes.ok && createRes.status === 422) {
        // Sessão já existe, tentar iniciar
        await fetch(`${apiUrl}/api/sessions/${sessionName}/start`, {
          method: 'POST',
          headers: { 'X-Api_Key': apiKey },
        });
      }
    } catch (e) {
      console.log('Erro na criação:', e);
    }

    // Step 2: Aguardar e buscar QR Code
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusRes = await fetch(`${apiUrl}/api/sessions/${sessionName}`, {
        method: 'GET',
        headers: { 'X-Api_Key': apiKey },
      });

      if (statusRes.ok) {
        const statusData = await statusRes.json();

        if (statusData.status === 'WORKING') {
          setConnectionStatus('connected');
          setQrCode('');
          toast.info('WhatsApp já está conectado');
          return;
        }

        if (statusData.status === 'SCAN_QR_CODE') {
          const qrRes = await fetch(`${apiUrl}/api/${sessionName}/auth/qr`, {
            method: 'GET',
            headers: {
              'X-Api_Key': apiKey,
              'Accept': 'image/png',
            },
          });

          if (qrRes.ok && qrRes.headers.get('content_type')?.includes('image')) {
            const buffer = await qrRes.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            setQrCode(`data:image/png;base64,${base64}`);
            toast.success('QR Code gerado! Escaneie com seu WhatsApp');
            startStatusPolling();
            return;
          }
        }
      }
    }

    toast.error('Não foi possível gerar o QR Code');
    setConnectionStatus('disconnected');
  };

  // Generate QR Code for API 2 (Evolution)
  const generateQRCodeApi2 = async (instanceName: string) => {
    const apiUrl = getSetting('api2_url')!;
    const apiKey = getSetting('api2_api_key')!;
    const webhookUrl = `https://brgestor.com/api/webhooks/evolution`;
    
    console.log('🔵 [API 2] Gerando QR Code...', instanceName);
    
    // Step 1: Criar instância
    try {
      const createRes = await fetch(`${apiUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content_Type': 'application/json',
          'apikey': apiKey,
        },
        body: JSON.stringify({
          instanceName: instanceName,
          qrcode: true,
          integration: 'WHATSAPP_BAILEYS',
        }),
      });
      
      if (!createRes.ok) {
        const errorData = await createRes.json();
        // Instância já existe - tentar conectar
        if (errorData.message?.includes('already') || createRes.status === 403) {
          console.log('Instância já existe, buscando QR...');
        }
      }
    } catch (e) {
      console.log('Erro na criação:', e);
    }

    // Step 2: Configurar webhook
    try {
      await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content_Type': 'application/json',
          'apikey': apiKey,
        },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: true,
            events: ['MESSAGES_UPSERT']
          }
        }),
      });
      console.log('✅ Webhook configurado para Evolution IA');
    } catch (e) {
      console.error('❌ Erro ao configurar webhook:', e);
    }

    // Step 3: Conectar instância e buscar QR
    try {
      const connectRes = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': apiKey },
      });

      if (connectRes.ok) {
        const data = await connectRes.json();
        
        if (data.base64) {
          // QR Code retornado diretamente
          const qrData = data.base64.startsWith('data:') ? data.base64 : `data:image/png;base64,${data.base64}`;
          setQrCode(qrData);
          toast.success('QR Code gerado! Escaneie com seu WhatsApp');
          startStatusPollingApi2();
          return;
        }
      }
    } catch (e) {
      console.log('Erro ao conectar:', e);
    }

    // Fallback: buscar QR Code via endpoint específico
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1500));

      try {
        // Verificar estado
        const stateRes = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': apiKey },
        });

        if (stateRes.ok) {
          const stateData = await stateRes.json();
          
          if (stateData.instance?.state === 'open') {
            setConnectionStatus('connected');
            setQrCode('');
            toast.info('WhatsApp já está conectado');
            return;
          }
        }

        // Buscar QR
        const qrRes = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': apiKey },
        });

        if (qrRes.ok) {
          const qrData = await qrRes.json();
          if (qrData.base64) {
            const qr = qrData.base64.startsWith('data:') ? qrData.base64 : `data:image/png;base64,${qrData.base64}`;
            setQrCode(qr);
            toast.success('QR Code gerado! Escaneie com seu WhatsApp');
            startStatusPollingApi2();
            return;
          }
        }
      } catch (e) {
        console.log(`Tentativa ${attempt + 1} falhou:`, e);
      }
    }

    toast.error('Não foi possível gerar o QR Code');
    setConnectionStatus('disconnected');
  };

  // Polling for API 2 (Evolution)
  const startStatusPollingApi2 = () => {
    let attempts = 0;
    const maxAttempts = 60;
    
    const poll = setInterval(async () => {
      attempts++;
      
      if (attempts >= maxAttempts) {
        clearInterval(poll);
        toast.error('Tempo esgotado. Tente gerar um novo QR Code');
        setConnectionStatus('disconnected');
        setQrCode('');
        return;
      }

      try {
        const instanceName = `tenant_${currentTenant?.id?.substring(0, 8) || 'default'}`;
        const apiUrl = getSetting('api2_url')!;
        const apiKey = getSetting('api2_api_key')!;
        
        const res = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': apiKey },
        });
        
        if (res.ok) {
          const data = await res.json();
          
          if (data.instance?.state === 'open') {
            clearInterval(poll);
            setConnectionStatus('connected');
            setQrCode('');
            toast.success('WhatsApp conectado com sucesso!');
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
  };

  const startStatusPolling = () => {
    let attempts = 0;
    const maxAttempts = 60; // Poll for up to 2 minutes
    
    const poll = setInterval(async () => {
      attempts++;
      
      if (attempts >= maxAttempts) {
        clearInterval(poll);
        toast.error('Tempo esgotado. Tente gerar um novo QR Code');
        setConnectionStatus('disconnected');
        setQrCode('');
        return;
      }

      try {
        const sessionName = `tenant_${currentTenant?.id?.substring(0, 8) || 'default'}`;
        const wahaUrl = getSetting('waha_api_url')!;
        const wahaKey = getSetting('waha_api_key')!;
        
        const res = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
          method: 'GET',
          headers: { 'X-Api_Key': wahaKey },
        });
        
        if (res.ok) {
          const data = await res.json();
          const status = data.status as WAHAStatus['status'];
          
          if (status === 'WORKING') {
            clearInterval(poll);
            setConnectionStatus('connected');
            setQrCode('');
            
            if (data.me) {
              const phoneId = data.me.id?.split('@')[0] || '';
              setConnectedPhone(phoneId);
              setConnectedName(data.me.pushName || '');
            }
            
            // Configurar webhook após conectar via QR
            console.log('✅ Conectado! Configurando webhook...');
            const webhookUrl = `https://brgestor.com/api/webhooks/whatsapp`;
            try {
              await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
                method: 'PUT',
                headers: {
                  'Content_Type': 'application/json',
                  'X-Api_Key': wahaKey,
                },
                body: JSON.stringify({
                  name: sessionName,
                  config: {
                    webhooks: [{
                      url: webhookUrl,
                      events: ['message']
                    }]
                  }
                }),
              });
              console.log('✅ Webhook configurado - IA ativa!');
            } catch (e) {
              console.log('⚠️ Erro ao configurar webhook:', e);
            }
            
            toast.success('WhatsApp conectado com sucesso!');
          } else if (status === 'FAILED' || status === 'STOPPED') {
            clearInterval(poll);
            setConnectionStatus('disconnected');
            setQrCode('');
            toast.error('Falha na conexão');
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
  };

  const handleRefreshStatus = async () => {
    if (!apiConfigured) {
      setConnectionStatus('disconnected');
      return;
    }

    setIsRefreshing(true);
    try {
      const instanceName = `tenant_${currentTenant?.id?.substring(0, 8) || 'default'}`;
      
      if (selectedApiProvider === 'api1') {
        const apiUrl = getSetting('waha_api_url')!;
        const apiKey = getSetting('waha_api_key')!;
        
        const res = await fetch(`${apiUrl}/api/sessions/${instanceName}`, {
          method: 'GET',
          headers: { 'X-Api_Key': apiKey },
        });
        
        if (res.ok) {
          const data = await res.json();
          const status = data.status as WAHAStatus['status'];
          
          if (status === 'WORKING') {
            setConnectionStatus('connected');
            setQrCode('');
            if (data.me) {
              const phoneId = data.me.id?.split('@')[0] || '';
              setConnectedPhone(phoneId);
              setConnectedName(data.me.pushName || '');
            }
          } else if (status === 'SCAN_QR_CODE') {
            setConnectionStatus('waiting_qr');
          } else {
            setConnectionStatus('disconnected');
            setConnectedPhone('');
            setConnectedName('');
            setQrCode('');
          }
          toast.success('Status atualizado');
        } else {
          setConnectionStatus('disconnected');
          toast.error('Erro ao verificar status');
        }
      } else {
        // API 2
        const apiUrl = getSetting('api2_url')!;
        const apiKey = getSetting('api2_api_key')!;
        
        const res = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': apiKey },
        });
        
        if (res.ok) {
          const data = await res.json();
          
          if (data.instance?.state === 'open') {
            setConnectionStatus('connected');
            setQrCode('');
          } else if (data.instance?.state === 'connecting') {
            setConnectionStatus('waiting_qr');
          } else {
            setConnectionStatus('disconnected');
            setConnectedPhone('');
            setConnectedName('');
            setQrCode('');
          }
          toast.success('Status atualizado');
        } else {
          setConnectionStatus('disconnected');
          toast.error('Erro ao verificar status');
        }
      }
    } catch (error) {
      console.error('Error refreshing status:', error);
      setConnectionStatus('disconnected');
      toast.error('Erro ao atualizar status');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    setIsRefreshing(true);
    try {
      const instanceName = `tenant_${currentTenant?.id?.substring(0, 8) || 'default'}`;
      
      if (selectedApiProvider === 'api1') {
        const apiUrl = getSetting('waha_api_url')!;
        const apiKey = getSetting('waha_api_key')!;
        
        await fetch(`${apiUrl}/api/sessions/${instanceName}/stop`, {
          method: 'POST',
          headers: { 'X-Api_Key': apiKey },
        });
      } else {
        const apiUrl = getSetting('api2_url')!;
        const apiKey = getSetting('api2_api_key')!;
        
        await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers: { 'apikey': apiKey },
        });
      }
      
      setConnectionStatus('disconnected');
      setConnectedPhone('');
      setConnectedName('');
      setQrCode('');
      toast.success('Sessão desconectada');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Erro ao desconectar');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearSession = async () => {
    setIsRefreshing(true);
    try {
      const instanceName = `tenant_${currentTenant?.id?.substring(0, 8) || 'default'}`;
      
      if (selectedApiProvider === 'api1') {
        const apiUrl = getSetting('waha_api_url')!;
        const apiKey = getSetting('waha_api_key')!;
        
        await fetch(`${apiUrl}/api/sessions/${instanceName}/stop`, {
          method: 'POST',
          headers: { 'X-Api_Key': apiKey },
        });
      } else {
        const apiUrl = getSetting('api2_url')!;
        const apiKey = getSetting('api2_api_key')!;
        
        await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: { 'apikey': apiKey },
        });
      }
      
      setConnectionStatus('disconnected');
      setConnectedPhone('');
      setConnectedName('');
      setQrCode('');
      
      toast.success('Sessão limpa com sucesso');
    } catch (error) {
      console.error('Error clearing session:', error);
      toast.error('Erro ao limpar sessão');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testPhone) {
      toast.error('Informe o número do WhatsApp');
      return;
    }
    
    if (connectionStatus !== 'connected') {
      toast.error('WhatsApp não está conectado');
      return;
    }

    setIsSendingTest(true);
    try {
      const instanceName = `tenant_${currentTenant?.id?.substring(0, 8) || 'default'}`;
      
      if (selectedApiProvider === 'api1') {
        const apiUrl = getSetting('waha_api_url')!;
        const apiKey = getSetting('waha_api_key')!;
        
        const res = await fetch(`${apiUrl}/api/sendText`, {
          method: 'POST',
          headers: {
            'Content_Type': 'application/json',
            'X-Api_Key': apiKey,
          },
          body: JSON.stringify({
            session: instanceName,
            chatId: `${testPhone}@c.us`,
            text: testMessage,
          }),
        });

        if (res.ok) {
          toast.success('Mensagem de teste enviada com sucesso!');
        } else {
          toast.error('Erro ao enviar mensagem');
        }
      } else {
        const apiUrl = getSetting('api2_url')!;
        const apiKey = getSetting('api2_api_key')!;
        
        const res = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content_Type': 'application/json',
            'apikey': apiKey,
          },
          body: JSON.stringify({
            number: testPhone,
            text: testMessage,
          }),
        });

        if (res.ok) {
          toast.success('Mensagem de teste enviada com sucesso!');
        } else {
          toast.error('Erro ao enviar mensagem');
        }
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      toast.error('Erro ao enviar mensagem de teste');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleToggleAutomation = async () => {
    const newValue = !automationPaused;
    setAutomationPaused(newValue);
    await updateMultipleSettings.mutateAsync({
      whatsapp_automation_paused: newValue ? 'true' : 'false'
    });
  };

  const handleSaveRejectCallsSettings = async () => {
    await updateMultipleSettings.mutateAsync({
      whatsapp_reject_calls: rejectCalls ? 'true' : 'false',
      whatsapp_reject_calls_mode: rejectCallsMode,
      whatsapp_reject_calls_start: rejectCallsStartTime,
      whatsapp_reject_calls_end: rejectCallsEndTime
    });
    toast.success('Configurações de recusa de ligações salvas');
  };

  // Filter pending and sent/failed messages (exclude cancelled - those removed automatically)
  const pendingMessages = scheduledMessages?.filter(m => m.status === 'pending') || [];
  const sentMessages = scheduledMessages?.filter(m => m.status === 'sent' || m.status === 'failed') || [];

  // Filter charge schedules for history (only sent and failed, not cancelled)
  const historyChargeSchedules = useMemo(() => {
    return [...sentChargeSchedules, ...failedChargeSchedules].filter(s => s.status !== 'cancelled');
  }, [sentChargeSchedules, failedChargeSchedules]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case 'sent':
        return <Badge className="bg-emerald-500/20 text-emerald-500 gap-1"><CheckCircle2 className="h-3 w-3" /> Enviada</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Falhou</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" /> Cancelada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="page-container space-y-4 sm:space-y-6">
      {/* Connection Status Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 rounded-lg border ${
        connectionStatus === 'connected' 
          ? 'bg-emerald-500/10 border-emerald-500/30' 
          : connectionStatus === 'waiting_qr'
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-destructive/10 border-destructive/30'
      }`}>
        <div className="flex items-center gap-2 sm:gap-3">
          {connectionStatus === 'connected' ? (
            <Wifi className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 flex-shrink-0" />
          ) : connectionStatus === 'waiting_qr' ? (
            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 animate-spin flex-shrink-0" />
          ) : (
            <WifiOff className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className={`font-medium text-xs sm:text-sm truncate ${
              connectionStatus === 'connected' 
                ? 'text-emerald_600' 
                : connectionStatus === 'waiting_qr'
                ? 'text-amber_600'
                : 'text_destructive'
            }`}>
              {connectionStatus === 'connected' 
                ? `Conectado${connectedName ? ` - ${connectedName}` : ''}`
                : connectionStatus === 'waiting_qr'
                ? 'Aguardando QR Code...'
                : 'Desconectado'}
            </p>
            {connectionStatus === 'connected' && connectedPhone && (
              <p className="text-xs text-muted-foreground">+{connectedPhone}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
            className="h-8 px-2 sm:px-3"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isRefreshing ? 'animate_spin' : ''}`} />
          </Button>
          {connectionStatus === 'connected' && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDisconnect}
                disabled={isRefreshing}
                className="h-8 px-2 sm:px-3 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
              >
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline ml-1">Desconectar</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearSession}
                disabled={isRefreshing}
                className="h-8 px-2 sm:px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline ml-1">Limpar</span>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader
          title="Automação de Cobranças"
          description="Configure o envio automático de cobranças por WhatsApp"
          icon={Zap}
        />
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="outline" onClick={() => setIsScheduleModalOpen(true)} className="h-8 sm:h-10 text-xs sm:text-sm px-2 sm:px-4">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline ml-1.5">Agendar Mensagem</span>
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {automationPaused ? 'Automação Pausada' : 'Automação Ativa'}
            </span>
            <Switch
              checked={!automationPaused}
              onCheckedChange={handleToggleAutomation}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="whatsapp" className="space-y-3 sm:space-y-4">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:w-auto">
            <TabsTrigger value="whatsapp" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
              <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="fila" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Fila</span>
              {(pendingMessages.length + pendingChargeSchedules.length) > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs">
                  {pendingMessages.length + pendingChargeSchedules.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
              <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Histórico</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="whatsapp" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Connection Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-primary" />
                  Conexão WhatsApp
                  <Badge variant="outline" className="text-xs ml-2">
                    {selectedApiProvider === 'api1' ? 'API 1' : 'API 2'}
                  </Badge>
                </CardTitle>
                <CardDescription>Status da integração com WhatsApp</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!apiConfigured && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Configure a URL e Token da API nas Configurações → Integrações antes de conectar.
                    </AlertDescription>
                  </Alert>
                )}

                {connectionStatus === 'connected' ? (
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-emerald-600">Conectado</p>
                        <p className="text-sm text-muted-foreground">Status: WORKING</p>
                        {connectedName && (
                          <p className="text-sm text-muted-foreground">{connectedName}</p>
                        )}
                        {connectedPhone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> +{connectedPhone}
                          </p>
                        )}
                      </div>
                      <Badge className="bg-emerald-500">Online</Badge>
                    </div>
                  </div>
                ) : connectionStatus === 'waiting_qr' && qrCode ? (
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex flex-col items-center gap-4">
                      <p className="font-medium text-amber-600">Aguardando Leitura do QR Code</p>
                      <img src={qrCode} alt="QR Code" className="w-56 h-56 rounded-lg border" />
                      <p className="text-sm text-muted-foreground text-center">
                        Abra o WhatsApp no seu celular → Menu → Aparelhos conectados → Conectar um aparelho
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleRefreshStatus} disabled={isRefreshing}>
                          <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate_spin' : ''}`} />
                          Atualizar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setQrCode(''); setConnectionStatus('disconnected'); }}>
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-destructive">Desconectado</p>
                        <p className="text-sm text-muted-foreground">
                          {apiConfigured 
                            ? 'Clique em "Gerar QR Code" para conectar' 
                            : 'Configure a API nas Configurações → Integrações'}
                        </p>
                      </div>
                      <WifiOff className="h-8 w-8 text-destructive" />
                    </div>
                  </div>
                )}

                {/* Seletor de API - aparece quando desconectado */}
                {connectionStatus === 'disconnected' && apiConfigured && (
                  <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
                    <p className="text-sm font-medium">Escolha a API para conectar:</p>
                    <div className="flex gap-2">
                      <Button
                        variant={selectedApiProvider === 'api1' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={async () => {
                          setSelectedApiProvider('api1');
                          await updateMultipleSettings.mutateAsync({ whatsapp_api_provider: 'api1' });
                        }}
                      >
                        API 1 {selectedApiProvider === 'api1' && '✓'}
                      </Button>
                      <Button
                        variant={selectedApiProvider === 'api2' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={async () => {
                          setSelectedApiProvider('api2');
                          await updateMultipleSettings.mutateAsync({ whatsapp_api_provider: 'api2' });
                        }}
                      >
                        API 2 {selectedApiProvider === 'api2' && '✓'}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefreshStatus}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate_spin' : ''}`} />
                    Atualizar
                  </Button>
                  
                  {connectionStatus === 'disconnected' && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={handleGenerateQRCode}
                        disabled={isRefreshing}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Wifi className="h-4 w-4 mr-1" />
                        Gerar QR Code
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm" 
                        onClick={handleClearSession}
                        disabled={isRefreshing}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Limpar Sessão
                      </Button>
                    </>
                  )}
                  
                  {connectionStatus === 'waiting_qr' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleClearSession}
                      disabled={isRefreshing}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  )}
                  
                  {connectionStatus === 'connected' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDisconnect}
                        disabled={isRefreshing}
                      >
                        <LogOut className="h-4 w-4 mr-1" />
                        Desconectar
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={handleClearSession}
                        disabled={isRefreshing}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Limpar Sessão
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Test Message Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5 text-emerald-500" />
                  Teste de Envio
                </CardTitle>
                <CardDescription>Envie uma mensagem de teste para verificar a integração</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Número WhatsApp</Label>
                  <Input
                    placeholder="5511999999999"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    placeholder="Digite a mensagem de teste..."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleSendTestMessage}
                  disabled={connectionStatus !== 'connected' || isSendingTest}
                >
                  {isSendingTest ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {isSendingTest ? 'Enviando...' : 'Enviar Mensagem de Teste'}
                </Button>
              </CardContent>
            </Card>

            {/* Test Scheduled Charges Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-amber-500" />
                  Testar Cobranças Agendadas
                </CardTitle>
                <CardDescription>
                  Dispare manualmente o processamento das cobranças agendadas para testar a integração
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-amber-500/10">
                      <Clock className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium">Cobranças Pendentes</p>
                      <p className="text-sm text-muted-foreground">
                        {isLoadingCount ? (
                          <Loader2 className="h-3 w-3 animate-spin inline" />
                        ) : (
                          <strong>{pendingCount}</strong>
                        )}{' '}
                        agendamentos aguardando envio
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full"
                  variant="secondary"
                  onClick={() => testScheduledCharges.mutate()}
                  disabled={connectionStatus !== 'connected' || testScheduledCharges.isPending}
                >
                  {testScheduledCharges.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {testScheduledCharges.isPending ? 'Processando...' : 'Processar Cobranças Agora'}
                </Button>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Este botão processa imediatamente todas as cobranças agendadas que já estão no horário. 
                    Use para testar se a integração WAHA está funcionando corretamente.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Reject Calls Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PhoneOff className="h-5 w-5 text-destructive" />
                Recusar Ligações Automaticamente
              </CardTitle>
              <CardDescription>
                Ao receber uma ligação, ela será recusada automaticamente e uma mensagem será enviada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-destructive/10">
                    <PhoneOff className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium">Recusa Ativa</p>
                    <p className="text-sm text-muted-foreground">
                      Ligações serão recusadas automaticamente
                    </p>
                  </div>
                </div>
                <Switch
                  checked={rejectCalls}
                  onCheckedChange={async (checked) => {
                    setRejectCalls(checked);
                    await updateMultipleSettings.mutateAsync({
                      whatsapp_reject_calls: checked ? 'true' : 'false'
                    });
                    toast.success(checked ? 'Recusa de ligações ativada' : 'Recusa de ligações desativada');
                  }}
                />
              </div>

              {rejectCalls && (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Importante:</strong> Configure o template com slug <code className="bg-muted px-1 py-0.5 rounded">cancelar_ligacao</code> para enviar uma mensagem ao recusar a ligação.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4 p-4 rounded-lg border">
                    <div className="space-y-2">
                      <Label>Quando recusar ligações?</Label>
                      <Select 
                        value={rejectCallsMode} 
                        onValueChange={async (v) => {
                          const mode = v as 'all' | 'scheduled';
                          setRejectCallsMode(mode);
                          await updateMultipleSettings.mutateAsync({
                            whatsapp_reject_calls_mode: mode
                          });
                          toast.success(mode === 'all' ? 'Recusa para todas as ligações' : 'Recusa em horários definidos');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as ligações (24h)</SelectItem>
                          <SelectItem value="scheduled">Apenas em horários definidos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {rejectCallsMode === 'scheduled' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Horário inicial</Label>
                          <Input
                            type="time"
                            value={rejectCallsStartTime}
                            onChange={async (e) => {
                              const value = e.target.value;
                              setRejectCallsStartTime(value);
                              await updateMultipleSettings.mutateAsync({
                                whatsapp_reject_calls_start: value
                              });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Horário final</Label>
                          <Input
                            type="time"
                            value={rejectCallsEndTime}
                            onChange={async (e) => {
                              const value = e.target.value;
                              setRejectCallsEndTime(value);
                              await updateMultipleSettings.mutateAsync({
                                whatsapp_reject_calls_end: value
                              });
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fila" className="space-y-4">
          {/* Cobranças Automáticas Pendentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-500" />
                Cobranças Automáticas
              </CardTitle>
              <CardDescription>Cobranças agendadas aguardando envio</CardDescription>
            </CardHeader>
            <CardContent>
              {chargesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">Carregando...</p>
                </div>
              ) : pendingChargeSchedules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agendado para</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingChargeSchedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>
                          {format(new Date(schedule.scheduled_for), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{schedule.customers?.full_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {schedule.type === 'before_due' ? `${Math.abs(schedule.days_offset)}d antes` : 
                             schedule.type === 'on_due' ? 'No dia' : 
                             `${schedule.days_offset}d após`}
                          </Badge>
                        </TableCell>
                        <TableCell>{schedule.message_templates?.name || '-'}</TableCell>
                        <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelChargeSchedule.mutate(schedule.id)}
                            disabled={cancelChargeSchedule.isPending}
                            title="Cancelar"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteChargeSchedule.mutate(schedule.id)}
                            disabled={deleteChargeSchedule.isPending}
                            className="text-destructive hover:text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma cobrança automática na fila</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mensagens Agendadas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Mensagens Agendadas
              </CardTitle>
              <CardDescription>Mensagens manuais agendadas</CardDescription>
            </CardHeader>
            <CardContent>
              {messagesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">Carregando...</p>
                </div>
              ) : pendingMessages.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agendado para</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingMessages.map((message) => (
                      <TableRow key={message.id}>
                        <TableCell>
                          {format(new Date(message.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{message.customer?.full_name || '-'}</TableCell>
                        <TableCell>{message.template?.name || 'Personalizada'}</TableCell>
                        <TableCell>{getStatusBadge(message.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelScheduledMessage.mutate(message.id)}
                            disabled={cancelScheduledMessage.isPending}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteScheduledMessage.mutate(message.id)}
                            disabled={deleteScheduledMessage.isPending}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma mensagem agendada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          {/* Histórico de Cobranças Automáticas - Only sent and failed, not cancelled */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-500" />
                Histórico de Cobranças
              </CardTitle>
              <CardDescription>Cobranças automáticas enviadas e com erro (canceladas automaticamente não aparecem)</CardDescription>
            </CardHeader>
            <CardContent>
              {chargesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">Carregando...</p>
                </div>
              ) : historyChargeSchedules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyChargeSchedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>
                          {schedule.sent_at 
                            ? format(new Date(schedule.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                            : format(new Date(schedule.scheduled_for), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          }
                        </TableCell>
                        <TableCell>{schedule.customers?.full_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {schedule.type === 'before_due' ? `${Math.abs(schedule.days_offset)}d antes` : 
                             schedule.type === 'on_due' ? 'No dia' : 
                             `${schedule.days_offset}d após`}
                          </Badge>
                        </TableCell>
                        <TableCell>{schedule.message_templates?.name || '-'}</TableCell>
                        <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-destructive text-sm">
                          {schedule.error_message || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {schedule.status === 'failed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => retryChargeSchedule.mutate(schedule.id)}
                                disabled={retryChargeSchedule.isPending}
                                title="Reenviar"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteChargeSchedule.mutate(schedule.id)}
                              disabled={deleteChargeSchedule.isPending}
                              className="text-destructive hover:text-destructive"
                              title="Excluir do histórico"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma cobrança no histórico</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Mensagens Agendadas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Histórico de Mensagens
              </CardTitle>
              <CardDescription>Mensagens manuais enviadas</CardDescription>
            </CardHeader>
            <CardContent>
              {messagesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">Carregando...</p>
                </div>
              ) : sentMessages.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sentMessages.map((message) => (
                      <TableRow key={message.id}>
                        <TableCell>
                          {message.sent_at 
                            ? format(new Date(message.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                            : format(new Date(message.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          }
                        </TableCell>
                        <TableCell>{message.customer?.full_name || '-'}</TableCell>
                        <TableCell>{message.template?.name || 'Personalizada'}</TableCell>
                        <TableCell>{getStatusBadge(message.status)}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-destructive text-sm">
                          {message.error_message || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {message.status === 'failed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => retryScheduledMessage.mutate(message.id)}
                                disabled={retryScheduledMessage.isPending}
                                title="Reenviar"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteScheduledMessage.mutate(message.id)}
                              disabled={deleteScheduledMessage.isPending}
                              className="text-destructive hover:text-destructive"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma mensagem no histórico</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule Message Modal */}
      <ScheduleMessageModal
        open={isScheduleModalOpen}
        onOpenChange={setIsScheduleModalOpen}
        onSave={(data) => {
          createScheduledMessage.mutate(data, {
            onSuccess: () => {
              setIsScheduleModalOpen(false);
              toast.success('Mensagem agendada com sucesso!');
            }
          });
        }}
        isLoading={createScheduledMessage.isPending}
      />
    </div>
  );
}


