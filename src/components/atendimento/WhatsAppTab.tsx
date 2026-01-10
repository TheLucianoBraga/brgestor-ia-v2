import { useEffect, useMemo, useState } from 'react';
import { MessageSquareText, Pencil, Plus, Trash2, User, Users, QrCode, SlidersHorizontal, Sparkles } from 'lucide-react';
import { GroupsSection } from '@/components/autoresponder/GroupsSection';
import { TriggerModal, Trigger } from '@/components/autoresponder/TriggerModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useTenant } from '@/contexts/TenantContext';

type DefaultMode = 'ai' | 'human' | 'paused';

const boolFrom = (v: string | undefined) => v === 'true';

export function WhatsAppTab() {
  const { currentTenant } = useTenant();
  const { settings, getSetting, updateMultipleSettingsWithToast, isLoading } = useTenantSettings();
  const [isInitialized, setIsInitialized] = useState(false);

  // State
  const [viewMode, setViewMode] = useState<'pv' | 'groups'>('pv');
  const [enabled, setEnabled] = useState(false);
  const [defaultMode, setDefaultMode] = useState<DefaultMode>('ai');
  const [shadowMode, setShadowMode] = useState(true);
  const [handoffKeywords, setHandoffKeywords] = useState('atendente, humano, suporte');
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(false);
  const [businessStart, setBusinessStart] = useState('08:00');
  const [businessEnd, setBusinessEnd] = useState('18:00');

  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<{ trigger: Trigger; index: number } | null>(null);

  // Load settings
  useEffect(() => {
    if (!settings || isInitialized) return;

    setEnabled(boolFrom(getSetting('wa_auto_enabled')));
    setDefaultMode((getSetting('wa_auto_mode_default') as DefaultMode) || 'ai');
    setShadowMode(getSetting('wa_shadow_mode_enabled') ? boolFrom(getSetting('wa_shadow_mode_enabled')) : true);
    setHandoffKeywords(getSetting('wa_handoff_keywords') || 'atendente, humano, suporte');
    setBusinessHoursEnabled(boolFrom(getSetting('wa_business_hours_enabled')));
    setBusinessStart(getSetting('wa_business_hours_start') || '08:00');
    setBusinessEnd(getSetting('wa_business_hours_end') || '18:00');

    try {
      const triggersJson = getSetting('wa_triggers');
      if (triggersJson) {
        const parsed = JSON.parse(triggersJson);
        setTriggers(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setTriggers([]);
    }
    
    setIsInitialized(true);
  }, [settings, getSetting, isInitialized]);

  // Reset when tenant changes
  useEffect(() => {
    setIsInitialized(false);
  }, [currentTenant?.id]);

  const settingsToSave = useMemo(() => {
    return {
      wa_auto_enabled: String(enabled),
      wa_auto_mode_default: defaultMode,
      wa_shadow_mode_enabled: String(shadowMode),
      wa_handoff_keywords: handoffKeywords,
      wa_business_hours_enabled: String(businessHoursEnabled),
      wa_business_hours_start: businessStart,
      wa_business_hours_end: businessEnd,
      wa_triggers: JSON.stringify(triggers),
    };
  }, [enabled, defaultMode, shadowMode, handoffKeywords, businessHoursEnabled, businessStart, businessEnd, triggers]);

  const handleOpenNewTrigger = () => {
    setEditingTrigger(null);
    setTriggerModalOpen(true);
  };

  const handleEditTrigger = (index: number) => {
    setEditingTrigger({ trigger: triggers[index], index });
    setTriggerModalOpen(true);
  };

  const handleSaveTrigger = (trigger: Trigger) => {
    if (editingTrigger) {
      const updated = [...triggers];
      updated[editingTrigger.index] = trigger;
      setTriggers(updated);
    } else {
      setTriggers([...triggers, trigger]);
    }
    setEditingTrigger(null);
  };

  const handleRemoveTrigger = (index: number) => {
    setTriggers(triggers.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    await updateMultipleSettingsWithToast.mutateAsync(settingsToSave);
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Toggle PV / Groups */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-full sm:w-fit overflow-x-auto no-scrollbar">
          <Button 
            variant={viewMode === 'pv' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('pv')}
            className="gap-2 flex-1 sm:flex-none whitespace-nowrap"
          >
            <User className="w-4 h-4" />
            Conversas Privadas
          </Button>
          <Button 
            variant={viewMode === 'groups' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('groups')}
            className="gap-2 flex-1 sm:flex-none whitespace-nowrap"
          >
            <Users className="w-4 h-4" />
            Grupos
          </Button>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
          <Badge variant={enabled ? 'default' : 'secondary'} className="h-8">{enabled ? 'ATIVO' : 'INATIVO'}</Badge>
          <Button onClick={handleSave} disabled={updateMultipleSettingsWithToast.isPending} className="flex-1 sm:flex-none">
            Salvar Configurações
          </Button>
        </div>
      </div>

      {viewMode === 'groups' ? (
        <GroupsSection tenantId={currentTenant?.id} />
      ) : (
        <>
          <Alert>
            <AlertDescription>
              Configure o webhook WAHA para usar o auto-responder. Vá em{' '}
              <a href="/app/whatsapp" className="text-primary underline">WhatsApp</a>{' '}
              para conectar sua conta.
            </AlertDescription>
          </Alert>

          {/* Configurações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5" />
                Geral
              </CardTitle>
              <CardDescription>Ativa/desativa, modo padrão e regras básicas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>Auto-responder ativo</Label>
                  <p className="text-sm text-muted-foreground">Se desligado, nada responde automaticamente.</p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modo padrão da conversa</Label>
                  <Select value={defaultMode} onValueChange={(v) => setDefaultMode(v as DefaultMode)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ai">IA responde</SelectItem>
                      <SelectItem value="human">Humano (IA só sugere)</SelectItem>
                      <SelectItem value="paused">Pausado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <Label>Modo Inteligente</Label>
                    <p className="text-sm text-muted-foreground">IA gerencia gatilhos e confirma ações.</p>
                  </div>
                  <Switch checked={shadowMode} onCheckedChange={setShadowMode} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Palavras para chamar atendente (handoff)</Label>
                <Input
                  value={handoffKeywords}
                  onChange={(e) => setHandoffKeywords(e.target.value)}
                  placeholder="ex: atendente, humano, suporte"
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <Label>Respeitar horário comercial</Label>
                  <p className="text-sm text-muted-foreground">Fora do horário, responde com template padrão.</p>
                </div>
                <Switch checked={businessHoursEnabled} onCheckedChange={setBusinessHoursEnabled} />
              </div>

              {businessHoursEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input value={businessStart} onChange={(e) => setBusinessStart(e.target.value)} placeholder="08:00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim</Label>
                    <Input value={businessEnd} onChange={(e) => setBusinessEnd(e.target.value)} placeholder="18:00" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gatilhos */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquareText className="w-5 h-5" />
                    Gatilhos de Mensagem
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    <strong>IA Desativada:</strong> Envia a mensagem exata.<br/>
                    <strong>IA Ativada + Modo Inteligente:</strong> IA gerencia os gatilhos.
                  </CardDescription>
                </div>
                <Button onClick={handleOpenNewTrigger} className="shrink-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo gatilho
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {triggers.length > 0 ? (
                <div className="space-y-3">
                  {triggers.map((trigger, index) => (
                    <div key={index} className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {trigger.keywords.map((kw, kwIdx) => (
                              <Badge key={kwIdx} variant="secondary">{kw}</Badge>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{trigger.message}</p>
                          <div className="flex gap-1 flex-wrap">
                            {(trigger.useAI ?? true) && (
                              <Badge variant="default" className="gap-1">
                                <Sparkles className="w-3 h-3" /> IA
                              </Badge>
                            )}
                            {trigger.sendPix && (
                              <Badge variant="outline" className="gap-1">
                                <QrCode className="w-3 h-3" /> PIX
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditTrigger(index)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveTrigger(index)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquareText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum gatilho cadastrado</p>
                  <p className="text-sm">Clique em "Novo gatilho" para adicionar</p>
                </div>
              )}
            </CardContent>
          </Card>

          <TriggerModal
            open={triggerModalOpen}
            onOpenChange={setTriggerModalOpen}
            trigger={editingTrigger?.trigger}
            onSave={handleSaveTrigger}
          />
        </>
      )}
    </div>
  );
}
