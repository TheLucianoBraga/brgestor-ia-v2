import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, TrendingUp, Settings2, Activity } from 'lucide-react';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { toast } from 'sonner';

export function AIControlPanel() {
  const { getSetting, updateSetting } = useTenantSettings();

  const executiveMode = getSetting('ai_executive_mode') === 'true';
  const proactiveSuggestions = getSetting('ai_proactive_suggestions') === 'true';
  const backgroundAnalysis = getSetting('ai_background_analysis') === 'true';
  const learningEnabled = getSetting('ai_learning_enabled') === 'true';

  const handleToggle = (key: string, value: boolean) => {
    updateSetting.mutate(
      { key, value: value.toString() },
      {
        onSuccess: () => {
          toast.success('Configuração atualizada!');
        },
        onError: () => {
          toast.error('Erro ao atualizar configuração');
        }
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          <CardTitle>Controle de IA Avançada</CardTitle>
        </div>
        <CardDescription>
          Configure o comportamento inteligente do chatbot para maximizar autonomia e eficiência
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Executive Mode */}
        <div className="flex items-start justify-between gap-4 p-4 border rounded-lg">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <Label htmlFor="executive-mode" className="font-semibold">
                Modo Executivo
              </Label>
              <Badge variant={executiveMode ? "default" : "secondary"} className="text-xs">
                {executiveMode ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Permite que a IA execute ações não-críticas automaticamente sem confirmação.
              Aumenta a velocidade da conversa em até 70%.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ✅ Auto-executa: visualizar dados, listar registros, exibir relatórios
            </p>
          </div>
          <Switch
            id="executive-mode"
            checked={executiveMode}
            onCheckedChange={(checked) => handleToggle('ai_executive_mode', checked)}
          />
        </div>

        {/* Proactive Suggestions */}
        <div className="flex items-start justify-between gap-4 p-4 border rounded-lg">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <Label htmlFor="proactive-suggestions" className="font-semibold">
                Sugestões Proativas
              </Label>
              <Badge variant={proactiveSuggestions ? "default" : "secondary"} className="text-xs">
                {proactiveSuggestions ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              A IA antecipa necessidades e oferece sugestões contextuais durante a conversa.
              Guia o usuário ativamente ao invés de apenas responder.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              💡 Sugere: próximas ações, alertas de vencimento, cobranças pendentes
            </p>
          </div>
          <Switch
            id="proactive-suggestions"
            checked={proactiveSuggestions}
            onCheckedChange={(checked) => handleToggle('ai_proactive_suggestions', checked)}
          />
        </div>

        {/* Background Analysis */}
        <div className="flex items-start justify-between gap-4 p-4 border rounded-lg">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              <Label htmlFor="background-analysis" className="font-semibold">
                Análise em Background
              </Label>
              <Badge variant={backgroundAnalysis ? "default" : "secondary"} className="text-xs">
                {backgroundAnalysis ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Processa dados do tenant em paralelo durante conversas, identificando
              oportunidades e anomalias sem interromper o fluxo.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              🔍 Analisa: padrões de uso, valores atípicos, ações pendentes
            </p>
          </div>
          <Switch
            id="background-analysis"
            checked={backgroundAnalysis}
            onCheckedChange={(checked) => handleToggle('ai_background_analysis', checked)}
          />
        </div>

        {/* Learning System */}
        <div className="flex items-start justify-between gap-4 p-4 border rounded-lg">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <Label htmlFor="learning-enabled" className="font-semibold">
                Sistema de Aprendizado
              </Label>
              <Badge variant={learningEnabled ? "default" : "secondary"} className="text-xs">
                {learningEnabled ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              A IA aprende com cada interação, memorizando preferências, padrões de
              categorização e horários de uso para personalizar respostas futuras.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              🧠 Aprende: categorias favoritas, horários preferenciais, canais de contato
            </p>
          </div>
          <Switch
            id="learning-enabled"
            checked={learningEnabled}
            onCheckedChange={(checked) => handleToggle('ai_learning_enabled', checked)}
          />
        </div>

        {/* Status Summary */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="h-4 w-4" />
            <span className="font-semibold text-sm">Status do Sistema</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${executiveMode ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>Modo Executivo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${proactiveSuggestions ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>Sugestões Proativas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${backgroundAnalysis ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>Análise em Background</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${learningEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>Aprendizado Ativo</span>
            </div>
          </div>
          
          {executiveMode && proactiveSuggestions && backgroundAnalysis && learningEnabled && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2 text-green-600">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-semibold">
                  🚀 IA Totalmente Ativa - Dominação 70%+ da conversa
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
