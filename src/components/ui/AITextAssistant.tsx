import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

interface AITextAssistantProps {
  value: string;
  onUpdate: (newValue: string) => void;
  disabled?: boolean;
  className?: string;
}

type ActionType = 'improve' | 'shorten' | 'translate' | 'tone';

export function AITextAssistant({ value, onUpdate, disabled, className }: AITextAssistantProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const { currentTenant } = useTenant();

  const cleanMarkdown = (text: string): string => {
    if (!text) return text;
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[\*\-\+]\s+/gm, '• ')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const callAI = async (type: string, prompt: string, context?: any): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate', {
        body: {
          type,
          prompt,
          context: { tenantId: currentTenant?.id, ...context },
          aiConfig: { provider: 'gemini' },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return cleanMarkdown(data?.text || '');
    } catch (err: any) {
      console.error('[AITextAssistant] Erro:', err);
      toast.error(err.message || 'Erro ao processar com IA');
      return null;
    }
  };

  const handleAction = async (action: ActionType, param?: string) => {
    if (!value.trim()) {
      toast.error('Digite algum texto primeiro');
      return;
    }

    const actionKey = param ? `${action}-${param}` : action;
    setIsLoading(true);
    setLoadingAction(actionKey);

    let result: string | null = null;

    switch (action) {
      case 'improve':
        result = await callAI('improve', value);
        break;
      case 'shorten':
        result = await callAI('shorten', value);
        break;
      case 'translate':
        result = await callAI('translate', value, { targetLanguage: param });
        break;
      case 'tone':
        result = await callAI('tone', value, { tone: param });
        break;
    }

    if (result) {
      onUpdate(result);
      toast.success('Texto atualizado!');
    }

    setIsLoading(false);
    setLoadingAction(null);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10 ${className || ''}`}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 bg-popover z-50">
        <DropdownMenuItem 
          onClick={() => handleAction('improve')}
          disabled={isLoading}
        >
          {loadingAction === 'improve' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Melhorar Escrita
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleAction('shorten')}
          disabled={isLoading}
        >
          {loadingAction === 'shorten' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <span className="mr-2">✂️</span>
          )}
          Encurtar
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={isLoading}>
            <span className="mr-2">🌐</span>
            Traduzir
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="bg-popover z-50">
            <DropdownMenuItem onClick={() => handleAction('translate', 'en')}>
              {loadingAction === 'translate-en' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              🇺🇸 Inglês
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('translate', 'es')}>
              {loadingAction === 'translate-es' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              🇪🇸 Espanhol
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={isLoading}>
            <span className="mr-2">🎭</span>
            Mudar Tom
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="bg-popover z-50">
            <DropdownMenuItem onClick={() => handleAction('tone', 'friendly')}>
              {loadingAction === 'tone-friendly' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              😊 Amigável
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('tone', 'sales')}>
              {loadingAction === 'tone-sales' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              💼 Vendedor/Persuasivo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('tone', 'executive')}>
              {loadingAction === 'tone-executive' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              👔 Executivo/Comercial
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
