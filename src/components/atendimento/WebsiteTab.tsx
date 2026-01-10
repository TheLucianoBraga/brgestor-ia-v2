import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Sparkles, Loader2, User, Send, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatbotConfig, type MenuOption } from '@/hooks/useChatbot';
import { useTenant } from '@/contexts/TenantContext';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useToast } from '@/hooks/use-toast';

export function WebsiteTab() {
  const { config, isLoading, saveConfig } = useChatbotConfig();
  const { getSetting, updateMultipleSettings, isLoading: settingsLoading } = useTenantSettings();
  const { currentTenant } = useTenant();
  const { toast } = useToast();

  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([]);
  const [aiEnabled, setAiEnabled] = useState(false);

  const configLoadedRef = useRef(false);
  const aiSettingsLoadedRef = useRef(false);

  // Load config into form - ONLY ONCE
  useEffect(() => {
    if (configLoadedRef.current) return;
    
    if (config) {
      configLoadedRef.current = true;
      setWelcomeMessage(config.welcome_message || '');
      setBusinessHours(config.business_hours || '');
      setWhatsappNumber(config.whatsapp_number || '');
      setIsActive(config.is_active ?? true);
      setMenuOptions(config.menu_options || []);
    } else if (!isLoading) {
      configLoadedRef.current = true;
      setWelcomeMessage('Olá! 👋 Como posso ajudar você hoje?');
      setBusinessHours('Segunda a Sexta: 08:00 às 18:00\nSábado: 08:00 às 12:00');
      setMenuOptions([
        { id: 'services', label: '📋 Ver meus serviços', action: 'list_services' },
        { id: 'payment', label: '💳 2ª via de boleto', action: 'generate_payment' },
        { id: 'hours', label: '🕐 Horário de funcionamento', action: 'show_hours' },
        { id: 'attendant', label: '👤 Falar com atendente', action: 'open_whatsapp' }
      ]);
    }
  }, [config, isLoading]);

  // Load AI settings
  useEffect(() => {
    if (aiSettingsLoadedRef.current) return;
    if (settingsLoading) return;
    
    const enabled = getSetting('ai_chatbot_enabled');
    aiSettingsLoadedRef.current = true;
    setAiEnabled(enabled === 'true');
  }, [settingsLoading, getSetting]);

  const handleSave = async () => {
    try {
      await saveConfig.mutateAsync({
        welcome_message: welcomeMessage,
        business_hours: businessHours,
        whatsapp_number: whatsappNumber || null,
        is_active: isActive,
        menu_options: menuOptions as unknown as MenuOption[]
      });

      toast({
        title: 'Configurações salvas!',
        description: 'As configurações do chatbot foram atualizadas.'
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive'
      });
    }
  };

  const handleAiEnabledChange = async (enabled: boolean) => {
    setAiEnabled(enabled);
    setIsActive(enabled);
    try {
      await updateMultipleSettings.mutateAsync({
        ai_chatbot_enabled: enabled ? 'true' : 'false'
      });
      await saveConfig.mutateAsync({
        welcome_message: welcomeMessage,
        business_hours: businessHours,
        whatsapp_number: whatsappNumber || null,
        is_active: enabled,
        menu_options: menuOptions as unknown as MenuOption[]
      });
    } catch (error) {
      setAiEnabled(!enabled);
      setIsActive(!enabled);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status.',
        variant: 'destructive'
      });
    }
  };

  const addMenuOption = () => {
    const newOption: MenuOption = {
      id: crypto.randomUUID(),
      label: 'Nova opção',
      action: 'custom'
    };
    setMenuOptions([...menuOptions, newOption]);
  };

  const updateMenuOption = (index: number, field: keyof MenuOption, value: string) => {
    const updated = [...menuOptions];
    updated[index] = { ...updated[index], [field]: value };
    setMenuOptions(updated);
  };

  const removeMenuOption = (index: number) => {
    setMenuOptions(menuOptions.filter((_, i) => i !== index));
  };

  if (settingsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
      {/* Settings Column */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Status do Chatbot</CardTitle>
                <CardDescription>Ative ou desative o chatbot no seu site</CardDescription>
              </div>
              <Switch checked={aiEnabled} onCheckedChange={handleAiEnabledChange} />
            </div>
          </CardHeader>
        </Card>

        {aiEnabled && (
          <>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Menu de Opções</CardTitle>
                    <CardDescription>Botões de ação rápida do chatbot</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={addMenuOption}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {menuOptions.map((option, index) => (
                  <div key={option.id} className="flex gap-2 items-center">
                    <Input
                      value={option.label}
                      onChange={(e) => updateMenuOption(index, 'label', e.target.value)}
                      placeholder="Texto do botão"
                      className="flex-1"
                    />
                    <select
                      value={option.action}
                      onChange={(e) => updateMenuOption(index, 'action', e.target.value)}
                      className="h-10 px-3 rounded-md border bg-background text-sm"
                    >
                      <option value="list_services">Ver serviços</option>
                      <option value="generate_payment">2ª via boleto</option>
                      <option value="show_hours">Horário</option>
                      <option value="open_whatsapp">WhatsApp</option>
                      <option value="custom">Personalizado</option>
                    </select>
                    <Button variant="ghost" size="icon" onClick={() => removeMenuOption(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button onClick={handleSave} disabled={saveConfig.isPending} className="w-full">
                  {saveConfig.isPending ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Preview Column */}
      <Card className="h-fit sticky top-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Preview do Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            {/* Header */}
            <div className="p-3 border-b bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">{currentTenant?.name || 'Assistente'}</p>
                  <p className="text-xs opacity-80">
                    {aiEnabled ? '🟢 Online' : '🔴 Offline'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="p-3 space-y-3 h-[280px] overflow-y-auto bg-muted/20">
              <div className="flex gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
                <div className="bg-muted rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                  <p className="text-xs">{welcomeMessage || 'Olá! Como posso ajudar?'}</p>
                </div>
              </div>

              {aiEnabled && (
                <>
                  <div className="flex gap-2 justify-end">
                    <div className="bg-primary text-primary-foreground rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%]">
                      <p className="text-xs">Olá, preciso de ajuda!</p>
                    </div>
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                    <div className="bg-muted rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                      <p className="text-xs">Claro! Estou aqui para ajudar. O que você precisa?</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Chat Input Preview */}
            <div className="p-2 border-t bg-muted/30">
              <div className="flex gap-2">
                <div className="flex-1 h-8 px-3 rounded-md border bg-background text-xs flex items-center text-muted-foreground">
                  Digite sua mensagem...
                </div>
                <Button size="sm" className="h-8 w-8 p-0" disabled>
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
