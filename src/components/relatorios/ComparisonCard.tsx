import React from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ComparisonCardProps {
  title: string;
  currentValue: number;
  previousValue: number;
  currentLabel: string;
  previousLabel: string;
  formatValue: (value: number) => string;
  icon?: React.ElementType;
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({
  title,
  currentValue,
  previousValue,
  currentLabel,
  previousLabel,
  formatValue,
  icon: Icon
}) => {
  const change = previousValue > 0 
    ? ((currentValue - previousValue) / previousValue) * 100 
    : currentValue > 0 ? 100 : 0;

  const getTrendIcon = () => {
    if (change > 5) return <TrendingUp className="w-5 h-5 text-emerald-500" />;
    if (change < -5) return <TrendingDown className="w-5 h-5 text-destructive" />;
    return <Minus className="w-5 h-5 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (change > 5) return 'text-emerald_500';
    if (change < -5) return 'text_destructive';
    return 'text-muted_foreground';
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-1">
        <div className="flex items-center justify-between gap-2">
          {/* Previous Period */}
          <div className="text-left flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground whitespace-nowrap">{previousLabel}</p>
            <p className="text-sm font-semibold text-muted-foreground whitespace-nowrap">
              {formatValue(previousValue)}
            </p>
          </div>

          {/* Arrow & Change */}
          <div className="flex flex-col items-center shrink-0">
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            <div className={`flex items-center gap-0.5 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-[10px] font-medium whitespace-nowrap">
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Current Period */}
          <div className="text-right flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground whitespace-nowrap">{currentLabel}</p>
            <p className="text-sm font-bold whitespace-nowrap">{formatValue(currentValue)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
