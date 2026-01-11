import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CardPaymentPagSeguroProps {
  amount: number;
  tenantId: string;
  customerId: string;
  description: string;
  onSuccess: () => void;
}

export const CardPaymentPagSeguro = ({
  amount,
  tenantId,
  customerId,
  description,
  onSuccess,
}: CardPaymentPagSeguroProps) => {
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    securityCode: '',
  });

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardData.holderName || !cardData.number || !cardData.expiryMonth || !cardData.expiryYear || !cardData.securityCode) {
      toast.error('Preencha todos os campos do cartão');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('pagseguro-process-card', {
        body: {
          tenant_id: tenantId,
          customer_id: customerId,
          amount: Math.round(amount * 100), // PagSeguro uses cents
          description,
          card: {
            holder: {
              name: cardData.holderName,
            },
            number: cardData.number.replace(/\s/g, ''),
            exp_month: cardData.expiryMonth,
            exp_year: cardData.expiryYear,
            security_code: cardData.securityCode,
          },
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Erro ao processar pagamento');
      }

      toast.success('Pagamento realizado com sucesso!');
      onSuccess();
    } catch (err: unknown) {
      console.error('PagSeguro card error:', err);
      const message = err instanceof Error ? err.message : 'Erro ao processar pagamento';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

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
          <div className="space-y-2">
            <Label htmlFor="holderName">Nome no cartão</Label>
            <Input
              id="holderName"
              placeholder="Como está no cartão"
              value={cardData.holderName}
              onChange={(e) => setCardData({ ...cardData, holderName: e.target.value.toUpperCase() })}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardNumber">Número do cartão</Label>
            <Input
              id="cardNumber"
              placeholder="0000 0000 0000 0000"
              value={cardData.number}
              onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
              maxLength={19}
              disabled={loading}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="expiryMonth">Mês</Label>
              <Input
                id="expiryMonth"
                placeholder="MM"
                value={cardData.expiryMonth}
                onChange={(e) => setCardData({ ...cardData, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                maxLength={2}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryYear">Ano</Label>
              <Input
                id="expiryYear"
                placeholder="AAAA"
                value={cardData.expiryYear}
                onChange={(e) => setCardData({ ...cardData, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                maxLength={4}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="securityCode">CVV</Label>
              <Input
                id="securityCode"
                placeholder="123"
                value={cardData.securityCode}
                onChange={(e) => setCardData({ ...cardData, securityCode: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                maxLength={4}
                type="password"
                disabled={loading}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg bg-blue-500 hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-5 w-5" />
                Pagar R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            🔒 Seus dados estão protegidos com criptografia
          </p>
        </form>
      </CardContent>
    </Card>
  );
};
