import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Bell, MessageCircle, Mail, Smartphone, CreditCard, Users, Building2, FileText, Sparkles, Moon } from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface NotificationPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationPreferencesDialog: React.FC<NotificationPreferencesDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { preferences, isLoading, updatePreferences } = useNotificationPreferences();

  const handleToggle = (key: string, value: boolean) => {
    updatePreferences.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <LoadingSkeleton variant="card" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preferências de Notificação</DialogTitle>
          <DialogDescription>
            Configure como e quando você quer receber notificações
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Canais */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Canais de Notificação</CardTitle>
              <CardDescription>Escolha por onde quer receber notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>No Sistema</Label>
                    <p className="text-xs text-muted-foreground">Notificações no sininho</p>
                  </div>
                </div>
                <Switch
                  checked={preferences?.in_app_enabled ?? true}
                  onCheckedChange={(v) => handleToggle('in_app_enabled', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <Label>WhatsApp</Label>
                    <p className="text-xs text-muted-foreground">Mensagens no número cadastrado</p>
                  </div>
                </div>
                <Switch
                  checked={preferences?.whatsapp_enabled ?? true}
                  onCheckedChange={(v) => handleToggle('whatsapp_enabled', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <div>
                    <Label>E-mail</Label>
                    <p className="text-xs text-muted-foreground">Notificações por e-mail</p>
                  </div>
                </div>
                <Switch
                  checked={preferences?.email_enabled ?? true}
                  onCheckedChange={(v) => handleToggle('email_enabled', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-purple-500" />
                  <div>
                    <Label>Push (PWA)</Label>
                    <p className="text-xs text-muted-foreground">Notificações push no dispositivo</p>
                  </div>
                </div>
                <Switch
                  checked={preferences?.push_enabled ?? false}
                  onCheckedChange={(v) => handleToggle('push_enabled', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tipos de Eventos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tipos de Eventos</CardTitle>
              <CardDescription>Escolha quais eventos geram notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-green-500" />
                  <div>
                    <Label>Pagamentos</Label>
                    <p className="text-xs text-muted-foreground">Pagamentos recebidos e pendentes</p>
                  </div>
                </div>
                <Switch
                  checked={preferences?.payment_notifications ?? true}
                  onCheckedChange={(v) => handleToggle('payment_notifications', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <Label>Clientes</Label>
                    <p className="text-xs text-muted-foreground">Novos clientes e atualizações</p>
                  </div>
                </div>
                <Switch
                  checked={preferences?.customer_notifications ?? true}
                  onCheckedChange={(v) => handleToggle('customer_notifications', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-purple-500" />
                  <div>
                    <Label>Revendas</Label>
                    <p className="text-xs text-muted-foreground">Novas revendas cadastradas</p>
                  </div>
                </div>
                <Switch
                  checked={preferences?.reseller_notifications ?? true}
                  onCheckedChange={(v) => handleToggle('reseller_notifications', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-orange-500" />
                  <div>
                    <Label>Cobranças</Label>
                    <p className="text-xs text-muted-foreground">Vencimentos e lembretes</p>
                  </div>
                </div>
                <Switch
                  checked={preferences?.charge_notifications ?? true}
                  onCheckedChange={(v) => handleToggle('charge_notifications', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Resumo Diário IA */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                Resumo Diário com IA
              </CardTitle>
              <CardDescription>
                Receba um resumo inteligente das atividades do dia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Ativar resumo diário</Label>
                  <p className="text-xs text-muted-foreground">
                    Resumo enviado automaticamente com insights
                  </p>
                </div>
                <Switch
                  checked={preferences?.daily_summary_enabled ?? true}
                  onCheckedChange={(v) => handleToggle('daily_summary_enabled', v)}
                />
              </div>

              {preferences?.daily_summary_enabled && (
                <div className="flex items-center gap-4">
                  <Label className="min-w-fit">Horário do envio:</Label>
                  <Input
                    type="time"
                    value={preferences?.daily_summary_time?.slice(0, 5) || '08:00'}
                    onChange={(e) => 
                      updatePreferences.mutate({ daily_summary_time: e.target.value + ':00' })
                    }
                    className="w-32"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Horário Silencioso */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Moon className="h-5 w-5 text-indigo-500" />
                Horário Silencioso
              </CardTitle>
              <CardDescription>
                Não receba notificações em horários específicos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Ativar horário silencioso</Label>
                  <p className="text-xs text-muted-foreground">
                    Notificações serão pausadas neste período
                  </p>
                </div>
                <Switch
                  checked={preferences?.quiet_hours_enabled ?? false}
                  onCheckedChange={(v) => handleToggle('quiet_hours_enabled', v)}
                />
              </div>

              {preferences?.quiet_hours_enabled && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label>De:</Label>
                    <Input
                      type="time"
                      value={preferences?.quiet_hours_start?.slice(0, 5) || '22:00'}
                      onChange={(e) =>
                        updatePreferences.mutate({ quiet_hours_start: e.target.value + ':00' })
                      }
                      className="w-28"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Até:</Label>
                    <Input
                      type="time"
                      value={preferences?.quiet_hours_end?.slice(0, 5) || '07:00'}
                      onChange={(e) =>
                        updatePreferences.mutate({ quiet_hours_end: e.target.value + ':00' })
                      }
                      className="w-28"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
