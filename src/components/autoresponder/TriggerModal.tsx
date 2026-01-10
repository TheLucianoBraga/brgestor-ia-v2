import { useState, useEffect } from 'react';
import { Plus, X, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

export interface Trigger {
  keywords: string[];
  message: string;
  sendPix: boolean;
  useAI: boolean;
  aiContext?: string;
}

interface TriggerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: Trigger | null;
  onSave: (trigger: Trigger) => void;
}

export function TriggerModal({ open, onOpenChange, trigger, onSave }: TriggerModalProps) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [message, setMessage] = useState('');
  const [sendPix, setSendPix] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [aiContext, setAiContext] = useState('');

  const isEditing = !!trigger;

  useEffect(() => {
    if (open) {
      if (trigger) {
        setKeywords([...trigger.keywords]);
        setMessage(trigger.message);
        setSendPix(trigger.sendPix);
        setUseAI(trigger.useAI ?? true);
        setAiContext(trigger.aiContext || '');
      } else {
        setKeywords([]);
        setMessage('');
        setSendPix(false);
        setUseAI(true);
        setAiContext('');
      }
      setNewKeyword('');
    }
  }, [open, trigger]);

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;
    const kw = newKeyword.trim().toLowerCase();
    if (!keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleSave = () => {
    if (keywords.length === 0 || !message.trim()) return;
    onSave({
      keywords,
      message: message.trim(),
      sendPix,
      useAI,
      aiContext: aiContext.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Gatilho' : 'Novo Gatilho'}</DialogTitle>
          <DialogDescription>
            Configure palavras-chave que ativam uma resposta automática.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Palavras-chave</Label>
            <div className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Digite e pressione Enter..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddKeyword}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {keywords.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-2">
                {keywords.map((kw, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {kw}
                    <button onClick={() => handleRemoveKeyword(kw)} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Adicione pelo menos uma palavra-chave</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Mensagem base</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Olá! 👋 Como posso ajudá-lo hoje?"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {useAI ? 'A IA usará esta mensagem como base para responder' : 'Mensagem enviada exatamente como escrita'}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3 bg-primary/5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <div>
                <Label>Melhorar com IA</Label>
                <p className="text-sm text-muted-foreground">IA adapta a resposta ao contexto da conversa</p>
              </div>
            </div>
            <Switch checked={useAI} onCheckedChange={setUseAI} />
          </div>

          {useAI && (
            <div className="space-y-2">
              <Label>Contexto adicional para IA (opcional)</Label>
              <Textarea
                value={aiContext}
                onChange={(e) => setAiContext(e.target.value)}
                placeholder="Ex: Foque em vendas, mencione promoção ativa, seja mais formal..."
                rows={2}
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <Label>Enviar botão de PIX</Label>
              <p className="text-sm text-muted-foreground">Inclui QR Code para pagamento via PIX</p>
            </div>
            <Switch checked={sendPix} onCheckedChange={setSendPix} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={keywords.length === 0 || !message.trim()}
          >
            {isEditing ? 'Salvar alterações' : 'Adicionar gatilho'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}