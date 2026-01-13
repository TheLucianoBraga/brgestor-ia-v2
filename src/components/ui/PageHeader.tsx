import React from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScrolled } from '@/hooks/useScrolled';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  breadcrumbs,
  actions,
  className,
  sticky = true,
}) => {
  const isScrolled = useScrolled();

  return (
    <div 
      className={cn(
        'mb-8 animate-fade-in py-4 transition-all duration_300',
        sticky && 'sticky top-24 lg:top-20 z-20 bg-background/80 backdrop-blur_md',
        sticky && isScrolled && 'py-2 border-b border-border/50 shadow_sm',
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          {Icon && (
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Icon className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 overflow-x-auto hide-scrollbar">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-50" />}
                    <span className={cn(
                      'whitespace_nowrap',
                      index === breadcrumbs.length - 1 ? 'text_primary' : ''
                    )}>
                      {crumb.label}
                    </span>
                  </React.Fragment>
                ))}
              </nav>
            )}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight truncate">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1 font-medium line-clamp-1">{description}</p>
            )}
          </div>
        </div>
        
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
