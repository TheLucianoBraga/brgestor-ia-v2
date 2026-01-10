import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PaymentSuccessProps {
  amount: number;
  currency: string;
  tenantName?: string;
  tenantLogo?: string;
  serviceName?: string;
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

export const PaymentSuccess = ({ 
  amount, 
  currency, 
  tenantName, 
  tenantLogo,
  serviceName 
}: PaymentSuccessProps) => {
  const navigate = useNavigate();

  const handleGoToPortal = () => {
    navigate('/cliente');
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8">
          <div className="text-center">
            {/* Logo da empresa */}
            {tenantLogo ? (
              <div className="flex justify-center mb-4">
                <img 
                  src={tenantLogo} 
                  alt={tenantName || 'Logo'} 
                  className="h-16 max-w-[200px] object-contain"
                />
              </div>
            ) : tenantName && (
              <p className="text-lg font-semibold text-muted-foreground mb-4">{tenantName}</p>
            )}

            <div className="flex justify-center mb-6">
              <div className="p-4 bg-green-100 rounded-full">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
            </div>
            
            <h2 className="text-2xl font-semibold text-green-600">
              Pagamento Confirmado!
            </h2>
            <p className="mt-2 text-muted-foreground">
              Seu pagamento foi processado com sucesso.
            </p>

            {/* Nome do serviço/produto */}
            {serviceName && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Serviço</p>
                <p className="font-medium">{serviceName}</p>
              </div>
            )}

            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Valor pago</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(amount, currency)}
              </p>
            </div>

            {/* Botões de navegação */}
            <div className="mt-6 flex flex-col gap-3">
              <Button 
                onClick={handleGoToPortal}
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Ir para Meus Serviços
              </Button>
              <Button 
                variant="outline" 
                onClick={handleGoBack}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
