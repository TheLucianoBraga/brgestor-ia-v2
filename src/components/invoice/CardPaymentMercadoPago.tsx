import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Loader2, AlertCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-postgres';

interface CardPaymentMercadoPagoProps {
  publicKey: string;
  amount: number;
  tenantId: string;
  chargeId: string;
  customerEmail: string;
  onSuccess: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Installment options
const getInstallments = (amount: number) => {
  const options = [];
  for (let i = 1; i <= 12; i++) {
    const installmentValue = amount / i;
    if (installmentValue >= 5) { // Min R$ 5 per installment
      const label = i === 1 
        ? `1x de ${formatCurrency(amount)} (sem juros)`
        : `${i}x de ${formatCurrency(installmentValue)} (sem juros)`;
      options.push({ value: i.toString(), label });
    }
  }
  return options;
};

export const CardPaymentMercadoPago = ({
  publicKey,
  amount,
  tenantId,
  chargeId,
  customerEmail,
  onSuccess,
}: CardPaymentMercadoPagoProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const mpRef = useRef<any>(null);
  
  // Form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [cpf, setCpf] = useState('');
  const [installments, setInstallments] = useState('1');

  // Load MercadoPago SDK
  useEffect(() => {
    const loadSDK = () => {
      if (window.MercadoPago) {
        mpRef.current = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        setSdkLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      script.onload = () => {
        mpRef.current = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        setSdkLoaded(true);
      };
      document.body.appendChild(script);
    };

    loadSDK();
  }, [publicKey]);

  // Format card number
  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 16);
    return numbers.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  // Format CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpRef.current) {
      setError('SDK do MercadoPago não carregado');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Create card token using MercadoPago SDK
      const cardData = {
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardholderName: cardHolder,
        cardExpirationMonth: expiryMonth,
        cardExpirationYear: `20${expiryYear}`,
        securityCode: cvv,
        identificationType: 'CPF',
        identificationNumber: cpf.replace(/\D/g, ''),
      };

      const token = await mpRef.current.createCardToken(cardData);

      if (token.error) {
        throw new Error(token.error.message || 'Erro ao processar cartão');
      }

      // Send token to backend
      const { data, error: fnError } = await supabase.rpc('ai_process_card', {
        body: {
          tenantId,
          chargeId,
          token: token.id,
          amount,
          installments: parseInt(installments),
          email: customerEmail,
          cpf: cpf.replace(/\D/g, ''),
        },
      });

      if (fnError || !data?.success) {
        throw new Error(data?.error || 'Erro ao processar pagamento');
      }

      toast.success('Pagamento aprovado!');
      onSuccess();
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Erro ao processar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!sdkLoaded) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Carregando formulário...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const installmentOptions = getInstallments(amount);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 justify-center">
          <CreditCard className="h-5 w-5 text-blue-500" />
          Pagamento com Cartão
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card Number */}
          <div className="space-y-2">
            <Label htmlFor="card-number">Número do Cartão</Label>
            <Input
              id="card-number"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="0000 0000 0000 0000"
              required
              maxLength={19}
            />
          </div>

          {/* Card Holder */}
          <div className="space-y-2">
            <Label htmlFor="card-holder">Nome no Cartão</Label>
            <Input
              id="card-holder"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
              placeholder="NOME COMO ESTÁ NO CARTÃO"
              required
            />
          </div>

          {/* Expiry and CVV */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="expiry-month">Mês</Label>
              <Select value={expiryMonth} onValueChange={setExpiryMonth}>
                <SelectTrigger id="expiry-month">
                  <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = (i + 1).toString().padStart(2, '0');
                    return (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry-year">Ano</Label>
              <Select value={expiryYear} onValueChange={setExpiryYear}>
                <SelectTrigger id="expiry-year">
                  <SelectValue placeholder="AA" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 15 }, (_, i) => {
                    const year = (new Date().getFullYear() % 100 + i).toString();
                    return (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                type="password"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="***"
                required
                maxLength={4}
              />
            </div>
          </div>

          {/* CPF */}
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF do Titular</Label>
            <Input
              id="cpf"
              value={cpf}
              onChange={(e) => setCpf(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              required
              maxLength={14}
            />
          </div>

          {/* Installments */}
          <div className="space-y-2">
            <Label htmlFor="installments">Parcelas</Label>
            <Select value={installments} onValueChange={setInstallments}>
              <SelectTrigger id="installments">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {installmentOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isProcessing}
            className="w-full h-12 text-lg bg-blue-500 hover:bg-blue-600"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-5 w-5" />
                Pagar {formatCurrency(amount)}
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            Pagamento seguro via MercadoPago
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Add MercadoPago type to window
declare global {
  interface Window {
    MercadoPago: any;
  }
}

