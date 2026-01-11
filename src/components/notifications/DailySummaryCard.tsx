import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Users, CreditCard, Calendar, MessageCircle, Check } from 'lucide-react';
import { DailySummary } from '@/hooks/useDailySummaries';

interface DailySummaryCardProps {
  summary: DailySummary;
}

export const DailySummaryCard: React.FC<DailySummaryCardProps> = ({ summary }) => {
  const metrics = summary.metrics || {};
  const formattedDate = format(new Date(summary.summary_date), "d 'de' MMMM", { locale: ptBR });

  return (
    <Card className="relative overflow-hidden">
      {/* Gradient decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-base">{formattedDate}</CardTitle>
          </div>
          {summary.sent_at && (
            <Badge variant="outline" className="text-xs gap-1">
              <Check className="h-3 w-3" />
              Enviado
            </Badge>
          )}
        </div>
        <CardDescription className="flex items-center gap-1 text-xs">
          <Calendar className="h-3 w-3" />
          {summary.summary_date}
          {summary.sent_channels?.includes('whatsapp') && (
            <Badge variant="secondary" className="ml-2 text-xs gap-1">
              <MessageCircle className="h-3 w-3" />
              WhatsApp
            </Badge>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.total_revenue !== undefined && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
              <CreditCard className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Receita</p>
                <p className="font-semibold text-green-600">
                  R$ {(metrics.total_revenue || 0).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {metrics.payments_received !== undefined && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pagamentos</p>
                <p className="font-semibold text-blue-600">{metrics.payments_received}</p>
              </div>
            </div>
          )}

          {metrics.new_customers !== undefined && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10">
              <Users className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Novos Clientes</p>
                <p className="font-semibold text-purple-600">{metrics.new_customers}</p>
              </div>
            </div>
          )}

          {metrics.new_resellers !== undefined && metrics.new_resellers > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10">
              <Users className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Novas Revendas</p>
                <p className="font-semibold text-orange-600">{metrics.new_resellers}</p>
              </div>
            </div>
          )}
        </div>

        {/* AI Summary Content */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-sm whitespace-pre-line">{summary.summary_content}</p>
        </div>

        {/* AI Insights */}
        {summary.ai_insights && summary.ai_insights.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Insights
            </p>
            <div className="flex flex-wrap gap-2">
              {summary.ai_insights.map((insight, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {insight}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
