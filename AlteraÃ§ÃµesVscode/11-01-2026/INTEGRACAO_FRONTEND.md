# 🚀 WhatsApp Adapter - Implementação Frontend

Para usar o WhatsApp Adapter no frontend do BRGESTOR, substitua as chamadas diretas para WAHA por estas funções:

## 📝 Hook personalizado (criar se não existir)

```typescript
// src/hooks/useWhatsApp.ts
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WhatsAppResult {
  success: boolean;
  provider?: string;
  error?: string;
  messageId?: string;
  qrCode?: string;
}

export function useWhatsApp() {
  const [loading, setLoading] = useState(false);

  const createInstance = async (userId: string): Promise<WhatsAppResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp', {
        body: { userId }
      });

      if (error) throw error;
      
      if (data.success) {
        toast.success(`Instância criada com sucesso (${data.provider})`);
      } else {
        toast.error(`Erro ao criar instância: ${data.error}`);
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro na comunicação: ${message}`);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (phone: string, text: string, userId?: string): Promise<WhatsAppResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp', {
        body: { phone, text, userId }
      });

      if (error) throw error;
      
      if (data.success) {
        toast.success(`Mensagem enviada com sucesso (${data.provider})`);
      } else {
        toast.error(`Erro ao enviar mensagem: ${data.error}`);
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro na comunicação: ${message}`);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const getStatus = async (): Promise<WhatsAppResult & { currentProvider?: string; vpsIp?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp', {
        method: 'GET'
      });

      if (error) throw error;
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, error: message };
    }
  };

  return {
    createInstance,
    sendMessage,
    getStatus,
    loading
  };
}
```

## 🔄 Migração de código existente

### Antes (código antigo):
```typescript
// Chamada direta para WAHA
const response = await fetch(`${wahaApiUrl}/api/sendText`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session: wahaSessionId,
    chatId: `${phone}@c.us`,
    text: message,
  }),
});
```

### Depois (usando o adapter):
```typescript
// Usando o hook
const { sendMessage } = useWhatsApp();

const result = await sendMessage(phone, message, userId);
if (result.success) {
  // Mensagem enviada com sucesso
  console.log('Enviado via:', result.provider);
} else {
  // Tratar erro
  console.error('Erro:', result.error);
}
```

## 🎯 Componente de exemplo

```typescript
// src/components/WhatsAppSender.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { Loader2, MessageCircle } from 'lucide-react';

export function WhatsAppSender() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const { sendMessage, getStatus, loading } = useWhatsApp();
  const [status, setStatus] = useState<any>(null);

  const handleSend = async () => {
    if (!phone || !message) return;
    
    const result = await sendMessage(phone, message);
    if (result.success) {
      setMessage('');
    }
  };

  const checkStatus = async () => {
    const result = await getStatus();
    setStatus(result);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        <h3 className="text-lg font-semibold">WhatsApp Adapter</h3>
        <Button variant="outline" size="sm" onClick={checkStatus}>
          Status
        </Button>
      </div>

      {status && (
        <div className="p-3 bg-muted rounded-lg text-sm">
          <div>Provider: <strong>{status.currentProvider}</strong></div>
          <div>Status: <strong>{status.success ? '✅ Online' : '❌ Offline'}</strong></div>
          {status.error && <div>Erro: {status.error}</div>}
        </div>
      )}

      <Input
        placeholder="Número do WhatsApp (5511999999999)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      
      <Textarea
        placeholder="Mensagem..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
      />
      
      <Button 
        onClick={handleSend} 
        disabled={loading || !phone || !message}
        className="w-full"
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enviar via WhatsApp
      </Button>
    </div>
  );
}
```

## 🔧 Integração com notificações existentes

Para integrar com o sistema de notificações existente, substitua:

```typescript
// Em qualquer componente que envia WhatsApp
const { sendMessage } = useWhatsApp();

// Exemplo: notificar cliente sobre cobrança
const notifyClient = async (clientPhone: string, chargeInfo: any) => {
  const message = `Olá! Você tem uma nova cobrança de R$ ${chargeInfo.amount}. 
Vencimento: ${chargeInfo.dueDate}
Link para pagamento: ${chargeInfo.paymentUrl}`;

  const result = await sendMessage(clientPhone, message, clientPhone);
  
  // Log no sistema se necessário
  if (result.success) {
    console.log(`Notificação enviada via ${result.provider}`);
    // Salvar log de notificação...
  }
};
```

## 🎉 Benefícios da migração

- ✅ **Redundância**: Funciona com WAHA ou Evolution API
- 🔄 **Zero downtime**: Troca provider sem parar o sistema  
- 📊 **Logs automáticos**: Todas as mensagens ficam registradas
- 🛡️ **Error handling**: Tratamento robusto de erros
- 🎯 **Type safety**: TypeScript com interfaces definidas
- ⚡ **Performance**: Otimizado para produção