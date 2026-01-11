import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpenseStatsProps {
  totals: {
    pending: number;
    overdue: number;
    paid: number;
    cancelled: number;
    total: number;
  };
}

export const ExpenseStats: React.FC<ExpenseStatsProps> = ({ totals }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalToPay = totals.pending + totals.overdue;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Total a Pagar - Destaque */}
      <Card className="relative overflow-hidden rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
        <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/10 rounded-full -translate-y-8 translate-x-8" />
        <div className="p-5 relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-destructive/80">Total a Pagar</span>
            <div className="p-2 rounded-xl bg-destructive/10">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-destructive">
            {formatCurrency(totalToPay)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Pendente + Vencido
          </p>
        </div>
      </Card>

      {/* Total Pago - Destaque Verde */}
      <Card className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -translate-y-8 translate-x-8" />
        <div className="p-5 relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-emerald-600">Total Pago</span>
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600">
            {formatCurrency(totals.paid)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Despesas quitadas
          </p>
        </div>
      </Card>

      {/* Pendentes */}
      <Card className="rounded-xl bg-muted/30 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Pendentes</span>
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold">
            {formatCurrency(totals.pending)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Aguardando pagamento
          </p>
        </div>
      </Card>

      {/* Vencidas */}
      <Card className="rounded-xl bg-muted/30 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-destructive/10">
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Vencidas</span>
            <div className="p-2 rounded-xl bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-destructive">
            {formatCurrency(totals.overdue)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Requer atenção imediata
          </p>
        </div>
      </Card>

      {/* Canceladas */}
      <Card className="rounded-xl bg-muted/30 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200 opacity-60">
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Canceladas</span>
            <div className="p-2 rounded-xl bg-gray-500/10">
              <Wallet className="w-5 h-5 text-gray-500" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-500">
            {formatCurrency(totals.cancelled)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Despesas desconsideradas
          </p>
        </div>
      </Card>
    </div>
  );
};
