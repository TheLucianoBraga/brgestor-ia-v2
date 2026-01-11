import React, { useState, useEffect } from 'react';
import { Mail, Save, Loader2, Send, Eye, EyeOff, Server } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { toast } from 'sonner';

export const NotificationSettingsTab: React.FC = () => {
  const { settings, updateMultipleSettings } = useTenantSettings();
  
  const [notificationEmail, setNotificationEmail] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (settings) {
      setNotificationEmail(settings['notification_email'] || '');
      setSmtpHost(settings['smtp_host'] || '');
      setSmtpPort(settings['smtp_port'] || '587');
      setSmtpUser(settings['smtp_user'] || '');
      setSmtpPass(settings['smtp_pass'] || '');
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMultipleSettings.mutateAsync({
        notification_email: notificationEmail,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_pass: smtpPass,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!notificationEmail || !smtpHost || !smtpUser || !smtpPass) {
      toast.error('Preencha todas as configurações SMTP primeiro');
      return;
    }

    setIsTesting(true);
    try {
      // Placeholder for email testing - would require an edge function
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.info('Funcionalidade de teste de e-mail em desenvolvimento');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            E-mail de Notificações
          </CardTitle>
          <CardDescription>
            Configure o e-mail que receberá alertas do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notification-email">E-mail para Notificações</Label>
            <Input
              id="notification-email"
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="notificacoes@suaempresa.com"
            />
            <p className="text-xs text-muted-foreground">
              Este e-mail receberá alertas de pagamentos, novos clientes e outras notificações
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Configuração SMTP
          </CardTitle>
          <CardDescription>
            Configure seu servidor de e-mail para envio de notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">Servidor SMTP</Label>
              <Input
                id="smtp-host"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-port">Porta</Label>
              <Input
                id="smtp-port"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp-user">Usuário / E-mail</Label>
            <Input
              id="smtp-user"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp-pass">Senha / App Password</Label>
            <div className="relative">
              <Input
                id="smtp-pass"
                type={showSmtpPass ? 'text' : 'password'}
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowSmtpPass(!showSmtpPass)}
              >
                {showSmtpPass ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Para Gmail, use uma "App Password" em vez da senha normal
            </p>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleTestEmail} disabled={isTesting}>
              {isTesting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {isTesting ? 'Enviando...' : 'Testar Envio'}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
