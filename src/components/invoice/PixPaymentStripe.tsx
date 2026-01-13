import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Copy, Check, QrCode, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-postgres';

interface PixPaymentStripeProps {
  amount: number;
  tenantId: string;
  customerId: string;
  customerItemId?: string;
  chargeId?: string;
  subscriptionId?: string;
  description: string;
  onSuccess: () => void;
}

export const PixPaymentStripe: React.FC<PixPaymentStripeProps> = ({
  amount,
  tenantId,
  customerId,
  customerItemId,
  chargeId,
  subscriptionId,
  description,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [pixData, setPixData] = useState<{
    qrCodeUrl?: string;
    copyPaste?: string;
    expiresAt?: string;
    paymentIntentId?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generatePix = async () => {
    if (isLoading) return; // Prevent multiple clicks
    
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      const { data, error } = await supabase.rpc('ai_create_pix', {
        body: {
          tenantId,
          customerId,
          customerItemId,
          chargeId,
          subscriptionId,
          amount,
          description,
          expiresInMinutes: 30,
        },
      });

      if (error) {
        // Check if it's a PIX not enabled error
        const errorMsg = error.message || '';
        if (errorMsg.includes('pix') && errorMsg.includes('invalid')) {
          setErrorMessage('PIX via Stripe não está habilitado nesta conta. Por favor, utilize outro método de pagamento como Cartão de Crédito.');
          return;
        }
        throw error;
      }
      
      if (!data.success) {
        // Check if error is about PIX not being enabled
        if (data.error?.includes('pix') || data.error?.includes('invalid')) {
          setErrorMessage('PIX via Stripe não está habilitado nesta conta. Por favor, utilize outro método de pagamento como Cartão de Crédito.');
          return;
        }
        throw new Error(data.error);
      }

      setPixData({
        qrCodeUrl: data.qrCodeUrl,
        copyPaste: data.copyPaste,
        expiresAt: data.expiresAt,
        paymentIntentId: data.paymentIntentId,
      });

      toast.success('PIX gerado com sucesso!');
    } catch (error: any) {
      console.error('Error generating PIX:', error);
      const msg = error?.message || '';
      
      // Check for PIX not enabled error
      if (msg.toLowerCase().includes('pix') && (msg.includes('invalid') || msg.includes('not enabled'))) {
        setErrorMessage('PIX via Stripe não está habilitado nesta conta. Por favor, utilize outro método de pagamento como Cartão de Crédito.');
      } else {
        setErrorMessage(msg || 'Erro ao gerar PIX. Tente novamente ou use outro método de pagamento.');
      }
      toast.error('Erro ao gerar PIX');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!pixData?.copyPaste) return;
    
    try {
      // Open the hosted instructions URL which has the copy/paste code
      window.open(pixData.copyPaste, '_blank');
      setCopied(true);
      toast.success('Página de pagamento aberta!');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error('Erro ao abrir página de pagamento');
    }
  };

  // Poll for payment status
  useEffect(() => {
    if (!pixData?.paymentIntentId) return;

    const checkPaymentStatus = async () => {
      setCheckingPayment(true);
      try {
        // We'll check via the webhook - for now, just indicate we're waiting
        // The actual status check would require a separate endpoint
      } catch (error) {
        console.error('Error checking payment:', error);
      } finally {
        setCheckingPayment(false);
      }
    };

    const interval = setInterval(checkPaymentStatus, 5000);
    return () => clearInterval(interval);
  }, [pixData?.paymentIntentId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatExpiration = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2_digit',
      minute: '2_digit',
    });
  };

  // Show error state
  if (errorMessage) {
    return (
      <div className="space-y-4">
        <div className="text-center p-6 bg-destructive/10 rounded-lg border border-destructive/20">
          <QrCode className="h-16 w-16 mx-auto text-destructive mb-4" />
          <p className="text-destructive font-medium mb-2">
            PIX não disponível
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {errorMessage}
          </p>
        </div>

        <Button
          onClick={() => setErrorMessage(null)}
          variant="outline"
          className="w-full"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!pixData) {
    return (
      <div className="space-y-4">
        <div className="text-center p-6 bg-muted/50 rounded-lg">
          <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Clique no botão abaixo para gerar o QR Code PIX via Stripe
          </p>
          <p className="text-2xl font-bold text-primary mb-4">
            {formatCurrency(amount)}
          </p>
        </div>

        <Button
          onClick={generatePix}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando PIX...
            </>
          ) : (
            <>
              <QrCode className="h-4 w-4 mr-2" />
              Gerar QR Code PIX
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Escaneie o QR Code ou clique para abrir a página de pagamento
            </p>

            {pixData.qrCodeUrl && (
              <div className="flex justify-center">
                <img
                  src={pixData.qrCodeUrl}
                  alt="QR Code PIX"
                  className="w-48 h-48 border rounded-lg"
                />
              </div>
            )}

            <div className="text-2xl font-bold text-primary">
              {formatCurrency(amount)}
            </div>

            {pixData.expiresAt && (
              <p className="text-sm text-muted-foreground">
                Expira às {formatExpiration(pixData.expiresAt)}
              </p>
            )}

            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="w-full"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Página aberta!
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir página de pagamento
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Aguardando confirmação do pagamento...
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={generatePix}
        variant="ghost"
        className="w-full"
        disabled={isLoading}
      >
        Gerar novo QR Code
      </Button>
    </div>
  );
};

