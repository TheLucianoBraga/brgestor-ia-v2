import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'avatar' | 'button' | 'table' | 'chart';
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className,
  variant = 'text',
  count = 1,
}) => {
  const baseClasses = 'animate-pulse-soft bg-muted rounded';

  const variants = {
    text: 'h-4 w-full',
    card: 'h-32 w-full rounded-lg',
    avatar: 'h-10 w-10 rounded-full',
    button: 'h-10 w-24 rounded-md',
    table: 'h-12 w-full',
    chart: 'h-64 w-full rounded-lg',
  };

  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Carregando...">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn(baseClasses, variants[variant])} />
      ))}
      <span className="sr-only">Carregando...</span>
    </div>
  );
};

export const TableLoadingSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5, 
  cols = 4 
}) => {
  return (
    <div className="space-y-3 animate-fade-in" role="status" aria-label="Carregando tabela...">
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded animate-pulse-soft flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-3 border-b border-border/50">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className={cn(
                "h-4 bg-muted rounded animate-pulse-soft flex-1",
                colIndex === 0 && "max-w-[200px]"
              )} 
            />
          ))}
        </div>
      ))}
      <span className="sr-only">Carregando tabela...</span>
    </div>
  );
};

export const CardLoadingSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="status" aria-label="Carregando cards...">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border rounded-lg p-6 space-y-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-muted rounded-full animate-pulse-soft" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse-soft w-3/4" />
              <div className="h-3 bg-muted rounded animate-pulse-soft w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded animate-pulse-soft" />
            <div className="h-3 bg-muted rounded animate-pulse-soft w-5/6" />
          </div>
        </div>
      ))}
      <span className="sr-only">Carregando cards...</span>
    </div>
  );
};

export const PageLoadingSkeleton: React.FC = () => {
  return (
    <div className="page-container animate-fade-in" role="status" aria-label="Carregando página...">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse-soft" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse-soft" />
          </div>
          <div className="h-10 w-32 bg-muted rounded-md animate-pulse-soft" />
        </div>
        
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-card border rounded-lg p-4 space-y-3">
              <div className="h-4 w-20 bg-muted rounded animate-pulse-soft" />
              <div className="h-8 w-24 bg-muted rounded animate-pulse-soft" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse-soft" />
            </div>
          ))}
        </div>
        
        {/* Main content area */}
        <div className="h-64 bg-card border rounded-lg p-6">
          <div className="space-y-4">
            <div className="h-4 w-32 bg-muted rounded animate-pulse-soft" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-muted rounded animate-pulse-soft" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only">Carregando página...</span>
    </div>
  );
};
