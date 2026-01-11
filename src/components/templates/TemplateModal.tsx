import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  MessageTemplate, 
  TemplateInsert, 
  TEMPLATE_TYPES, 
  TEMPLATE_VARIABLE_CATEGORIES,
  TEMPLATE_CHANNELS,
  TemplateChannel
} from '@/hooks/useTemplates';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useAIGenerate } from '@/hooks/useAIGenerate';
import { Loader2, Copy, Eye, Image as ImageIcon, X, Upload, MessageCircle, Mail, Bell, Sparkles, Wand2, Undo2, User, CreditCard, MapPin, Car, FileText, Package, Wrench, Mic, Mic2, ChevronDown, ChevronUp } from 'lucide-react';
import { AITextAssistant } from '@/components/ui/AITextAssistant';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: MessageTemplate | null;
  onSave: (data: TemplateInsert) => void;
  isLoading?: boolean;
}

const MOCK_DATA: Record<string, string> = {
  '{primeiro_nome}': 'João',
  '{nome}': 'João Silva',
  '{whatsapp}': '(11) 99999-9999',
  '{whatsapp_secundario}': '(11) 88888-8888',
  '{email}': 'joao.silva@email.com',
  '{cpf_cnpj}': '123.456.789-00',
  '{rg_ie}': '12.345.678-9',
  '{nascimento}': '15/03/1990',
  '{genero}': 'Masculino',
  '{senha_portal}': 'abc123',
  '{link_portal}': 'https://portal.brgestor.com',
  '{produto}': 'Plano Premium',
  '{plano}': 'Mensal',
  '{servico}': 'Internet 100MB',
  '{status_servico}': 'Ativo',
  '{valor}': 'R$ 99,90',
  '{desconto}': 'R$ 10,00',
  '{valor_total_desconto}': 'R$ 89,90',
  '{vencimento}': '15/01/2026',
  '{dias}': '3',
  '{pix}': '00020126580014br.gov.bcb.pix0136abc123',
  '{link_pagamento}': 'https://pay.brgestor.com/abc123',
  '{data_cadastro}': '01/01/2026',
  '{cep}': '01310-100',
  '{rua}': 'Av. Paulista',
  '{numero}': '1000',
  '{complemento}': 'Sala 101',
  '{bairro}': 'Bela Vista',
  '{cidade}': 'São Paulo',
  '{estado}': 'SP',
  '{placa}': 'ABC-1234',
  '{marca}': 'Toyota',
  '{modelo}': 'Corolla',
  '{ano}': '2023',
  '{cor}': 'Prata',
  '{renavam}': '12345678901',
  '{periodo_dia}': 'Bom dia',
  '{observacoes}': 'Cliente VIP',
  '{empresa}': 'BRGestor',
};

export function TemplateModal({
  open,
  onOpenChange,
  template,
  onSave,
  isLoading,
}: TemplateModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('personalizado');
  const [channel, setChannel] = useState<TemplateChannel>('whatsapp');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [previousContent, setPreviousContent] = useState<string | null>(null);
  const [showVariables, setShowVariables] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadImage, isUploading, progress } = useImageUpload();
  const { generateTemplate, improveText, isGenerating, isActionLoading } = useAIGenerate();

  const handleGenerateWithAI = async () => {
    if (!name.trim() && !type) {
      toast.error('Preencha o nome ou tipo do template');
      return;
    }
    
    try {
      const prompt = `Crie uma mensagem ${type === 'cobranca' ? 'de cobrança amigável' : type === 'lembrete' ? 'de lembrete' : type === 'boas_vindas' ? 'de boas-vindas' : type === 'confirmacao' ? 'de confirmação' : 'profissional'} para ${channel === 'whatsapp' ? 'WhatsApp' : channel === 'email' ? 'e-mail' : 'notificação'}.
${name ? `Contexto: ${name}` : ''}
Use as variáveis disponíveis: {nome}, {valor}, {vencimento}, {produto}, {link_pagamento}, {periodo_dia}.
A mensagem deve ser curta, objetiva e profissional. Use emojis ocasionalmente para WhatsApp.`;
      
      const result = await generateTemplate(prompt);
      if (result) {
        setPreviousContent(content);
        setContent(result);
        toast.success('Mensagem gerada com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao gerar com IA:', err);
      toast.error('Erro ao gerar mensagem');
    }
  };

  const handleImproveWithAI = async () => {
    if (!content.trim()) {
      toast.error('Digite algum conteúdo para melhorar');
      return;
    }
    
    try {
      const result = await improveText(content, setPreviousContent);
      if (result) {
        setContent(result);
        toast.success('Mensagem melhorada!');
      }
    } catch (err) {
      console.error('Erro ao melhorar com IA:', err);
      toast.error('Erro ao melhorar mensagem');
    }
  };

  const handleUndo = () => {
    if (previousContent) {
      setContent(previousContent);
      setPreviousContent(null);
      toast.success('Conteúdo anterior restaurado');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadImage(file, {
      folder: 'templates',
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.85,
    });

    if (result?.url) {
      setImageUrl(result.url);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (template) {
      setName(template.name);
      setType(template.type);
      setChannel(template.channel || 'whatsapp');
      setContent(template.content);
      setImageUrl(template.image_url || '');
      setAudioUrl(template.audio_url || '');
      setIsActive(template.is_active);
    } else {
      setName('');
      setType('personalizado');
      setChannel('whatsapp');
      setContent('');
      setImageUrl('');
      setAudioUrl('');
      setIsActive(true);
    }
    setPreviousContent(null);
    setShowVariables(false);
    setShowPreview(false);
  }, [template, open]);

  const handleInsertVariable = (variable: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newContent = content.substring(0, start) + variable + content.substring(end);
      setContent(newContent);
      
      // Focus and set cursor after the inserted variable
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = start + variable.length;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    } else {
      setContent(content + variable);
    }
    // No mobile, fecha as variáveis após inserir para liberar espaço
    if (window.innerWidth < 768) {
      setShowVariables(false);
    }
  };

  const getPreviewContent = () => {
    let preview = content;
    Object.entries(MOCK_DATA).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    return preview;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      type,
      channel,
      content,
      image_url: imageUrl || null,
      audio_url: audioUrl || null,
      is_active: isActive,
    });
  };

  const isValid = name.trim() && content.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden p-0 sm:p-6">
        <DialogHeader className="flex-shrink-0 p-4 sm:p-0 border-b sm:border-0">
          <DialogTitle className="text-lg sm:text-xl">
            {template ? 'Editar Template' : 'Novo Template de Mensagem'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-0 md:gap-6 flex-1 min-h-0 overflow-hidden">
          {/* Left side - Form */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-0">
            <div className="space-y-4 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Template *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Lembrete de Vencimento"
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="channel">Canal *</Label>
                  <Select value={channel} onValueChange={(v) => setChannel(v as TemplateChannel)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_CHANNELS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <span className="flex items-center gap-2">
                            {c.value === 'whatsapp' && <MessageCircle className="h-4 w-4" />}
                            {c.value === 'email' && <Mail className="h-4 w-4" />}
                            {c.value === 'in_app' && <Bell className="h-4 w-4" />}
                            {c.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">Conteúdo da Mensagem *</Label>
                  <div className="flex items-center gap-1">
                    {previousContent && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleUndo}
                        className="h-7 px-2 text-xs"
                      >
                        <Undo2 className="h-3 w-3 mr-1" /> Desfazer
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVariables(!showVariables)}
                      className="md:hidden h-7 px-2 text-xs"
                    >
                      {showVariables ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                      Variáveis
                    </Button>
                  </div>
                </div>
                
                {/* Mobile Variables Toggle */}
                {showVariables && (
                  <Card className="md:hidden border-primary/20 bg-primary/5 mb-2">
                    <CardContent className="p-3">
                      <ScrollArea className="h-48">
                        <div className="space-y-3">
                          {TEMPLATE_VARIABLE_CATEGORIES.map((category) => (
                            <div key={category.name} className="space-y-1.5">
                              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{category.name}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {category.variables.map((v) => (
                                  <Badge
                                    key={v.key}
                                    variant="secondary"
                                    className="cursor-pointer text-[10px] py-0.5 px-2"
                                    onClick={() => handleInsertVariable(v.key)}
                                  >
                                    {v.label}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                <div className="relative group">
                  <Textarea
                    id="content"
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Digite sua mensagem aqui... Use {nome} para personalizar."
                    className="min-h-[150px] sm:min-h-[200px] resize-none pr-10"
                    required
                  />
                  <div className="absolute right-2 bottom-2 flex flex-col gap-2">
                    <AITextAssistant
                      value={content}
                      onUpdate={(text) => {
                        setPreviousContent(content);
                        setContent(text);
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex gap-3">
                    <span>{content.length} caracteres</span>
                    <span>{Math.ceil(content.length / 160)} SMS</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateWithAI}
                      disabled={isGenerating}
                      className="h-7 text-[10px] sm:text-xs"
                    >
                      {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1 text-amber-500" />}
                      Gerar com IA
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleImproveWithAI}
                      disabled={isGenerating}
                      className="h-7 text-[10px] sm:text-xs"
                    >
                      {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1 text-blue-500" />}
                      Melhorar Texto
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Imagem (opcional)</Label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex-1 h-10"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {isUploading ? 'Enviando...' : 'Enviar Imagem'}
                      </Button>
                    </div>

                    <div className="relative">
                      <Input
                        id="imageUrl"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Ou cole uma URL..."
                        disabled={isUploading}
                        className="h-10"
                      />
                      {imageUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setImageUrl('')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {imageUrl && (
                      <div className="relative rounded-lg overflow-hidden border bg-muted h-20">
                        <img
                          src={imageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audioUrl">Áudio (opcional)</Label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'audio/*';
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              const result = await uploadImage(file, { folder: 'templates' });
                              if (result?.url) setAudioUrl(result.url);
                            }
                          };
                          input.click();
                        }}
                        disabled={isUploading}
                        className="flex-1 h-10"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Mic className="h-4 w-4 mr-2" />
                        )}
                        {isUploading ? 'Enviando...' : 'Enviar Áudio'}
                      </Button>
                    </div>

                    <div className="relative">
                      <Input
                        id="audioUrl"
                        value={audioUrl}
                        onChange={(e) => setAudioUrl(e.target.value)}
                        placeholder="Ou cole uma URL..."
                        disabled={isUploading}
                        className="h-10"
                      />
                      {audioUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setAudioUrl('')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {audioUrl && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg border h-20">
                        <Mic className="h-5 w-5 text-primary" />
                        <span className="text-xs font-medium truncate flex-1">Áudio configurado</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border/50">
                <div className="space-y-0.5">
                  <Label htmlFor="active" className="text-sm font-semibold">Template Ativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Templates inativos não podem ser usados
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>
          </div>

          <Separator orientation="vertical" className="hidden md:block" />
          <Separator orientation="horizontal" className="md:hidden" />

          {/* Right side - Variables & Preview (Desktop) */}
          <div className="hidden md:flex w-80 space-y-4 flex-col">
            {/* Variables */}
            <Card className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <CardHeader className="py-2 px-3 flex-shrink-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Variáveis Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 px-3 pb-3 flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="h-full pr-2">
                  <div className="space-y-3">
                    {TEMPLATE_VARIABLE_CATEGORIES.map((category) => {
                      const IconComponent = {
                        'User': User,
                        'CreditCard': CreditCard,
                        'MapPin': MapPin,
                        'Car': Car,
                        'FileText': FileText,
                        'Package': Package,
                        'Wrench': Wrench,
                        'Mic': Mic,
                      }[category.icon] || FileText;
                      
                      return (
                        <div key={category.name} className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <IconComponent className="h-3 w-3" />
                            {category.name}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {category.variables.map((v) => (
                              <Badge
                                key={v.key}
                                variant="outline"
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors text-xs py-0.5 px-2 font-normal"
                                onClick={() => handleInsertVariable(v.key)}
                                title={`${v.label}: ${v.example}`}
                              >
                                {v.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card className="flex-shrink-0">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview da Mensagem
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0">
                <div className="bg-[#075E54] rounded-lg p-3 space-y-2">
                  <div className="bg-[#DCF8C6] rounded-lg p-3 text-sm text-gray-800 max-w-full shadow-sm">
                    {imageUrl && (
                      <div className="mb-2 rounded overflow-hidden bg-gray-200 flex items-center justify-center h-32">
                        <img 
                          src={imageUrl} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">
                      {getPreviewContent() || 'Sua mensagem aparecerá aqui...'}
                    </p>
                    <div className="text-right text-xs text-gray-500 mt-1">
                      12:00 ✓✓
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Preview Toggle */}
          <div className="md:hidden p-4 border-t bg-background sticky bottom-0 z-10">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="flex-1 h-11"
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Ocultar Preview' : 'Ver Preview'}
              </Button>
              <Button
                type="submit"
                disabled={!isValid || isLoading}
                className="flex-1 h-11"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {template ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </form>

        {/* Mobile Preview Overlay */}
        {showPreview && (
          <div className="md:hidden fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
            <Card className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-sm">Preview Mobile</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="bg-[#075E54] rounded-lg p-4">
                  <div className="bg-[#DCF8C6] rounded-lg p-3 text-sm text-gray-800 shadow-sm">
                    {imageUrl && (
                      <div className="mb-2 rounded overflow-hidden h-40">
                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">
                      {getPreviewContent() || 'Sua mensagem aparecerá aqui...'}
                    </p>
                    <div className="text-right text-xs text-gray-500 mt-1">12:00 ✓✓</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Desktop Footer */}
        <div className="hidden md:flex justify-end gap-3 p-4 border-t bg-muted/20">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="template-form"
            disabled={!isValid || isLoading}
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(e as any);
            }}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {template ? 'Salvar Alterações' : 'Criar Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
