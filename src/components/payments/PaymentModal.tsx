import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, CreditCard, Copy, Check, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';
import { toast } from 'sonner';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  description: string;
  customerId?: string;
  customerItemId?: string;
  onPaymentConfirmed?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  onOpenChange,
  amount,
  description,
  customerId,
  customerItemId,
  onPaymentConfirmed,
}) => {
  const { createPixPayment, createCardPayment, checkPaymentStatus } = usePayments();
  const [pixData, setPixData] = useState<{
    qrCode?: string;
    qrCodeBase64?: string;
    copyPaste?: string;
    paymentId?: string;
    expiresAt?: string;
  } | null>(null);
  const [cardData, setCardData] = useState<{
    initPoint?: string;
    sandboxInitPoint?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [activeTab, setActiveTab] = useState('pix');

  const generatePixPayment = async () => {
    setIsLoading(true);
    try {
      const result = await createPixPayment.mutateAsync({
        amount,
        description,
        customerId,
        customerItemId,
      });

      if (result.success) {
        setPixData({
          qrCode: result.qrCode,
          qrCodeBase64: result.qrCodeBase64,
          copyPaste: result.copyPaste,
          paymentId: result.paymentId,
          expiresAt: result.expiresAt,
        });
      } else {
        toast.error(result.error || 'Erro ao gerar PIX');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateCardPayment = async () => {
    setIsLoading(true);
    try {
      const result = await createCardPayment.mutateAsync({
        amount,
        description,
        customerId,
        customerItemId,
        successUrl: window.location.origin + '/portal/meus-servicos?payment=success',
        failureUrl: window.location.origin + '/portal/meus-servicos?payment=failure',
      });

      if (result.success) {
        setCardData({
          initPoint: result.initPoint,
          sandboxInitPoint: result.sandboxInitPoint,
        });
      } else {
        toast.error(result.error || 'Erro ao gerar link');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (pixData?.copyPaste) {
      navigator.clipboard.writeText(pixData.copyPaste);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const checkStatus = useCallback(async () => {
    if (!pixData?.paymentId) return;

    try {
      const result = await checkPaymentStatus(pixData.paymentId);
      if (result.paid) {
        setIsPaid(true);
        toast.success('Pagamento confirmado!');
        onPaymentConfirmed?.();
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  }, [pixData?.paymentId, checkPaymentStatus, onPaymentConfirmed]);

  // Polling for payment status
  useEffect(() => {
    if (!pixData?.paymentId || isPaid) return;

    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [pixData?.paymentId, isPaid, checkStatus]);

  // Generate payment when tab changes
  useEffect(() => {
    if (!open) return;

    if (activeTab === 'pix' && !pixData && !isLoading) {
      generatePixPayment();
    } else if (activeTab === 'card' && !cardData && !isLoading) {
      generateCardPayment();
    }
  }, [open, activeTab]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setPixData(null);
      setCardData(null);
      setIsPaid(false);
      setCopied(false);
      setActiveTab('pix');
    }
  }, [open]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Realizar Pagamento</DialogTitle>
          <DialogDescription>
            {description} - {formatCurrency(amount)}
          </DialogDescription>
        </DialogHeader>

        {isPaid ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-green-600">Pagamento Confirmado!</h3>
            <p className="text-muted-foreground text-center">
              Seu pagamento foi processado com sucesso.
            </p>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pix" className="flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                PIX
              </TabsTrigger>
              <TabsTrigger value="card" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Cartão
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pix" className="space-y-4 pt-4">
              {isLoading ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Gerando QR Code...</p>
                </div>
              ) : pixData?.qrCodeBase64 ? (
                <>
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-lg border">
                      <img
                        src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                        alt="QR Code PIX"
                        className="w-48 h-48"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground text-center">
                      Ou copie o código PIX:
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 p-2 bg-muted rounded text-xs font-mono truncate">
                        {pixData.copyPaste?.substring(0, 50)}...
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyPix}
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Aguardando pagamento...
                  </div>

                  {pixData.expiresAt && (
                    <p className="text-xs text-center text-muted-foreground">
                      Expira em: {new Date(pixData.expiresAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 py-8">
                  <p className="text-muted-foreground">Erro ao gerar QR Code</p>
                  <Button onClick={generatePixPayment} variant="outline">
                    Tentar novamente
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="card" className="space-y-4 pt-4">
              {isLoading ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Gerando link de pagamento...</p>
                </div>
              ) : cardData?.initPoint ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <CreditCard className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-center text-muted-foreground">
                    Clique no botão abaixo para pagar com cartão de crédito ou débito
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => window.open(cardData.initPoint, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Pagar com MercadoPago
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Você será redirecionado para o checkout seguro do MercadoPago
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-8">
                  <p className="text-muted-foreground">Erro ao gerar link</p>
                  <Button onClick={generateCardPayment} variant="outline">
                    Tentar novamente
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
