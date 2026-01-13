import { useState } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CardPaymentStripeProps {
  clientSecret: string;
  publishableKey: string;
  amount: number;
  currency: string;
  onSuccess: () => void;
}

const formatCurrency = (value: number, currency: string = 'brl') => {
  const currencyMap: Record<string, string> = {
    brl: 'BRL', usd: 'USD', eur: 'EUR', gbp: 'GBP',
  };
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currencyMap[currency.toLowerCase()] || 'BRL',
  }).format(value);
};

const StripeForm = ({ amount, currency, onSuccess }: { amount: number; currency: string; onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError('');

    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message || 'Erro ao processar pagamento');
      setIsProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      toast.success('Pagamento realizado com sucesso!');
      onSuccess();
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
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
            Pagar {formatCurrency(amount, currency)}
          </>
        )}
      </Button>
    </form>
  );
};

export const CardPaymentStripe = ({
  clientSecret,
  publishableKey,
  amount,
  currency,
  onSuccess,
}: CardPaymentStripeProps) => {
  const stripePromise = loadStripe(publishableKey);

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#3b82f6',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        fontFamily: 'Inter, system-ui, sans_serif',
        borderRadius: '8px',
      },
    },
    locale: 'pt-BR',
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
        <Elements stripe={stripePromise} options={options}>
          <StripeForm amount={amount} currency={currency} onSuccess={onSuccess} />
        </Elements>
      </CardContent>
    </Card>
  );
};
