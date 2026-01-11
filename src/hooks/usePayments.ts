import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

interface CreatePixPaymentParams {
  amount: number;
  description: string;
  customerId?: string;
  customerItemId?: string;
  externalReference?: string;
}

interface CreateCardPaymentParams {
  amount: number;
  description: string;
  customerId?: string;
  customerItemId?: string;
  externalReference?: string;
  successUrl?: string;
  failureUrl?: string;
}

interface PixPaymentResponse {
  success: boolean;
  paymentId?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  copyPaste?: string;
  expiresAt?: string;
  error?: string;
}

interface CardPaymentResponse {
  success: boolean;
  preferenceId?: string;
  initPoint?: string;
  sandboxInitPoint?: string;
  error?: string;
}

interface PaymentStatusResponse {
  success: boolean;
  status?: string;
  paid?: boolean;
  paidAt?: string;
  error?: string;
}

export const usePayments = () => {
  const { currentTenant } = useTenant();

  const createPixPayment = useMutation({
    mutationFn: async (params: CreatePixPaymentParams): Promise<PixPaymentResponse> => {
      if (!currentTenant?.id) throw new Error('Tenant não selecionado');

      const { data, error } = await supabase.functions.invoke('mp-create-pix', {
        body: {
          tenantId: currentTenant.id,
          ...params,
        },
      });

      if (error) throw error;
      return data as PixPaymentResponse;
    },
    onError: (error) => {
      console.error('Error creating PIX payment:', error);
      toast.error('Erro ao gerar cobrança PIX');
    },
  });

  const createCardPayment = useMutation({
    mutationFn: async (params: CreateCardPaymentParams): Promise<CardPaymentResponse> => {
      if (!currentTenant?.id) throw new Error('Tenant não selecionado');

      const { data, error } = await supabase.functions.invoke('mp-create-preference', {
        body: {
          tenantId: currentTenant.id,
          ...params,
        },
      });

      if (error) throw error;
      return data as CardPaymentResponse;
    },
    onError: (error) => {
      console.error('Error creating card payment:', error);
      toast.error('Erro ao gerar link de pagamento');
    },
  });

  const checkPaymentStatus = async (paymentId: string): Promise<PaymentStatusResponse> => {
    if (!currentTenant?.id) throw new Error('Tenant não selecionado');

    const { data, error } = await supabase.functions.invoke('mp-check-status', {
      body: {
        tenantId: currentTenant.id,
        paymentId,
      },
    });

    if (error) throw error;
    return data as PaymentStatusResponse;
  };

  return {
    createPixPayment,
    createCardPayment,
    checkPaymentStatus,
  };
};
