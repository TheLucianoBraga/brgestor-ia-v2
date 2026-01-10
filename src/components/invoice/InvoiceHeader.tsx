import { Card, CardContent } from '@/components/ui/card';
import { Building2, Calendar, FileText } from 'lucide-react';

interface InvoiceHeaderProps {
  logoUrl?: string;
  tenantName: string;
  customerName: string;
  description: string;
  dueDate: string;
  amount: number;
  currency: string;
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

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('pt-BR');
};

export const InvoiceHeader = ({
  logoUrl,
  tenantName,
  customerName,
  description,
  dueDate,
  amount,
  currency,
}: InvoiceHeaderProps) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Logo + Total */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={tenantName} 
                className="h-10 max-w-[120px] object-contain"
              />
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="h-5 w-5" />
                <span className="font-medium text-sm">{tenantName}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(amount, currency)}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span className="truncate">{description}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground justify-end">
            <Calendar className="h-3.5 w-3.5" />
            <span>Vence {formatDate(dueDate)}</span>
          </div>
        </div>

        {/* Customer */}
        <div className="text-xs text-muted-foreground text-center">
          Olá, <span className="font-medium text-foreground">{customerName}</span>
        </div>
      </CardContent>
    </Card>
  );
};