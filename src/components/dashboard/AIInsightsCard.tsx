import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

interface AIInsightsCardProps {
  metrics: {
    monthlyRevenue: number;
    activeCustomers: number;
    pendingCharges: number;
    conversionRate: number;
  };
  revenueChange?: number;
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({ metrics, revenueChange }) => {
  const [insight, setInsight] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentTenant } = useTenant();

  const generateInsight = async () => {
    if (!currentTenant?.id) return;
    
    setIsLoading(true);
    try {
      const prompt = `Analise estes dados do dashboard e dê UM insight breve e acionável (máximo 2 frases):
      - Receita do mês: R$ ${metrics.monthlyRevenue.toLocaleString('pt-BR')}
      - Variação vs mês anterior: ${revenueChange ? `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}%` : 'sem dados'}
      - Clientes ativos: ${metrics.activeCustomers}
      - Cobranças pendentes: ${metrics.pendingCharges}
      - Taxa de conversão: ${metrics.conversionRate.toFixed(1)}%
      
      Responda como um consultor financeiro amigável, destacando o ponto mais importante.`;

      const { data, error } = await supabase.functions.invoke('ai-generate', {
        body: {
          type: 'chat',
          prompt,
          context: { tenantId: currentTenant.id }
        }
      });

      if (error) throw error;
      setInsight(data?.text || 'Não foi possível gerar insights no momento.');
    } catch (error) {
      console.error('Erro ao gerar insight:', error);
      // Fallback local
      if (revenueChange && revenueChange > 10) {
        setInsight(`🚀 Excelente! Sua receita cresceu ${revenueChange.toFixed(1)}% este mês. Continue focando nas estratégias que estão funcionando!`);
      } else if (revenueChange && revenueChange < -10) {
        setInsight(`⚠️ Atenção: receita caiu ${Math.abs(revenueChange).toFixed(1)}%. Considere reativar clientes inativos ou revisar preços.`);
      } else if (metrics.pendingCharges > 5) {
        setInsight(`💡 Você tem ${metrics.pendingCharges} cobranças pendentes. Priorize o contato com inadimplentes para melhorar o fluxo de caixa.`);
      } else {
        setInsight(`📊 Seu negócio está estável com ${metrics.activeCustomers} clientes ativos e taxa de conversão de ${metrics.conversionRate.toFixed(1)}%.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (metrics.monthlyRevenue > 0 || metrics.activeCustomers > 0) {
      generateInsight();
    }
  }, [metrics.monthlyRevenue, metrics.activeCustomers, currentTenant?.id]);

  const getTrendIcon = () => {
    if (revenueChange && revenueChange > 5) return <TrendingUp className="w-5 h-5 text-emerald-500" />;
    if (revenueChange && revenueChange < -5) return <TrendingDown className="w-5 h-5 text-destructive" />;
    return <AlertTriangle className="w-5 h-5 text-amber-500" />;
  };

  return (
    <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20 animate-slide-up">
      <CardContent className="py-4 px-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm">Insights da IA</h3>
                {getTrendIcon()}
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Analisando seus dados...</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={generateInsight}
            disabled={isLoading}
            className="flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
