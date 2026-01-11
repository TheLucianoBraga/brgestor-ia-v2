import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Phone, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppRemindersProps {
  upcomingExpenses: number;
}

export const WhatsAppReminders: React.FC<WhatsAppRemindersProps> = ({ upcomingExpenses }) => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState({
    whatsappEnabled: true,
    chatEnabled: true,
    daysBefore: 3,
    dailyDigest: true,
    overdueAlert: true,
  });

  const handleSave = () => {
    toast.success('Configurações de lembretes salvas!', {
      description: 'Você receberá notificações no WhatsApp e Chat',
    });
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Bell className="w-4 h-4" />
        <span className="hidden sm:inline">Lembretes</span>
        {upcomingExpenses > 0 && (
          <Badge variant="destructive" className="ml-1">
            {upcomingExpenses}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-600" />
              Lembretes Inteligentes
            </DialogTitle>
            <DialogDescription>
              Configure quando e como receber lembretes sobre suas despesas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* WhatsApp */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-600" />
                  WhatsApp
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receber lembretes no WhatsApp
                </p>
              </div>
              <Switch
                checked={settings.whatsappEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, whatsappEnabled: checked })
                }
              />
            </div>

            {/* Chat Interno */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  Chat Interno
                </Label>
                <p className="text-sm text-muted-foreground">
                  Notificações no chat do sistema
                </p>
              </div>
              <Switch
                checked={settings.chatEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, chatEnabled: checked })
                }
              />
            </div>

            {/* Dias antes do vencimento */}
            <div className="space-y-2">
              <Label className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Antecipar lembretes
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Avisar</span>
                <Badge variant="outline">{settings.daysBefore} dias</Badge>
                <span className="text-sm text-muted-foreground">antes do vencimento</span>
              </div>
            </div>

            {/* Resumo diário */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Resumo Diário</Label>
                <p className="text-sm text-muted-foreground">
                  Receber resumo às 9h todos os dias
                </p>
              </div>
              <Switch
                checked={settings.dailyDigest}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, dailyDigest: checked })
                }
              />
            </div>

            {/* Alerta de vencidas */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Alerta de Vencidas</Label>
                <p className="text-sm text-muted-foreground">
                  Notificação imediata para despesas vencidas
                </p>
              </div>
              <Switch
                checked={settings.overdueAlert}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, overdueAlert: checked })
                }
              />
            </div>

            {/* Preview */}
            {upcomingExpenses > 0 && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Lembretes Ativos</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Você receberá {upcomingExpenses} lembrete{upcomingExpenses > 1 ? 's' : ''} nos
                      próximos dias via{' '}
                      {settings.whatsappEnabled && settings.chatEnabled
                        ? 'WhatsApp e Chat'
                        : settings.whatsappEnabled
                        ? 'WhatsApp'
                        : 'Chat'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Salvar Configurações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
