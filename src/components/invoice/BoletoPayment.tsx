import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, ExternalLink, Banknote, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface BoletoPaymentProps {
  boletoUrl?: string;
  barcode?: string;
  invoiceUrl?: string;
}

export const BoletoPayment = ({
  boletoUrl,
  barcode,
  invoiceUrl,
}: BoletoPaymentProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (barcode) {
      await navigator.clipboard.writeText(barcode);
      setCopied(true);
      toast.success('Código de barras copiado!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 justify-center">
          <Banknote className="h-5 w-5 text-orange-500" />
          Pagamento via Boleto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Boleto Icon */}
        <div className="flex justify-center">
          <div className="p-8 bg-orange-50 rounded-full">
            <FileText className="w-16 h-16 text-orange-500" />
          </div>
        </div>

        <p className="text-center text-muted-foreground">
          Boleto gerado com sucesso! Pague até a data de vencimento.
        </p>

        {/* Barcode */}
        {barcode && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Código de barras:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={barcode}
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

        {/* Download/View Button */}
        {(boletoUrl || invoiceUrl) && (
          <Button
            onClick={() => window.open(boletoUrl || invoiceUrl, '_blank')}
            className="w-full h-12 text-lg bg-orange-500 hover:bg-orange-600"
          >
            <ExternalLink className="mr-2 h-5 w-5" />
            Visualizar Boleto
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
