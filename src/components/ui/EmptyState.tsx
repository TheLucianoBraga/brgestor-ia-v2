import React from 'react';
import { LucideIcon, Inbox, Users, FileText, Bell, BarChart3, Search, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  EmptyBoxIllustration,
  EmptyUsersIllustration,
  EmptyDocumentIllustration,
  EmptyChartIllustration,
  EmptyNotificationIllustration,
  EmptySearchIllustration,
  EmptyMessageIllustration,
} from '@/components/illustrations/EmptyIllustrations';

type IllustrationType = 'box' | 'users' | 'document' | 'chart' | 'notification' | 'search' | 'message';

interface EmptyStateProps {
  icon?: LucideIcon;
  illustration?: IllustrationType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

const illustrationMap: Record<IllustrationType, React.FC<{ className?: string }>> = {
  box: EmptyBoxIllustration,
  users: EmptyUsersIllustration,
  document: EmptyDocumentIllustration,
  chart: EmptyChartIllustration,
  notification: EmptyNotificationIllustration,
  search: EmptySearchIllustration,
  message: EmptyMessageIllustration,
};

// Auto-detect illustration based on icon
const getIllustrationFromIcon = (icon?: LucideIcon): IllustrationType => {
  if (!icon) return 'box';
  
  switch (icon) {
    case Users:
      return 'users';
    case FileText:
      return 'document';
    case Bell:
      return 'notification';
    case BarChart3:
      return 'chart';
    case Search:
      return 'search';
    case MessageCircle:
      return 'message';
    default:
      return 'box';
  }
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}) => {
  const illustrationType = illustration || getIllustrationFromIcon(Icon);
  const IllustrationComponent = illustrationMap[illustrationType];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center animate-fade_in',
        className
      )}
    >
      <IllustrationComponent className="w-32 h-32 mb-6" />
      
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
      
      <div className="flex gap-3">
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="outline" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
        {actionLabel && onAction && (
          <Button onClick={onAction} className="btn-gradient-primary">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
