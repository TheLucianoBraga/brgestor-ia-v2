import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Send, 
  Sparkles, 
  DollarSign, 
  Calendar,
  Tag,
  Building2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { useAIGenerate } from '@/hooks/useAIGenerate';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: {
    type: 'create_expense' | 'mark_paid' | 'get_totals' | 'upcoming_expenses';
    data?: any;
  };
}

interface ExpenseAIChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExpenseAIChat: React.FC<ExpenseAIChatProps> = ({ open, onOpenChange }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '👋 Olá! Sou seu assistente de despesas com IA. Posso te ajudar a:\n\n• 📝 Registrar novas despesas\n• 💰 Marcar despesas como pagas\n• 📊 Ver totais e análises\n• 📅 Consultar vencimentos próximos\n• 🔔 Configurar lembretes\n\nO que você precisa hoje?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { generate } = useAIGenerate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const quickActions = [
    { label: 'Registrar despesa', icon: DollarSign, prompt: 'Quero registrar uma nova despesa' },
    { label: 'Ver totais', icon: TrendingUp, prompt: 'Mostre o total de despesas' },
    { label: 'Próximos vencimentos', icon: Calendar, prompt: 'Quais despesas vencem em breve?' },
    { label: 'Marcar como paga', icon: CheckCircle2, prompt: 'Quero marcar uma despesa como paga' },
  ];

  const parseUserIntent = async (userMessage: string): Promise<{ action?: any; response: string }> => {
    const lowerMessage = userMessage.toLowerCase();

    // Detectar intenção de criar despesa
    if (lowerMessage.includes('registrar') || lowerMessage.includes('adicionar') || lowerMessage.includes('nova despesa')) {
      return {
        action: { type: 'create_expense' },
        response: 'Ótimo! Vou te ajudar a registrar uma despesa. Por favor, me informe:\n\n1️⃣ Descrição da despesa\n2️⃣ Valor (R$)\n3️⃣ Data de vencimento\n4️⃣ Categoria (opcional)\n\nExemplo: "Conta de luz, R$ 250, vence dia 15, categoria Utilidades"',
      };
    }

    // Detectar intenção de ver totais
    if (lowerMessage.includes('total') || lowerMessage.includes('quanto') || lowerMessage.includes('gastos')) {
      // Aqui você conectaria com o hook useExpenses para pegar os dados reais
      return {
        action: { type: 'get_totals' },
        response: '📊 **Resumo Financeiro**\n\nEstou consultando seus dados...\n\n💡 Conecte este chat ao backend para dados reais!',
      };
    }

    // Detectar intenção de ver vencimentos
    if (lowerMessage.includes('venc') || lowerMessage.includes('próxim') || lowerMessage.includes('pagar')) {
      return {
        action: { type: 'upcoming_expenses' },
        response: '📅 **Próximos Vencimentos**\n\nBuscando despesas para os próximos 7 dias...\n\n💡 Conecte ao backend para listar vencimentos reais!',
      };
    }

    // Detectar intenção de marcar como paga
    if (lowerMessage.includes('marcar') && lowerMessage.includes('pag')) {
      return {
        action: { type: 'mark_paid' },
        response: 'Perfeito! Qual despesa você quer marcar como paga? Você pode:\n\n• Me dizer o nome/descrição\n• Informar a data de vencimento\n• Usar o ID da despesa\n\nExemplo: "Marcar conta de luz como paga"',
      };
    }

    // Resposta genérica usando IA (se disponível)
    try {
      const aiResponse = await generate({
        type: 'chat',
        prompt: `Você é um assistente financeiro amigável. Responda de forma concisa e útil sobre gestão de despesas. Usuário disse: "${userMessage}"`,
        context: {
          messages: [
            { role: 'user', content: userMessage }
          ],
          tenantId: 'expense_chat'
        }
      });

      const responseContent = aiResponse?.text || '🤔 Desculpe, não entendi. Tente usar uma das ações rápidas ou me pergunte sobre:\n\n• Registrar despesas\n• Ver totais\n• Vencimentos próximos\n• Marcar como paga';

      return {
        response: responseContent,
      };
    } catch {
      return {
        response: '💭 Entendi! Como posso te ajudar especificamente?\n\nUse as ações rápidas ou me diga o que precisa.',
      };
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      const { action, response } = await parseUserIntent(input.trim());

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        action,
      };

      setTimeout(() => {
        setMessages((prev) => [...prev, assistantMessage]);
        setIsProcessing(false);
      }, 800);
    } catch (error) {
      console.error('Error processing message:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '❌ Ops! Tive um problema ao processar sua mensagem. Tente novamente.',
          timestamp: new Date(),
        },
      ]);
      setIsProcessing(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    handleSendMessage();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950 dark:to-indigo-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg">Assistente IA de Despesas</DialogTitle>
              <DialogDescription>
                Chat inteligente para gerenciar suas despesas
              </DialogDescription>
            </div>
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              IA Ativa
            </Badge>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <ScrollArea ref={scrollRef} className="flex-1 p-6">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`p-2 rounded-full h-fit ${
                    message.role === 'user'
                      ? 'bg-violet-500'
                      : 'bg-gradient-to-br from-violet-500 to-indigo-500'
                  }`}
                >
                  {message.role === 'user' ? (
                    <div className="w-5 h-5 rounded-full bg-white/20" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>
                <div
                  className={`flex-1 max-w-[80%] ${
                    message.role === 'user' ? 'items-end' : 'items-start'
                  } flex flex-col gap-1`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-violet-500 text-white'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground px-2">
                    {format(message.timestamp, 'HH:mm', { locale: ptBR })}
                  </span>
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex gap-3">
                <div className="p-2 rounded-full h-fit bg-gradient-to-br from-violet-500 to-indigo-500">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        {messages.length <= 2 && (
          <div className="px-6 pb-4">
            <p className="text-xs text-muted-foreground mb-2">Ações rápidas:</p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2"
                  onClick={() => handleQuickAction(action.prompt)}
                >
                  <action.icon className="w-4 h-4" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex gap-2">
            <Input
              placeholder="Digite sua mensagem ou comando..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isProcessing}
              size="icon"
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 Dica: Use comandos como "registrar despesa" ou "ver totais"
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
