import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, TrendingUp } from 'lucide-react';

interface ExpenseMetricsProps {
  expenses: any[];
  totals: any;
}

export const ExpenseMetrics: React.FC<ExpenseMetricsProps> = ({ expenses, totals }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Despesas por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <PieChart className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Gráfico de categorias</p>
              <p className="text-sm mt-2">Em desenvolvimento</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Evolução Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Gráfico de evolução</p>
              <p className="text-sm mt-2">Em desenvolvimento</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
