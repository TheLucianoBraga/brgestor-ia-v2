import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-postgres';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

interface ApprovalResult {
  success: boolean;
  error?: string;
  customer_id?: string;
  tenant_id?: string;
  customer_name?: string;
  customer_whatsapp?: string;
}

interface SubscriptionResult {
  success: boolean;
  error?: string;
  customer_item_id?: string;
  customer_id?: string;
  customer_name?: string;
  customer_whatsapp?: string;
  service_name?: string;
  price?: number;
  due_date?: string;
}

export const useCustomerApproval = () => {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  // Função para buscar template e montar mensagem
  const getTemplateMessage = async (templateType: string, variables: Record<string, string>) => {
    if (!currentTenant?.id) return null;

    const { data: template } = await supabase
      .from('message_templates')
      .select('content, image_url')
      .eq('tenant_id', currentTenant.id)
      .eq('type', templateType)
      .eq('is_active', true)
      .maybeSingle();

    if (!template) return null;

    let message = template.content;
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return { content: message, image_url: template.image_url };
  };

  // Função para enviar mensagem automaticamente via WAHA API
  const sendWhatsAppAutomatic = async (whatsapp: string, message: string, imageUrl?: string | null) => {
    if (!currentTenant?.id) return false;

    try {
      const cleanNumber = whatsapp.replace(/\D/g, '');
      const chatId = `55${cleanNumber}@c.us`;

      // Se tiver imagem, enviar imagem com legenda
      if (imageUrl) {
        await supabase.rpc('waha_api', {
          body: {
            tenantId: currentTenant.id,
            action: 'sendImage',
            data: {
              chatId,
              imageUrl,
              caption: message,
            },
          },
        });
      } else {
        // Enviar apenas texto
        await supabase.rpc('waha_api', {
          body: {
            tenantId: currentTenant.id,
            action: 'sendText',
            data: {
              chatId,
              text: message,
            },
          },
        });
      }

      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem automática:', error);
      return false;
    }
  };

  const approveCustomer = useMutation({
    mutationFn: async (customerId: string) => {
      const { data, error } = await supabase.rpc('approve_customer', {
        p_customer_id: customerId,
      });

      if (error) throw error;
      return data as unknown as ApprovalResult;
    },
    onSuccess: async (result) => {
      if (!result.success) {
        toast.error(result.error || 'Erro ao aprovar cliente');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente aprovado com sucesso!');

      // Buscar e enviar template de cadastro_aprovado automaticamente
      if (result.customer_whatsapp && result.customer_name) {
        const template = await getTemplateMessage('cadastro_aprovado', {
          nome: result.customer_name,
          nome_cliente: result.customer_name,
        });

        if (template) {
          const sent = await sendWhatsAppAutomatic(result.customer_whatsapp, template.content, template.image_url);
          if (sent) {
            toast.success('Mensagem de aprovação enviada automaticamente!');
          }
        } else {
          // Mensagem padrão se não houver template
          const defaultMessage = `Olá ${result.customer_name}! 🎉\n\nSeu cadastro foi aprovado com sucesso!\n\nAgora você pode acessar nossa plataforma e escolher um serviço para assinar.\n\nBem-vindo(a)!`;
          const sent = await sendWhatsAppAutomatic(result.customer_whatsapp, defaultMessage);
          if (sent) {
            toast.success('Mensagem de aprovação enviada automaticamente!');
          }
        }
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao aprovar cliente');
    },
  });

  const subscribeToService = useMutation({
    mutationFn: async (serviceId: string) => {
      if (!currentTenant?.id) {
        throw new Error('Tenant não identificado. Por favor, faça login novamente.');
      }
      
      const { data, error } = await supabase.rpc('customer_subscribe_service', {
        p_service_id: serviceId,
      });

      if (error) {
        console.error('RPC Error:', error);
        throw new Error(error.message || 'Erro ao processar assinatura');
      }
      
      return data as unknown as SubscriptionResult;
    },
    onSuccess: async (result) => {
      if (!result.success) {
        toast.error(result.error || 'Erro ao assinar serviço');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['customer_services'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Serviço assinado com sucesso!');

      // Buscar e enviar template de pagamento_confirmado automaticamente
      if (result.customer_whatsapp && result.customer_name && result.service_name) {
        const formatCurrency = (value: number) => {
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(value);
        };

        const template = await getTemplateMessage('pagamento_confirmado', {
          nome: result.customer_name,
          nome_cliente: result.customer_name,
          servico: result.service_name,
          nome_servico: result.service_name,
          valor: formatCurrency(result.price || 0),
          vencimento: result.due_date || '',
        });

        if (template) {
          const sent = await sendWhatsAppAutomatic(result.customer_whatsapp, template.content, template.image_url);
          if (sent) {
            toast.success('Mensagem de confirmação enviada automaticamente!');
          }
        } else {
          // Mensagem padrão se não houver template
          const defaultMessage = `Olá ${result.customer_name}! ✅\n\nSua assinatura do serviço "${result.service_name}" foi confirmada!\n\n💰 Valor: ${formatCurrency(result.price || 0)}\n📅 Vencimento: ${result.due_date}\n\nObrigado pela confiança!`;
          const sent = await sendWhatsAppAutomatic(result.customer_whatsapp, defaultMessage);
          if (sent) {
            toast.success('Mensagem de confirmação enviada automaticamente!');
          }
        }
      }

      return result;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao assinar serviço');
    },
  });

  return {
    approveCustomer,
    subscribeToService,
  };
};

