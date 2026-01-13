import React, { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, Settings, Filter, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll_area';
import { useNotifications, NOTIFICATION_TYPES } from '@/hooks/useNotifications';
import { useDailySummaries } from '@/hooks/useDailySummaries';
import { NotificationItem } from './NotificationItem';
import { NotificationPreferencesDialog } from './NotificationPreferencesDialog';
import { DailySummaryCard } from './DailySummaryCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

export const NotificationCenter: React.FC = () => {
  const { notifications, isLoading, unreadCount, markAllAsRead, deleteNotification } = useNotifications();
  const { summaries, isLoading: summariesLoading } = useDailySummaries(7);
  const [activeTab, setActiveTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showPreferences, setShowPreferences] = useState(false);

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread' && n.is_read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  if (isLoading) {
    return <LoadingSkeleton variant="card" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Central de Notificações</h2>
            <p className="text-muted-foreground text-sm">
              {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia!'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setShowPreferences(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="all">
              Todas
              <Badge variant="secondary" className="ml-2">
                {notifications.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unread">
              Não lidas
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="summaries">
              <Sparkles className="h-4 w-4 mr-1" />
              Resumos IA
            </TabsTrigger>
          </TabsList>

          {activeTab !== 'summaries' && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-sm bg-background border rounded-md px-2 py-1"
              >
                <option value="all">Todos os tipos</option>
                {NOTIFICATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <TabsContent value="all" className="mt-0">
          <NotificationsList
            notifications={filteredNotifications}
            onDelete={(id) => deleteNotification.mutate(id)}
            emptyMessage="Nenhuma notificação encontrada"
          />
        </TabsContent>

        <TabsContent value="unread" className="mt-0">
          <NotificationsList
            notifications={filteredNotifications}
            onDelete={(id) => deleteNotification.mutate(id)}
            emptyMessage="Nenhuma notificação não lida"
          />
        </TabsContent>

        <TabsContent value="summaries" className="mt-0">
          {summariesLoading ? (
            <LoadingSkeleton variant="card" />
          ) : summaries.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Nenhum resumo disponível"
              description="Os resumos diários são gerados automaticamente às 8h com insights sobre seu negócio."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {summaries.map((summary) => (
                <DailySummaryCard key={summary.id} summary={summary} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preferences Dialog */}
      <NotificationPreferencesDialog
        open={showPreferences}
        onOpenChange={setShowPreferences}
      />
    </div>
  );
};

interface NotificationsListProps {
  notifications: any[];
  onDelete: (id: string) => void;
  emptyMessage: string;
}

const NotificationsList: React.FC<NotificationsListProps> = ({
  notifications,
  onDelete,
  emptyMessage,
}) => {
  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title={emptyMessage}
        description="Quando houver novidades, você verá aqui."
      />
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-2 pr-4">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDelete={() => onDelete(notification.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
};
