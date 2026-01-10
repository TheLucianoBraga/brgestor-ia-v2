import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Trash2, Sparkles, X, Check, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNotesAI } from '@/hooks/useNotesAI';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface NotesAIChatProps {
  className?: string;
}

export function NotesAIChat({ className }: NotesAIChatProps) {
  const { messages, isLoading, pendingAction, sendMessage, confirmAction, cancelAction, clearMessages } = useNotesAI();
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input;
    setInput('');
    await sendMessage(message);
  };

  const suggestions = [
    "Anota: comprar café amanhã",
    "Criar ideia sobre novo projeto",
    "O que anotei hoje?",
    "Fixar última nota",
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn("gap-2", className)}
        >
          <Sparkles className="w-4 h-4" />
          Assistente IA
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              Assistente de Notas
            </SheetTitle>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearMessages}
                className="h-8 w-8"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-medium text-foreground mb-1">Como posso ajudar?</h3>
              <p className="text-sm text-muted-foreground text-center mb-6 max-w-[280px]">
                Diga o que quer anotar e eu crio para você. Também posso buscar, editar e organizar suas notas.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((suggestion, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => setInput(suggestion)}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3",
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  )}>
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <Card className={cn(
                    "max-w-[85%]",
                    msg.role === 'user' && 'bg-primary text-primary-foreground'
                  )}>
                    <CardContent className="p-3 text-sm whitespace-pre-wrap">
                      {msg.content}
                    </CardContent>
                  </Card>
                </div>
              ))}

              {/* Pending action confirmation */}
              {pendingAction && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-amber-600" />
                  </div>
                  <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                    <CardContent className="p-3 space-y-3">
                      <p className="text-sm">
                        Confirmar {pendingAction.action === 'delete' ? 'exclusão' : 'ação'}?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={confirmAction}
                          disabled={isLoading}
                          className="gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelAction}
                          disabled={isLoading}
                          className="gap-1"
                        >
                          <X className="w-3 h-3" />
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Diga o que quer anotar..."
              disabled={isLoading}
              className="flex-1"
              autoFocus
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
