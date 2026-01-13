import React from 'react';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AIInsight {
  type: 'success' | 'warning' | 'info' | 'danger';
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: string;
}

interface AIInsightsProps {
  metrics: {
    currentRevenue: number;
    previousRevenue: number;
    revenueChange: number;
    activeClients: number;
    totalClients: number;
    overduePercentage: number;
    averageTicket: number;
    resellerCount: number;
    resellerActiveItems: number;
    resellerRevenue: number;
  };
}

export const AIInsights: React.FC<AIInsightsProps> = ({ metrics }) => {
  const generateInsights = (): AIInsight[] => {
    const insights: AIInsight[] = [];

    // Análise de crescimento de receita
    if (metrics.revenueChange > 20) {
      insights.push({
        type: 'success',
        icon: <TrendingUp className="w-5 h-5" />,
        title: 'Crescimento Excepcional!',
        description: `Sua receita cresceu ${metrics.revenueChange.toFixed(1)}% comparado ao período anterior. Continue investindo nas estratégias que estão funcionando!`,
        action: 'Identificar canais de maior conversão',
      });
    } else if (metrics.revenueChange < -10) {
      insights.push({
        type: 'danger',
        icon: <TrendingDown className="w-5 h-5" />,
        title: 'Atenção: Queda na Receita',
        description: `Receita caiu ${Math.abs(metrics.revenueChange).toFixed(1)}%. Revise estratégias de retenção e aquisição de clientes.`,
        action: 'Analisar churn e motivos de cancelamento',
      });
    }

    // Análise de inadimplência
    if (metrics.overduePercentage > 15) {
      insights.push({
        type: 'warning',
        icon: <AlertCircle className="w-5 h-5" />,
        title: 'Alta Inadimplência Detectada',
        description: `${metrics.overduePercentage.toFixed(1)}% de inadimplência. Recomendo enviar lembretes automáticos e revisar políticas de cobrança.`,
        action: 'Configurar automação de cobrança',
      });
    } else if (metrics.overduePercentage < 5) {
      insights.push({
        type: 'success',
        icon: <CheckCircle2 className="w-5 h-5" />,
        title: 'Excelente Controle Financeiro',
        description: `Apenas ${metrics.overduePercentage.toFixed(1)}% de inadimplência. Seu processo de cobrança está eficiente!`,
      });
    }

    // Análise de ticket médio
    const expectedTicket = 150; // R$ 150 como referência
    if (metrics.averageTicket < expectedTicket * 0.7) {
      insights.push({
        type: 'info',
        icon: <Target className="w-5 h-5" />,
        title: 'Oportunidade de Upsell',
        description: `Ticket médio de R$ ${metrics.averageTicket.toFixed(2)} está abaixo do potencial. Considere oferecer planos premium ou serviços adicionais.`,
        action: 'Criar campanhas de upgrade',
      });
    }

    // Análise de taxa de conversão de clientes
    const conversionRate = (metrics.activeClients / metrics.totalClients) * 100;
    if (conversionRate < 60) {
      insights.push({
        type: 'warning',
        icon: <AlertCircle className="w-5 h-5" />,
        title: 'Taxa de Ativação Baixa',
        description: `Apenas ${conversionRate.toFixed(1)}% dos clientes estão ativos. Melhore o onboarding e engajamento inicial.`,
        action: 'Implementar sequência de boas_vindas',
      });
    }

    // Análise de revendas
    if (metrics.resellerCount > 0) {
      const revenuePerReseller = metrics.resellerRevenue / metrics.resellerCount;
      const itemsPerReseller = metrics.resellerActiveItems / metrics.resellerCount;
      
      if (itemsPerReseller < 10) {
        insights.push({
          type: 'info',
          icon: <Target className="w-5 h-5" />,
          title: 'Potencial de Crescimento em Revendas',
          description: `Média de ${itemsPerReseller.toFixed(0)} ativos por revenda. Treine suas revendas para aumentar a captação de clientes.`,
          action: 'Criar programa de capacitação',
        });
      }

      if (revenuePerReseller > 500) {
        insights.push({
          type: 'success',
          icon: <TrendingUp className="w-5 h-5" />,
          title: 'Revendas Performando Bem',
          description: `Receita média de R$ ${revenuePerReseller.toFixed(2)} por revenda. Suas parcerias estão gerando bons resultados!`,
        });
      }
    }

    // Análise comparativa
    if (metrics.revenueChange > 0 && metrics.activeClients > metrics.totalClients * 0.7) {
      insights.push({
        type: 'success',
        icon: <CheckCircle2 className="w-5 h-5" />,
        title: 'Negócio Saudável',
        description: 'Receita crescendo com boa taxa de retenção. Continue monitorando métricas e ajustando estratégias.',
      });
    }

    // Previsão de tendências
    if (metrics.revenueChange > 0 && metrics.overduePercentage < 10) {
      const projectedRevenue = metrics.currentRevenue * (1 + metrics.revenueChange / 100);
      insights.push({
        type: 'info',
        icon: <Sparkles className="w-5 h-5" />,
        title: 'Projeção Positiva',
        description: `Mantendo o ritmo atual, a receita pode atingir R$ ${projectedRevenue.toFixed(2)} no próximo período.`,
        action: 'Planejar investimentos futuros',
      });
    }

    // Insight padrão se nenhum foi gerado
    if (insights.length === 0) {
      if (metrics.currentRevenue > 0) {
        insights.push({
          type: 'info',
          icon: <Sparkles className="w-5 h-5" />,
          title: 'Análise de Período',
          description: `Receita de R$ ${metrics.currentRevenue.toFixed(2)} neste período com ${metrics.activeClients} clientes ativos. Continue monitorando suas métricas para identificar oportunidades de crescimento.`,
        });
      } else {
        insights.push({
          type: 'info',
          icon: <Target className="w-5 h-5" />,
          title: 'Comece a Crescer',
          description: 'Configure seus serviços e comece a adicionar clientes para visualizar análises detalhadas e insights personalizados.',
          action: 'Cadastrar primeiro cliente',
        });
      }
    }

    return insights;
  };

  const insights = generateInsights();

  const getTypeStyles = (type: AIInsight['type']) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald_800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber_800';
      case 'danger':
        return 'bg-rose-50 border-rose-200 dark:bg-rose-950 dark:border-rose_800';
      case 'info':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue_800';
    }
  };

  const getIconColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'success':
        return 'text-emerald-600 dark:text-emerald_400';
      case 'warning':
        return 'text-amber-600 dark:text-amber_400';
      case 'danger':
        return 'text-rose-600 dark:text-rose_400';
      case 'info':
        return 'text-blue-600 dark:text-blue_400';
    }
  };

  const getBadgeVariant = (type: AIInsight['type']) => {
    switch (type) {
      case 'success':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'danger':
        return 'destructive';
      case 'info':
        return 'outline';
    }
  };

  // Sempre renderizar o card, agora sempre terá pelo menos 1 insight
  return (
    <Card className="rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-pulse" />
          </div>
          Insights de IA
          <Badge variant="secondary" className="ml-auto">
            {insights.length} {insights.length === 1 ? 'insight' : 'insights'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border transition-all hover:shadow-md ${getTypeStyles(insight.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${getIconColor(insight.type)}`}>
                {insight.icon}
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-semibold text-sm">{insight.title}</h4>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
                {insight.action && (
                  <Badge variant={getBadgeVariant(insight.type)} className="mt-2">
                    💡 {insight.action}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
