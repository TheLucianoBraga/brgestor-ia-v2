import React from 'react';
import { Loader2, BarChart3, PieChart, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartPlaceholderProps {
  isLoading?: boolean;
  type?: 'line' | 'bar' | 'pie';
  message?: string;
  height?: number;
  className?: string;
}

export const ChartPlaceholder: React.FC<ChartPlaceholderProps> = ({
  isLoading = false,
  type = 'bar',
  message = 'Nenhum dado disponível',
  height = 350,
  className,
}) => {
  const IconComponent = type === 'line' ? TrendingUp : type === 'pie' ? PieChart : BarChart3;

  if (isLoading) {
    return (
      <div 
        className={cn(
          "flex flex-col items-center justify-center bg-muted/20 rounded-xl min-h-[350px]",
          className
        )}
        style={{ height }}
      >
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground font-medium">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center bg-muted/20 rounded-xl border border-dashed border-muted-foreground/20 min-h-[350px]",
        className
      )}
      style={{ height }}
    >
      <div className="p-5 rounded-2xl bg-muted/50 mb-4">
        <IconComponent className="h-10 w-10 text-muted-foreground/40" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
};
