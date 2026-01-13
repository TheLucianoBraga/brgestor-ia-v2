import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, QrCode, Banknote, ChevronLeft, Loader2 } from 'lucide-react';

interface PaymentMethod {
  method: string;
  gateway: string;
  label: string;
}

interface PaymentMethodSelectorProps {
  availableMethods: PaymentMethod[];
  selectedMethod: string | null;
  onSelectMethod: (method: string) => void;
  onBack: () => void;
  isProcessing: boolean;
}

const getMethodIcon = (method: string) => {
  switch (method) {
    case 'pix':
      return QrCode;
    case 'card':
      return CreditCard;
    case 'boleto':
      return Banknote;
    default:
      return CreditCard;
  }
};

const getMethodColor = (method: string) => {
  switch (method) {
    case 'pix':
      return 'bg-emerald-500 hover:bg-emerald_600';
    case 'card':
      return 'bg-blue-500 hover:bg-blue_600';
    case 'boleto':
      return 'bg-orange-500 hover:bg-orange_600';
    default:
      return 'bg-primary hover:bg-primary/90';
  }
};

export const PaymentMethodSelector = ({
  availableMethods,
  selectedMethod,
  onSelectMethod,
  onBack,
  isProcessing,
}: PaymentMethodSelectorProps) => {
  // If no method selected, show selection buttons
  if (!selectedMethod) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-center">Escolha a forma de pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {availableMethods.map((m) => {
            const Icon = getMethodIcon(m.method);
            const colorClass = getMethodColor(m.method);
            
            return (
              <Button
                key={m.method}
                onClick={() => onSelectMethod(m.method)}
                className={`w-full h-14 text-lg text-white ${colorClass}`}
                disabled={isProcessing}
              >
                <Icon className="h-5 w-5 mr-3" />
                {m.label}
              </Button>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  // Method selected - show back button
  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={isProcessing}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar
      </Button>
    </div>
  );
};
