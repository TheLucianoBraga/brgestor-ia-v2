import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-postgres';

interface PixPaymentProps {
  qrCode?: string;
  qrCodeBase64?: string;
  copyPaste?: string;
  paymentId?: string;
  tenantId: string;
  onPaid: () => void;
}

export const PixPayment = ({
  qrCode,
  qrCodeBase64,
  copyPaste,
  paymentId,
  tenantId,
  onPaid,
}: PixPaymentProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (copyPaste) {
      await navigator.clipboard.writeText(copyPaste);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Poll for payment status
  useEffect(() => {
    if (!paymentId) return;

    const checkStatus = async () => {
      try {
        const { data } = await supabase.rpc('ai_check_status', {
          body: { tenantId, paymentId },
        });
        if (data?.paid) {
          onPaid();
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    };

    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [paymentId, tenantId, onPaid]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 justify-center">
          <QrCode className="h-5 w-5 text-emerald-500" />
          Pagamento via PIX
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code */}
        <div className="flex justify-center">
          {qrCodeBase64 ? (
            <div className="p-4 bg-white rounded-lg border shadow-sm">
              <img
                src={`data:image/png;base64,${qrCodeBase64}`}
                alt="QR Code PIX"
                className="w-48 h-48"
              />
            </div>
          ) : qrCode ? (
            <div className="p-4 bg-white rounded-lg border shadow-sm">
              <img
                src={qrCode}
                alt="QR Code PIX"
                className="w-48 h-48"
              />
            </div>
          ) : (
            <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
              <QrCode className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Copy Paste */}
        {copyPaste && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Ou copie o código PIX Copia e Cola:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={copyPaste}
                readOnly
                className="flex-1 p-3 text-xs bg-muted rounded-lg border font-mono truncate"
              />
              <Button
                onClick={handleCopy}
                variant={copied ? 'default' : 'outline'}
                size="lg"
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center justify-center gap-2 py-4 bg-muted/50 rounded-lg">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
          <span className="text-sm text-muted-foreground">
            Aguardando confirmação do pagamento...
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

