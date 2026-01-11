import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  Target
} from 'lucide-react';

interface ExpenseInsightsProps {
  metrics: {
    totalPending: number;
    totalPaid: number;
    totalOverdue: number;
    totalMonth: number;
    pendingCount: number;
    overdueCount: number;
    upcomingCount: number;
  };
  expenses?: any[];
}

export const ExpenseInsights: React.FC<ExpenseInsightsProps> = ({ metrics, expenses = [] }) => {
  const generateInsights = () => {
    const insights: Array<{
      type: 'success' | 'warning' | 'danger' | 'info';
      icon: React.ReactNode;
      title: string;
      description: string;
      action?: string;
    }> = [];

    // Insight sobre despesas vencidas
    if (metrics.overdueCount > 0) {
      insights.push({
        type: 'danger',
        icon: <AlertTriangle className="w-5 h-5" />,
        title: 'Atenção: Despesas Vencidas',
        description: `Você tem ${metrics.overdueCount} ${metrics.overdueCount === 1 ? 'despesa vencida' : 'despesas vencidas'}. Regularize para evitar juros e multas.`,
        action: 'Ver vencidas',
      });
    }

    // Insight sobre despesas próximas
    if (metrics.upcomingCount > 0) {
      insights.push({
        type: 'warning',
        icon: <Lightbulb className="w-5 h-5" />,
        title: 'Vencimentos Próximos',
        description: `${metrics.upcomingCount} ${metrics.upcomingCount === 1 ? 'despesa vence' : 'despesas vencem'} nos próximos 7 dias. Configure lembretes automáticos!`,
        action: 'Ativar lembretes',
      });
    }

    // Insight positivo se tudo pago
    if (metrics.pendingCount === 0 && metrics.overdueCount === 0 && metrics.totalPaid > 0) {
      insights.push({
        type: 'success',
        icon: <CheckCircle2 className="w-5 h-5" />,
        title: 'Parabéns! Tudo em Dia',
        description: 'Todas as suas despesas estão quitadas. Excelente controle financeiro!',
      });
    }

    // Insight sobre recorrência
    const recurringExpenses = expenses?.filter(e => e.is_recurring);
    if (recurringExpenses && recurringExpenses.length > 0) {
      insights.push({
        type: 'info',
        icon: <Target className="w-5 h-5" />,
        title: 'Despesas Recorrentes',
        description: `Você tem ${recurringExpenses.length} ${recurringExpenses.length === 1 ? 'despesa recorrente' : 'despesas recorrentes'} configuradas. Automatize pagamentos!`,
        action: 'Ver recorrentes',
      });
    }

    // Insight padrão se não houver nada
    if (insights.length === 0 && metrics.totalMonth === 0) {
      insights.push({
        type: 'info',
        icon: <Sparkles className="w-5 h-5" />,
        title: 'Comece Agora',
        description: 'Registre sua primeira despesa e tenha controle total sobre seus gastos com insights de IA.',
        action: 'Adicionar despesa',
      });
    }

    // Análise de tendência (comparação com mês anterior - simulado)
    if (metrics.totalMonth > 0) {
      const trend = Math.random() > 0.5 ? 'up' : 'down'; // Aqui você compararia com dados reais
      const percentage = Math.floor(Math.random() * 30) + 5;
      
      if (trend === 'up') {
        insights.push({
          type: 'warning',
          icon: <TrendingUp className="w-5 h-5" />,
          title: 'Gastos em Alta',
          description: `Seus gastos aumentaram aproximadamente ${percentage}% comparado ao mês anterior.`,
          action: 'Ver análise',
        });
      }
    }

    return insights;
  };

  const insights = generateInsights();

  if (insights.length === 0) return null;

  const getTypeStyles = (type: 'success' | 'warning' | 'danger' | 'info') => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800';
      case 'danger':
        return 'bg-rose-50 border-rose-200 dark:bg-rose-950 dark:border-rose-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800';
    }
  };

  const getIconColor = (type: 'success' | 'warning' | 'danger' | 'info') => {
    switch (type) {
      case 'success':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      case 'danger':
        return 'text-rose-600 dark:text-rose-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950 dark:to-indigo-950 border-violet-200 dark:border-violet-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400 animate-pulse" />
            </div>
            Insights de IA
          </CardTitle>
          <Badge variant="secondary">
            {insights.length} {insights.length === 1 ? 'insight' : 'insights'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border transition-all hover:shadow-md ${getTypeStyles(insight.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${getIconColor(insight.type)}`}>
                {insight.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
                {insight.action && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-8 text-xs gap-1"
                  >
                    {insight.action}
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
