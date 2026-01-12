import { useEffect, useState } from 'react';
import { RefreshCw, Settings, Users, Save, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { GroupScheduleModal } from './GroupScheduleModal';
import { toast } from 'sonner';

interface WhatsAppGroup {
  id: string;
  waha_group_id: string;
  name: string;
  participant_count: number;
  is_admin: boolean;
  synced_at: string;
  group_autoresponder_config?: GroupConfig | null;
}

interface GroupConfig {
  id: string;
  group_id: string;
  is_enabled: boolean;
  config_type: string;
  respond_on_mention: boolean;
  respond_on_keywords: boolean;
  respond_on_questions: boolean;
  respond_all: boolean;
  mode: string;
  tone: string;
  custom_context: string | null;
  max_responses_per_minute: number;
  response_delay_seconds: number;
  ignore_admins: boolean;
}

interface GroupsSectionProps {
  tenantId?: string;
}

export function GroupsSection({ tenantId }: GroupsSectionProps) {
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<WhatsAppGroup | null>(null);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [communitiesEnabled, setCommunitiesEnabled] = useState(true);
  const [inheritFromPv, setInheritFromPv] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);
  const [schedulingGroup, setSchedulingGroup] = useState<WhatsAppGroup | null>(null);

  // Config do grupo selecionado
  const [groupConfig, setGroupConfig] = useState<Partial<GroupConfig>>({});

  const fetchGlobalSettings = async () => {
    if (!tenantId) return;
    
    const { data } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenantId)
      .in('key', ['wa_allow_groups', 'wa_allow_communities', 'groups_inherit_from_pv']);
    
    if (data) {
      data.forEach((setting) => {
        if (setting.key === 'wa_allow_groups') {
          setGlobalEnabled(setting.value === 'true');
        }
        if (setting.key === 'wa_allow_communities') {
          setCommunitiesEnabled(setting.value !== 'false'); // padrão: true
        }
        if (setting.key === 'groups_inherit_from_pv') {
          setInheritFromPv(setting.value === 'true');
        }
      });
    }
  };

  const saveGlobalSettings = async () => {
    if (!tenantId) return;
    setIsSavingGlobal(true);

    try {
      const settings = [
        { tenant_id: tenantId, key: 'wa_allow_groups', value: String(globalEnabled) },
        { tenant_id: tenantId, key: 'wa_allow_communities', value: String(communitiesEnabled) },
        { tenant_id: tenantId, key: 'groups_inherit_from_pv', value: String(inheritFromPv) }
      ];

      for (const setting of settings) {
        const { error } = await supabase
          .from('tenant_settings')
          .upsert(setting, { onConflict: 'tenant_id,key' });
        
        if (error) throw error;
      }

      toast.success('Configurações globais salvas');
    } catch (err) {
      console.error('Erro ao salvar configurações globais:', err);
      toast.error('Erro ao salvar configurações');
    }
    
    setIsSavingGlobal(false);
  };

  const fetchGroups = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('whatsapp_groups')
        .select('*, group_autoresponder_config(*)')
        .eq('tenant_id', tenantId)
        .order('name');
      
      if (error) throw error;

      // Transform the data to handle the array from left join
      const transformed = (data || []).map(g => ({
        ...g,
        group_autoresponder_config: Array.isArray(g.group_autoresponder_config) 
          ? g.group_autoresponder_config[0] || null 
          : g.group_autoresponder_config
      }));
      setGroups(transformed);
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
      toast.error('Erro ao carregar grupos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalSettings();
    fetchGroups();
  }, [tenantId]);

  const syncGroups = async () => {
    if (!tenantId) return;
    setIsSyncing(true);
    
    try {
      // Primeiro, tentamos buscar os grupos via API
      const { data, error } = await supabase.functions.invoke('waha-api', {
        body: { 
          action: 'syncGroups', 
          tenantId,
          // Adicionando flag para forçar atualização se necessário
          force: true 
        }
      });
      
      if (error) throw error;
      
      toast.success('Grupos sincronizados com sucesso');
      await fetchGroups();
    } catch (err) {
      console.error('Erro ao sincronizar grupos:', err);
      // Se falhar a função, tentamos pelo menos recarregar o que tem no banco
      toast.error('Erro ao sincronizar com WhatsApp. Recarregando dados locais...');
      await fetchGroups();
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleGroup = async (groupId: string, enabled: boolean) => {
    const { error } = await supabase
      .from('group_autoresponder_config')
      .upsert({ 
        group_id: groupId, 
        is_enabled: enabled,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'group_id' 
      });

    if (error) {
      console.error('Erro ao atualizar config:', error);
      toast.error('Erro ao atualizar configuração');
    } else {
      setGroups(prev => prev.map(g => 
        g.id === groupId 
          ? { 
              ...g, 
              group_autoresponder_config: { 
                ...g.group_autoresponder_config,
                is_enabled: enabled 
              } as GroupConfig
            } 
          : g
      ));
      toast.success(enabled ? 'Auto-responder ativado' : 'Auto-responder desativado');
    }
  };

  const openGroupConfig = (group: WhatsAppGroup) => {
    setSelectedGroup(group);
    setGroupConfig(group.group_autoresponder_config || {
      is_enabled: false,
      config_type: 'inherit',
      respond_on_mention: true,
      respond_on_keywords: true,
      respond_on_questions: true,
      respond_all: false,
      mode: 'complete',
      tone: 'friendly',
      custom_context: '',
      max_responses_per_minute: 5,
      response_delay_seconds: 2,
      ignore_admins: true
    });
  };

  const saveGroupConfig = async () => {
    if (!selectedGroup) return;

    const { error } = await supabase
      .from('group_autoresponder_config')
      .upsert({
        group_id: selectedGroup.id,
        ...groupConfig,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'group_id'
      });

    if (error) {
      console.error('Erro ao salvar config:', error);
      toast.error('Erro ao salvar configuração');
    } else {
      toast.success('Configuração salva');
      setSelectedGroup(null);
      fetchGroups();
    }
  };

  return (
    <div className="space-y-6">
      {/* Config Global */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração Padrão para Grupos e Comunidades</CardTitle>
          <CardDescription>Define comportamento global do auto-responder em grupos e comunidades.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-responder em grupos</Label>
              <p className="text-xs text-muted-foreground">Ativa/desativa globalmente para todos os grupos</p>
            </div>
            <Switch checked={globalEnabled} onCheckedChange={setGlobalEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-responder em comunidades</Label>
              <p className="text-xs text-muted-foreground">Ativa/desativa globalmente para todos os grupos de comunidade</p>
            </div>
            <Switch checked={communitiesEnabled} onCheckedChange={setCommunitiesEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Herdar configurações do PV</Label>
              <p className="text-xs text-muted-foreground">Grupos usam mesmas regras de personalidade e contexto</p>
            </div>
            <Switch checked={inheritFromPv} onCheckedChange={setInheritFromPv} />
          </div>
          <Button 
            onClick={saveGlobalSettings} 
            disabled={isSavingGlobal}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSavingGlobal ? 'Salvando...' : 'Salvar Configurações Globais'}
          </Button>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Grupos Sincronizados</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={syncGroups}
          disabled={isSyncing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          Sincronizar Grupos
        </Button>
      </div>

      {/* Lista de Grupos */}
      <div className="space-y-3">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Carregando grupos...
            </CardContent>
          </Card>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum grupo sincronizado</p>
              <p className="text-sm">Clique em "Sincronizar Grupos" para importar</p>
            </CardContent>
          </Card>
        ) : (
          groups.map((group) => (
            <Card key={group.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{group.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {group.participant_count} participantes
                      {group.is_admin && <span className="ml-2 text-primary">(Admin)</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={group.group_autoresponder_config?.is_enabled || false}
                    onCheckedChange={(v) => toggleGroup(group.id, v)}
                    disabled={!globalEnabled}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSchedulingGroup(group)}
                    title="Agendar Mensagem"
                  >
                    <CalendarClock className="w-4 h-4 text-primary" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openGroupConfig(group)}
                    title="Configurações"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal Config Individual */}
      <Sheet open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedGroup?.name}
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 py-6">
            {/* Ativação */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-responder ativo</Label>
                <p className="text-xs text-muted-foreground">Responde mensagens neste grupo</p>
              </div>
              <Switch 
                checked={groupConfig.is_enabled || false}
                onCheckedChange={(v) => setGroupConfig(prev => ({ ...prev, is_enabled: v }))}
              />
            </div>

            {/* Tipo de config */}
            <div className="space-y-2">
              <Label>Tipo de configuração</Label>
              <Select 
                value={groupConfig.config_type || 'inherit'}
                onValueChange={(v) => setGroupConfig(prev => ({ ...prev, config_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Herdar do PV</SelectItem>
                  <SelectItem value="custom">Configuração personalizada</SelectItem>
                  <SelectItem value="disabled">Desabilitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quando responder */}
            <div className="space-y-3">
              <Label>Responder quando...</Label>
              
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Mencionado (@bot)</span>
                <Switch 
                  checked={groupConfig.respond_on_mention ?? true}
                  onCheckedChange={(v) => setGroupConfig(prev => ({ ...prev, respond_on_mention: v }))}
                />
              </div>
              
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Palavras-chave detectadas</span>
                <Switch 
                  checked={groupConfig.respond_on_keywords ?? true}
                  onCheckedChange={(v) => setGroupConfig(prev => ({ ...prev, respond_on_keywords: v }))}
                />
              </div>
              
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Perguntas detectadas</span>
                <Switch 
                  checked={groupConfig.respond_on_questions ?? true}
                  onCheckedChange={(v) => setGroupConfig(prev => ({ ...prev, respond_on_questions: v }))}
                />
              </div>
              
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <span className="text-sm">Responder TODAS mensagens</span>
                  <p className="text-xs text-muted-foreground">Cuidado: pode ser invasivo</p>
                </div>
                <Switch 
                  checked={groupConfig.respond_all ?? false}
                  onCheckedChange={(v) => setGroupConfig(prev => ({ ...prev, respond_all: v }))}
                />
              </div>
            </div>

            {/* Limites */}
            <div className="space-y-3">
              <Label>Limites de resposta</Label>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Máx. respostas/minuto</Label>
                  <Input 
                    type="number"
                    value={groupConfig.max_responses_per_minute || 5}
                    onChange={(e) => setGroupConfig(prev => ({ 
                      ...prev, 
                      max_responses_per_minute: Number(e.target.value) 
                    }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Delay (segundos)</Label>
                  <Input 
                    type="number"
                    value={groupConfig.response_delay_seconds || 2}
                    onChange={(e) => setGroupConfig(prev => ({ 
                      ...prev, 
                      response_delay_seconds: Number(e.target.value) 
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Ignorar admins */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Ignorar admins do grupo</Label>
                <p className="text-xs text-muted-foreground">Não responde mensagens de admins</p>
              </div>
              <Switch 
                checked={groupConfig.ignore_admins ?? true}
                onCheckedChange={(v) => setGroupConfig(prev => ({ ...prev, ignore_admins: v }))}
              />
            </div>

            {/* Tom */}
            <div className="space-y-2">
              <Label>Tom da resposta</Label>
              <Select 
                value={groupConfig.tone || 'friendly'}
                onValueChange={(v) => setGroupConfig(prev => ({ ...prev, tone: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Amigável</SelectItem>
                  <SelectItem value="professional">Profissional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contexto customizado */}
            <div className="space-y-2">
              <Label>Contexto adicional (opcional)</Label>
              <Textarea 
                placeholder="Instruções específicas para este grupo..."
                value={groupConfig.custom_context || ''}
                onChange={(e) => setGroupConfig(prev => ({ ...prev, custom_context: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Salvar */}
            <Button onClick={saveGroupConfig} className="w-full">
              Salvar Configurações
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal de Agendamento */}
      {schedulingGroup && (
        <GroupScheduleModal
          open={!!schedulingGroup}
          onOpenChange={(open) => !open && setSchedulingGroup(null)}
          groupId={schedulingGroup.id}
          groupName={schedulingGroup.name}
          wahaGroupId={schedulingGroup.waha_group_id}
        />
      )}
    </div>
  );
}
