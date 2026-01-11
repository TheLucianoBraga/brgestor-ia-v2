import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2, ThumbsUp, ThumbsDown, AlertCircle, Volume2, VolumeX, Globe, History, Trash2, Moon, Sun, Monitor, Plus, Image, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useChatbotAdvanced, type ChatMessage, type MenuOption } from '@/hooks/useChatbotAdvanced';
import { ChatActionCard, ServiceCard, ChargeCard, PlanCard, type ChatAction } from './ChatActionCard';
import { cn } from '@/lib/utils';

// Simple markdown formatter for chat messages
function formatMarkdown(text: string): string {
  return text
    .replace(/\s*\(action:\s*[^)]+\)/gi, '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

type ChatTheme = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

interface ChatWidgetProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  fullScreen?: boolean;
}

export function ChatWidget({ isOpen: controlledIsOpen, onOpenChange, fullScreen = false }: ChatWidgetProps = {}) {
  const navigate = useNavigate();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) onOpenChange(open);
    else setInternalIsOpen(open);
  };
  
  const handleClose = () => {
    if (fullScreen) navigate(-1);
    else setIsOpen(false);
  };

  const [inputValue, setInputValue] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatTheme, setChatTheme] = useState<ChatTheme>(() => {
    if (typeof localStorage !== 'undefined') {
      return (localStorage.getItem('brgestor_chat_theme') as ChatTheme) || 'system';
    }
    return 'system';
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  const {
    config,
    configLoading,
    messages,
    isThinking,
    isSearchingWeb,
    proactiveAlerts,
    customerName,
    tenantType,
    conversationHistory,
    startSession,
    handleAction,
    sendMessage,
    sendFeedback,
    executeAction,
    loadConversation,
    clearCurrentConversation,
    deleteConversation
  } = useChatbotAdvanced({ navigate });

  const resolvedTheme = useMemo(() => {
    if (chatTheme === 'system') return getSystemTheme();
    return chatTheme;
  }, [chatTheme]);

  useEffect(() => {
    if (chatTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => setChatTheme('system');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [chatTheme]);

  const handleThemeChange = (theme: ChatTheme) => {
    setChatTheme(theme);
    localStorage.setItem('brgestor_chat_theme', theme);
  };

  useEffect(() => {
    if (soundEnabled && messages.length > 0 && messages[messages.length - 1].role === 'bot' && isOpen) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (e) {
        console.log('Audio not supported');
      }
    }
  }, [messages.length, soundEnabled, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !hasInitialized && !configLoading && config) {
      startSession();
      setHasInitialized(true);
    }
  }, [isOpen, hasInitialized, configLoading, config, startSession]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setHasNewMessage(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && messages.length > 0) setHasNewMessage(true);
  }, [messages.length, isOpen]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio') => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      await sendMessage('', { url: base64, type });
    };
    reader.readAsDataURL(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getHeaderSubtitle = () => {
    if (tenantType === 'cliente' && customerName) {
      return `Olá, ${customerName.split(' ')[0]}!`;
    }
    return 'Online agora';
  };

  if (!config?.is_active && config !== undefined) return null;

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-4 z-50 hidden md:block"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 relative"
            >
              <MessageCircle className="h-6 w-6" />
              {hasNewMessage && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-pulse" />
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed z-50",
              fullScreen 
                ? "inset-0" 
                : "bottom-20 right-4 w-[calc(100vw-2rem)] max-w-md lg:bottom-6 lg:w-[450px]",
              resolvedTheme === 'dark' ? 'dark' : ''
            )}
          >
            <div className={cn(
              "flex flex-col border shadow-2xl overflow-hidden transition-all duration-300",
              fullScreen 
                ? "h-full rounded-none" 
                : "h-[650px] max-h-[85vh] rounded-[2rem]",
              resolvedTheme === 'dark' ? 'bg-zinc-950 text-zinc-100 border-zinc-800' : 'bg-white text-zinc-900 border-zinc-200'
            )}>
              <div className="relative overflow-hidden px-6 py-6 bg-primary text-primary-foreground">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12 blur-xl" />
                
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                        <Bot className="h-6 w-6" />
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-400 border-2 border-primary rounded-full" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg tracking-tight">Assistente Virtual</h3>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium opacity-80">{getHeaderSubtitle()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <DropdownMenu open={showHistory} onOpenChange={setShowHistory}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20">
                          <History className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <div className="px-2 py-1.5 text-sm font-semibold">Conversas Anteriores</div>
                        <DropdownMenuSeparator />
                        {conversationHistory.length === 0 ? (
                          <div className="px-2 py-3 text-sm text-muted-foreground text-center">Nenhuma conversa anterior</div>
                        ) : (
                          conversationHistory.map((conv) => (
                            <div key={conv.id} className="flex items-center gap-1 group">
                              <DropdownMenuItem onClick={() => { loadConversation(conv.id); setShowHistory(false); }} className="flex-1 flex flex-col items-start gap-1 cursor-pointer">
                                <span className="text-sm truncate w-full">{conv.preview}</span>
                                <span className="text-xs text-muted-foreground">{new Date(conv.timestamp).toLocaleDateString('pt-BR')} • {conv.messageCount} msgs</span>
                              </DropdownMenuItem>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { clearCurrentConversation(); setShowHistory(false); }} className="text-primary focus:text-primary cursor-pointer">
                          <Plus className="h-4 w-4 mr-2" /> Nova conversa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20">
                          {chatTheme === 'system' ? <Monitor className="h-4 w-4" /> : chatTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleThemeChange('light')} className="cursor-pointer"><Sun className="h-4 w-4 mr-2" /> Claro</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleThemeChange('dark')} className="cursor-pointer"><Moon className="h-4 w-4 mr-2" /> Escuro</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleThemeChange('system')} className="cursor-pointer"><Monitor className="h-4 w-4 mr-2" /> Sistema</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20">
                      {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {proactiveAlerts.length > 0 && (
                <div className={cn("px-3 py-2 border-b", resolvedTheme === 'dark' ? 'bg-amber-950/30 border-amber-800' : 'bg-amber-50 border-amber-200')}>
                  <div className={cn("flex items-center gap-2", resolvedTheme === 'dark' ? 'text-amber-400' : 'text-amber-700')}>
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">{proactiveAlerts[0]}</span>
                  </div>
                </div>
              )}

              <ScrollArea className="flex-1 px-6 py-6">
                <div className="space-y-6">
                  {configLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className={cn("h-6 w-6 animate-spin", resolvedTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')} />
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          onOptionClick={(opt) => handleAction(opt.action, opt.label)}
                          onActionExecute={executeAction}
                          onFeedback={sendFeedback}
                          isDarkTheme={resolvedTheme === 'dark'}
                        />
                      ))}
                      {isThinking && (
                        <div className="flex gap-3 items-center text-muted-foreground">
                          <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center animate-pulse", resolvedTheme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100')}>
                            <Bot className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex flex-col gap-1">
                            {isSearchingWeb && (
                              <div className={cn("flex items-center gap-2 text-xs", resolvedTheme === 'dark' ? 'text-blue-400' : 'text-blue-600')}>
                                <Globe className="h-3 w-3 animate-spin" />
                                <span>Buscando na internet...</span>
                              </div>
                            )}
                            <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className={cn("p-6 border-t backdrop-blur-md", resolvedTheme === 'dark' ? 'bg-zinc-950/80 border-zinc-800' : 'bg-white/80 border-zinc-100')}>
                <div className="relative flex items-end gap-3 bg-secondary/30 dark:bg-zinc-900/50 p-2 rounded-[1.5rem] border border-transparent focus-within:border-primary/20 focus-within:bg-background transition-all duration-200">
                  <div className="flex items-center gap-1 pl-1">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} />
                    <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={(e) => handleFileUpload(e, 'audio')} />
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" onClick={() => fileInputRef.current?.click()} disabled={isThinking}>
                      <Image className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" onClick={() => audioInputRef.current?.click()} disabled={isThinking}>
                      <Mic className="h-5 w-5" />
                    </Button>
                  </div>
                  <Textarea
                    ref={inputRef}
                    placeholder="Como posso ajudar hoje?"
                    className="flex-1 min-h-[44px] max-h-[150px] resize-none py-3 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 font-medium text-sm"
                    value={inputValue} 
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isThinking}
                  />
                  <Button onClick={handleSend} disabled={(!inputValue.trim()) || isThinking} size="icon" className="h-11 w-11 rounded-xl shrink-0 shadow-lg shadow-primary/20 transition-transform active:scale-95">
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
                <p className={cn("text-[10px] text-center mt-4 font-bold uppercase tracking-widest opacity-40", resolvedTheme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}>
                  Powered by BRGestor • IA Ativa ✨
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onOptionClick: (option: MenuOption) => void;
  onActionExecute: (action: ChatAction) => Promise<void> | void;
  onFeedback: (rating: boolean, messageId?: string) => void;
  isDarkTheme: boolean;
}

function MessageBubble({ message, onOptionClick, onActionExecute, onFeedback, isDarkTheme }: MessageBubbleProps) {
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const isBot = message.role === 'bot';
  const handleFeedback = (positive: boolean) => {
    onFeedback(positive, message.id);
    setFeedbackGiven(true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-3', isBot ? 'justify-start' : 'justify-end')}>
      {isBot && (
        <div className={cn("flex-shrink-0 h-10 w-10 rounded-2xl flex items-center justify-center shadow-sm", isDarkTheme ? 'bg-zinc-800 border border-zinc-700' : 'bg-zinc-100 border border-zinc-200')}>
          <Bot className="h-5 w-5 text-primary" />
        </div>
      )}
      <div className={cn('max-w-[85%] space-y-2', isBot ? 'items-start' : 'items-end')}>
        <div className={cn('rounded-[1.5rem] px-5 py-3 text-sm leading-relaxed shadow-sm', isBot ? (isDarkTheme ? 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700' : 'bg-zinc-100 text-zinc-900 rounded-tl-none border border-zinc-200') : 'bg-primary text-primary-foreground rounded-tr-none shadow-primary/10')}>
          <div className={cn("whitespace-pre-wrap max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:my-2 [&>ul]:pl-4 [&>li]:mb-1", isDarkTheme ? 'prose-invert' : '')} dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }} />
        </div>
        {isBot && message.richContent && (
          <div className="space-y-2 w-full">
            {message.richContent.type === 'services' && message.richContent.data.map((service: any) => <ServiceCard key={service.id} service={service} />)}
            {message.richContent.type === 'plans' && <div className="space-y-2">{message.richContent.data.map((plan: any) => <PlanCard key={plan.id} plan={plan} onSelectClick={() => {}} />)}</div>}
            {message.richContent.type === 'charges' && message.richContent.data.map((charge: any) => <ChargeCard key={charge.id} charge={charge} onPayClick={() => {}} />)}
          </div>
        )}
        {isBot && message.action && <ChatActionCard action={message.action} onExecute={onActionExecute} />}
        {isBot && message.options && message.options.length > 0 && !message.action && !message.richContent && message.isWelcome && (
          <div className="grid grid-cols-1 gap-2 mt-4 w-full">
            {message.options.map((option) => (
              <Button key={option.id} variant="outline" size="sm" onClick={() => onOptionClick(option)} className={cn("text-xs h-auto py-3 px-4 justify-between text-left whitespace-normal leading-tight rounded-xl border-zinc-200 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all group", isDarkTheme && 'border-zinc-800 hover:bg-zinc-800/50')}>
                <span className="font-semibold">{option.label}</span>
                <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            ))}
          </div>
        )}
        {isBot && message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wide", isDarkTheme ? 'text-zinc-400' : 'text-zinc-500')}>
              💡 Sugestões Rápidas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {message.suggestions.map((suggestion, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const textarea = document.querySelector('textarea');
                    if (textarea) {
                      textarea.value = suggestion;
                      textarea.dispatchEvent(new Event('input', { bubbles: true }));
                      textarea.focus();
                    }
                  }}
                  className={cn(
                    "h-7 px-3 text-xs rounded-full border transition-all",
                    isDarkTheme 
                      ? 'border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700 hover:border-primary' 
                      : 'border-zinc-200 bg-zinc-50 hover:bg-white hover:border-primary'
                  )}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
        {isBot && !feedbackGiven && message.content.length > 50 && (
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("text-[10px]", isDarkTheme ? 'text-zinc-500' : 'text-zinc-400')}>Útil?</span>
            <button onClick={() => handleFeedback(true)} className={cn("hover:text-green-600 transition-colors", isDarkTheme ? 'text-zinc-500' : 'text-zinc-400')}><ThumbsUp className="h-3 w-3" /></button>
            <button onClick={() => handleFeedback(false)} className={cn("hover:text-red-600 transition-colors", isDarkTheme ? 'text-zinc-500' : 'text-zinc-400')}><ThumbsDown className="h-3 w-3" /></button>
          </div>
        )}
        <p className={cn("text-[10px] px-1", isDarkTheme ? 'text-zinc-500' : 'text-zinc-400')}>{new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
      {!isBot && (
        <div className="flex-shrink-0 h-10 w-10 rounded-2xl bg-primary flex items-center justify-center shadow-sm">
          <User className="h-5 w-5 text-primary-foreground" />
        </div>
      )}
    </motion.div>
  );
}
