import React from 'react';
import { 
  UserPlus, 
  CreditCard, 
  AlertTriangle, 
  Users, 
  Info,
  Trash2,
  Check,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Notification, NotificationType } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

const getNotificationIcon = (type: string) => {
  switch (type as NotificationType) {
    case 'novo_cliente':
      return { icon: UserPlus, color: 'text-green-500', bg: 'bg-green-500/10' };
    case 'pagamento_recebido':
      return { icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-500/10' };
    case 'cliente_vencido':
      return { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' };
    case 'novo_usuario':
      return { icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' };
    case 'sistema':
    default:
      return { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted' };
  }
};

const getRelativeTime = (date: string | null) => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
};

const getNotificationLink = (notification: Notification): string | null => {
  if (!notification.reference_type || !notification.reference_id) return null;
  
  switch (notification.reference_type) {
    case 'client':
      return `/app/clientes?id=${notification.reference_id}`;
    case 'payment':
      return `/app/cobrancas?id=${notification.reference_id}`;
    case 'user':
      return `/app/usuarios?id=${notification.reference_id}`;
    default:
      return null;
  }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  compact = false,
}) => {
  const { icon: Icon, color, bg } = getNotificationIcon(notification.type);
  const link = getNotificationLink(notification);
  const isRead = notification.is_read;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors',
        !isRead && 'bg-primary/5',
        compact ? 'hover:bg-muted/50' : 'hover:bg-muted/30'
      )}
    >
      <div className={cn('p-2 rounded-full shrink-0', bg)}>
        <Icon className={cn('h-4 w-4', color)} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn(
              'text-sm font-medium truncate',
              !isRead && 'text-foreground',
              isRead && 'text-muted-foreground'
            )}>
              {notification.title}
            </p>
            <p className={cn(
              'text-xs mt-0.5',
              compact ? 'line-clamp-2' : 'line-clamp-3',
              'text-muted-foreground'
            )}>
              {notification.message}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {getRelativeTime(notification.created_at)}
            </p>
          </div>
          
          {!isRead && !compact && (
            <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
          )}
        </div>
        
        {!compact && (
          <div className="flex items-center gap-1 mt-2">
            {!isRead && onMarkAsRead && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onMarkAsRead(notification.id)}
              >
                <Check className="h-3 w-3 mr-1" />
                Marcar como lida
              </Button>
            )}
            
            {link && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                asChild
              >
                <a href={link}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver detalhes
                </a>
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                onClick={() => onDelete(notification.id)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Excluir
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
