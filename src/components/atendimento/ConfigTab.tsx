import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Globe, Loader2, Brain, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { KnowledgeBaseTab } from '@/components/config/KnowledgeBaseTab';

// Função para normalizar model ID
function normalizeGeminiModel(model: string | null | undefined): string {
  if (!model || typeof model !== 'string') return 'gemini-2.5_flash';
  
  // Se vier "google/gemini-xxx" -> pegar apenas "gemini-xxx"
  if (model.includes('/')) {
    const parts = model.split('/');
    const lastPart = parts[parts.length - 1];
    if (lastPart.startsWith('gemini-')) {
      return lastPart;
    }
  }
  
  // Se já for "gemini-xxx" -> manter
  if (model.startsWith('gemini-')) {
    return model;
  }
  
  // Fallback
  return 'gemini-2.5_flash';
}

const GEMINI_MODELS = [
  { value: 'gemini-2.0_flash', label: 'Gemini 2.0 Flash (Multimodal)' },
  { value: 'gemini-2.5_flash', label: 'Gemini 2.5 Flash (Rápido)' },
  { value: 'gemini-2.5-flash_lite', label: 'Gemini 2.5 Flash Lite (Ultra rápido)' },
  { value: 'gemini-2.5_pro', label: 'Gemini 2.5 Pro (Avançado)' },
  { value: 'gemini-2.5-pro-preview-06_05', label: 'Gemini 2.5 Pro Preview' },
  { value: 'gemini-exp_1206', label: 'Gemini Experimental 1206' },
  { value: 'custom', label: '⚙️ Modelo Personalizado' },
];

export function ConfigTab() {
  const { getSetting, updateMultipleSettings, isLoading: settingsLoading } = useTenantSettings();
  const { currentTenant } = useTenant();
  const { toast } = useToast();

  const isMaster = currentTenant?.type === 'master';

  const [aiModel, setAiModel] = useState('gemini-2.5_flash');
  const [customModel, setCustomModel] = useState('');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [aiWebSearch, setAiWebSearch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const aiSettingsLoadedRef = useRef(false);

  // Load AI settings
  useEffect(() => {
    if (aiSettingsLoadedRef.current) return;
    if (settingsLoading) return;
    
    const rawModel = getSetting('ai_model');
    const webSearch = getSetting('ai_web_search');
    
    aiSettingsLoadedRef.current = true;
    
    // Normalizar o modelo carregado
    const normalizedModel = normalizeGeminiModel(rawModel);
    
    // Verificar se é um modelo conhecido ou personalizado
    const isKnown = GEMINI_MODELS.some(m => m.value === normalizedModel && m.value !== 'custom');
    
    if (isKnown) {
      setAiModel(normalizedModel);
      setIsCustomModel(false);
    } else if (normalizedModel && normalizedModel !== 'gemini-2.5_flash') {
      // Modelo desconhecido = personalizado
      setAiModel('custom');
      setCustomModel(normalizedModel);
      setIsCustomModel(true);
    } else {
      setAiModel('gemini-2.5_flash');
      setIsCustomModel(false);
    }
    
    setAiWebSearch(webSearch === 'true');
  }, [settingsLoading, getSetting]);

  // Handle model selection
  const handleModelChange = (value: string) => {
    setAiModel(value);
    if (value === 'custom') {
      setIsCustomModel(true);
    } else {
      setIsCustomModel(false);
      setCustomModel('');
    }
  };

  // Get the effective model value for saving
  const getEffectiveModel = () => {
    if (isCustomModel && customModel.trim()) {
      return normalizeGeminiModel(customModel.trim());
    }
    return aiModel === 'custom' ? 'gemini-2.5_flash' : aiModel;
  };

  // Auto-save AI settings after 2 seconds of inactivity
  const autoSaveAiSettings = useCallback(async () => {
    if (!aiSettingsLoadedRef.current) return;
    
    setIsSaving(true);
    try {
      const modelToSave = getEffectiveModel();
      await updateMultipleSettings.mutateAsync({
        ai_model: modelToSave,
        ai_web_search: aiWebSearch ? 'true' : 'false'
      });
      console.log('AI settings saved with model:', modelToSave);
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações de IA.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiModel, customModel, isCustomModel, aiWebSearch, updateMultipleSettings, toast]);

  // Track previous values to detect actual changes
  const prevAiSettingsRef = useRef({ aiModel, customModel, aiWebSearch });
  const hasUserChangedRef = useRef(false);

  // Trigger auto-save when AI settings change
  useEffect(() => {
    if (!aiSettingsLoadedRef.current) return;
    
    const prev = prevAiSettingsRef.current;
    const hasChanged = prev.aiModel !== aiModel || 
                       prev.customModel !== customModel ||
                       prev.aiWebSearch !== aiWebSearch;
    
    if (!hasChanged) return;
    
    prevAiSettingsRef.current = { aiModel, customModel, aiWebSearch };
    hasUserChangedRef.current = true;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (hasUserChangedRef.current) {
        autoSaveAiSettings();
        hasUserChangedRef.current = false;
      }
    }, 2000);
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiModel, customModel, aiWebSearch]);

  const currentProvider = getSetting('ai_provider') || 'gemini';
  const providerLabel = currentProvider === 'openai' ? 'OpenAI' : 'Google Gemini';

  // Display model name
  const getDisplayModel = () => {
    if (isCustomModel && customModel) return customModel;
    const found = GEMINI_MODELS.find(m => m.value === aiModel);
    return found ? found.label.replace('⚙️ ', '') : aiModel;
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
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          💡 Estas configurações são compartilhadas entre o <strong>Chatbot Website</strong> e o <strong>WhatsApp Auto-Responder</strong>.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Configurações de IA</CardTitle>
                <CardDescription>Provedor: <strong>{providerLabel}</strong></CardDescription>
              </div>
            </div>
            {isSaving && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isMaster ? (
            <div className="space-y-3">
              <div>
                <Label>Modelo de IA</Label>
                <select
                  value={aiModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                >
                  <optgroup label="Google Gemini">
                    {GEMINI_MODELS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </optgroup>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Este modelo será usado por todas as contas filhas
                </p>
              </div>
              
              {/* Custom Model Input */}
              {isCustomModel && (
                <div>
                  <Label>ID do Modelo Personalizado</Label>
                  <Input
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="Ex: gemini-1.5-flash-001"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Digite o identificador exato do modelo (ex: gemini-1.5-pro-latest)
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span className="text-sm">Modelo de IA: <strong className="text-foreground">{getDisplayModel()}</strong></span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Configurado pelo administrador master
              </p>
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Pesquisa na Web</p>
                <p className="text-xs text-muted-foreground">Permite buscar informações atualizadas</p>
              </div>
            </div>
            <Switch checked={aiWebSearch} onCheckedChange={setAiWebSearch} />
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Base */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Base de Conhecimento</CardTitle>
              <CardDescription>FAQs e informações para a IA usar nas respostas</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <KnowledgeBaseTab />
        </CardContent>
      </Card>
    </div>
  );
}