import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { ContentPost, ContentPostInput } from '@/hooks/useContentPosts';
import { useContentVersions } from '@/hooks/useContentVersions';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useAIGenerate } from '@/hooks/useAIGenerate';
import { AIVariationsModal } from './AIVariationsModal';
import { FileText, Image, Video, Plus, Upload, X, Loader2, Calendar, Clock, Images, Sparkles, Wand2, Languages, Copy, Eye, History, RotateCcw, Undo2, AlertCircle, ChevronDown, ChevronUp, Newspaper } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContentPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: ContentPost | null;
  categories: string[];
  onSave: (data: ContentPostInput & { id?: string }) => void;
  isLoading?: boolean;
}

export function ContentPostModal({
  open,
  onOpenChange,
  post,
  categories,
  onSave,
  isLoading
}: ContentPostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'text' | 'image' | 'video'>('text');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [publishMode, setPublishMode] = useState<'now' | 'schedule' | 'draft'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  // AI states
  const [previousContent, setPreviousContent] = useState<string | null>(null);
  const [showVariationsModal, setShowVariationsModal] = useState(false);
  const [variations, setVariations] = useState<string[]>([]);
  
  const { uploadImage, isUploading, progress } = useImageUpload();
  const { 
    generateContent, 
    generateArticle,
    improveText, 
    summarizeText, 
    translateText, 
    generateVariations, 
    isActionLoading,
    isGenerating 
  } = useAIGenerate();
  const { versions, isLoading: isLoadingVersions, restoreVersion, isRestoring } = useContentVersions(post?.id || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const [showVersions, setShowVersions] = useState(false);

  const handleRestoreVersion = (version: any) => {
    setTitle(version.title);
    setContent(version.content);
    setCategory(version.category || '');
    setType(version.type as 'text' | 'image' | 'video');
    setMediaUrl(version.media_url || '');
    setImages(version.images || []);
    setShowVersions(false);
    toast.success('Versão restaurada! Salve para confirmar.');
  };

  const handleUndo = () => {
    if (previousContent) {
      setContent(previousContent);
      setPreviousContent(null);
      toast.success('Conteúdo anterior restaurado');
    }
  };

  // AI Error state
  const [aiError, setAiError] = useState<{ message: string; details?: string } | null>(null);

  const handleAIError = (action: string, err: unknown) => {
    console.error(`[AI] ${action} error:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao processar IA';
    const errorDetails = err instanceof Error ? err.stack : JSON.stringify(err);
    
    setAiError({ 
      message: `Falha ao ${action}: ${errorMessage}`, 
      details: errorDetails 
    });
    
    toast.error(`Erro na IA: ${errorMessage}`);
  };

  const handleGenerateContent = async () => {
    if (!title.trim()) {
      toast.error('Digite um título para gerar o conteúdo');
      return;
    }
    
    setAiError(null);
    
    try {
      const result = await generateContent(title, type, category);
      if (result) {
        setContent(result);
        toast.success('Conteúdo gerado com sucesso!');
      }
    } catch (err) {
      handleAIError('gerar conteúdo', err);
    }
  };

  const handleGenerateArticle = async () => {
    if (!title.trim()) {
      toast.error('Digite um título para gerar o artigo');
      return;
    }
    
    setAiError(null);
    
    try {
      const result = await generateArticle(title, category);
      if (result) {
        setContent(result);
        toast.success('Artigo gerado com sucesso!');
      }
    } catch (err) {
      handleAIError('gerar artigo', err);
    }
  };

  const handleImproveContent = async () => {
    if (!content.trim()) {
      toast.error('Digite algum conteúdo para melhorar');
      return;
    }
    
    setAiError(null);
    
    try {
      const result = await improveText(content, setPreviousContent);
      if (result) {
        setContent(result);
        toast.success('Conteúdo melhorado! Clique em Desfazer para restaurar.');
      }
    } catch (err) {
      handleAIError('melhorar texto', err);
    }
  };

  const handleSummarize = async () => {
    if (!content.trim()) {
      toast.error('Digite algum conteúdo para resumir');
      return;
    }
    
    setAiError(null);
    
    try {
      const result = await summarizeText(content, setPreviousContent);
      if (result) {
        setContent(result);
        toast.success('Conteúdo resumido! Clique em Desfazer para restaurar.');
      }
    } catch (err) {
      handleAIError('resumir texto', err);
    }
  };

  const handleTranslate = async (targetLanguage: string) => {
    if (!content.trim()) {
      toast.error('Digite algum conteúdo para traduzir');
      return;
    }
    
    setAiError(null);
    
    try {
      const result = await translateText(content, targetLanguage, setPreviousContent);
      if (result) {
        setContent(result);
        toast.success('Conteúdo traduzido! Clique em Desfazer para restaurar.');
      }
    } catch (err) {
      handleAIError('traduzir texto', err);
    }
  };

  const handleVariations = async () => {
    if (!content.trim()) {
      toast.error('Digite algum conteúdo para gerar variações');
      return;
    }
    
    setAiError(null);
    
    try {
      const result = await generateVariations(content);
      if (result && result.length > 0) {
        setVariations(result);
        setShowVariationsModal(true);
      }
    } catch (err) {
      handleAIError('gerar variações', err);
    }
  };

  const handleSelectVariation = (variation: string) => {
    setPreviousContent(content);
    setContent(variation);
    toast.success('Variação aplicada! Clique em Desfazer para restaurar.');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadImage(file, {
      folder: 'content',
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.85,
    });

    if (result?.url) {
      setMediaUrl(result.url);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMultipleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const uploadPromises = Array.from(files).map(file =>
      uploadImage(file, {
        folder: 'content',
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
      })
    );

    const results = await Promise.all(uploadPromises);
    const newUrls = results.filter(r => r?.url).map(r => r!.url);
    
    if (newUrls.length > 0) {
      setImages(prev => [...prev, ...newUrls]);
      toast.success(`${newUrls.length} imagem(ns) enviada(s)!`);
    }

    if (multiFileInputRef.current) {
      multiFileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content);
      setType(post.type);
      setCategory(post.category || '');
      setMediaUrl(post.media_url || '');
      setImages(post.images || []);
      setIsActive(post.is_active);
      setIsFeatured(post.is_featured || false);
      
      // Set publish mode based on post state
      if (post.scheduled_at && !post.is_active) {
        setPublishMode('schedule');
        const scheduledDate = new Date(post.scheduled_at);
        setScheduledDate(format(scheduledDate, 'yyyy-MM-dd'));
        setScheduledTime(format(scheduledDate, 'HH:mm'));
      } else if (!post.is_active) {
        setPublishMode('draft');
      } else {
        setPublishMode('now');
      }
    } else {
      setTitle('');
      setContent('');
      setType('text');
      setCategory('');
      setMediaUrl('');
      setImages([]);
      setIsActive(true);
      setIsFeatured(false);
      setPublishMode('now');
      setScheduledDate('');
      setScheduledTime('');
    }
    setNewCategory('');
    setShowNewCategory(false);
    setAiError(null);
    setPreviousContent(null);
  }, [post, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Digite um título');
      return;
    }
    
    if (!content.trim()) {
      toast.error('Digite o conteúdo');
      return;
    }
    
    const finalCategory = showNewCategory ? newCategory.trim() : (category === 'none' ? '' : category);
    
    // Build scheduled_at if scheduling
    let scheduled_at: string | null = null;
    let is_active = true;
    
    if (publishMode === 'schedule') {
      if (!scheduledDate || !scheduledTime) {
        toast.error('Defina data e hora para agendar');
        return;
      }
      
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduledDateTime <= new Date()) {
        toast.error('A data deve ser no futuro');
        return;
      }
      
      scheduled_at = scheduledDateTime.toISOString();
      is_active = false;
    } else if (publishMode === 'draft') {
      is_active = false;
    }
    
    const postData = {
      ...(post ? { id: post.id } : {}),
      title: title.trim(),
      content: content.trim(),
      type,
      category: finalCategory || undefined,
      media_url: mediaUrl.trim() || undefined,
      images: images.length > 0 ? images : undefined,
      is_active,
      is_featured: isFeatured,
      scheduled_at
    };
    
    console.log('Submitting post data:', postData);
    
    onSave(postData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {post ? 'Editar Conteúdo' : 'Novo Conteúdo'}
          </DialogTitle>
          <DialogDescription>
            Publique conteúdo para seus clientes visualizarem no portal
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do conteúdo"
              required
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Conteúdo em Destaque
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Aparecerá na seção de destaques do portal
              </p>
            </div>
            <Switch
              checked={isFeatured}
              onCheckedChange={setIsFeatured}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Conteúdo</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === 'text' ? 'default' : 'outline'}
                onClick={() => setType('text')}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                Texto
              </Button>
              <Button
                type="button"
                variant={type === 'image' ? 'default' : 'outline'}
                onClick={() => setType('image')}
                className="flex-1"
              >
                <Image className="h-4 w-4 mr-2" />
                Imagem
              </Button>
              <Button
                type="button"
                variant={type === 'video' ? 'default' : 'outline'}
                onClick={() => setType('video')}
                className="flex-1"
              >
                <Video className="h-4 w-4 mr-2" />
                Vídeo
              </Button>
            </div>
          </div>

          {(type === 'image' || type === 'video') && (
            <div className="space-y-2">
              <Label htmlFor="mediaUrl">
                {type === 'image' ? 'Imagem' : 'URL do Vídeo'}
              </Label>
              
              {type === 'image' ? (
                <div className="space-y-3">
                  {/* Upload button */}
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex-1"
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {isUploading ? 'Enviando...' : 'Enviar Imagem'}
                    </Button>
                  </div>

                  {isUploading && (
                    <Progress value={progress} className="h-2" />
                  )}

                  {/* URL manual */}
                  <div className="relative">
                    <Input
                      id="mediaUrl"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="Ou cole uma URL de imagem..."
                      disabled={isUploading}
                    />
                    {mediaUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setMediaUrl('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Preview */}
                  {mediaUrl && (
                    <div className="relative rounded-lg overflow-hidden border bg-muted">
                      <img
                        src={mediaUrl}
                        alt="Preview"
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Input
                    id="mediaUrl"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://youtube.com/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Cole a URL do YouTube ou Vimeo
                  </p>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label htmlFor="content">Conteúdo *</Label>
              <div className="flex gap-1 flex-wrap items-center">
                {previousContent && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleUndo}
                    className="text-xs text-orange-600 hover:text-orange-700"
                  >
                    <Undo2 className="h-3 w-3 mr-1" />
                    Desfazer
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={(isActionLoading('content') || isActionLoading('article')) || !title.trim()}
                      className="text-xs"
                    >
                      {(isActionLoading('content') || isActionLoading('article')) ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3 mr-1" />
                      )}
                      Gerar
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleGenerateContent} disabled={isActionLoading('content')}>
                      <FileText className="h-4 w-4 mr-2" />
                      Texto curto
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleGenerateArticle} disabled={isActionLoading('article')}>
                      <Newspaper className="h-4 w-4 mr-2" />
                      Artigo completo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleImproveContent}
                  disabled={isActionLoading('improve') || !content.trim()}
                  className="text-xs"
                >
                  {isActionLoading('improve') ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3 mr-1" />
                  )}
                  Melhorar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSummarize}
                  disabled={isActionLoading('summarize') || !content.trim()}
                  className="text-xs"
                >
                  {isActionLoading('summarize') ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <FileText className="h-3 w-3 mr-1" />
                  )}
                  Resumir
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleVariations}
                  disabled={isActionLoading('variations') || !content.trim()}
                  className="text-xs"
                >
                  {isActionLoading('variations') ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  Variações
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isActionLoading('translate') || !content.trim()}
                      className="text-xs"
                    >
                      {isActionLoading('translate') ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Languages className="h-3 w-3 mr-1" />
                      )}
                      Traduzir
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Traduzir para</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleTranslate('en')}>
                      🇺🇸 Inglês
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleTranslate('es')}>
                      🇪🇸 Espanhol
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleTranslate('pt')}>
                      🇧🇷 Português
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleTranslate('fr')}>
                      🇫🇷 Francês
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* AI Error Alert */}
            {aiError && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro na IA</AlertTitle>
                <AlertDescription className="flex flex-col gap-2">
                  <span>{aiError.message}</span>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="w-fit text-xs"
                    onClick={() => setAiError(null)}
                  >
                    Fechar
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Escreva o conteúdo aqui..."
            />
          </div>

          {/* AI Variations Modal */}
          <AIVariationsModal
            open={showVariationsModal}
            onOpenChange={setShowVariationsModal}
            variations={variations}
            onSelect={handleSelectVariation}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Categoria</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowNewCategory(!showNewCategory)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Nova
              </Button>
            </div>
            
            {showNewCategory ? (
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nome da nova categoria"
              />
            ) : (
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.filter(cat => cat && cat.trim()).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Multiple Images Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Galeria de Imagens</Label>
              <span className="text-xs text-muted-foreground">{images.length} imagem(ns)</span>
            </div>
            
            <div className="flex gap-2">
              <input
                ref={multiFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleMultipleImageUpload}
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => multiFileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Images className="h-4 w-4 mr-2" />
                )}
                {isUploading ? 'Enviando...' : 'Adicionar Imagens'}
              </Button>
            </div>
            
            {isUploading && <Progress value={progress} className="h-2" />}
            
            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {images.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="w-full h-20 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Publish Options */}
          <div className="space-y-3 rounded-lg border p-4">
            <Label>Opções de Publicação</Label>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant={publishMode === 'now' ? 'default' : 'outline'}
                onClick={() => setPublishMode('now')}
                size="sm"
                className="flex-1"
              >
                Publicar Agora
              </Button>
              <Button
                type="button"
                variant={publishMode === 'schedule' ? 'default' : 'outline'}
                onClick={() => setPublishMode('schedule')}
                size="sm"
                className="flex-1"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Agendar
              </Button>
              <Button
                type="button"
                variant={publishMode === 'draft' ? 'default' : 'outline'}
                onClick={() => setPublishMode('draft')}
                size="sm"
                className="flex-1"
              >
                Rascunho
              </Button>
            </div>
            
            {publishMode === 'schedule' && (
              <div className="flex gap-2 mt-2">
                <div className="flex-1">
                  <Label htmlFor="scheduledDate" className="text-xs">Data</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="scheduledTime" className="text-xs">Hora</Label>
                  <Input
                    id="scheduledTime"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            {publishMode === 'schedule' && scheduledDate && scheduledTime && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Será publicado em {format(new Date(`${scheduledDate}T${scheduledTime}`), "dd/MM/yyyy 'às' HH:mm")}
              </p>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 flex-wrap">
              {/* History Button */}
              {post && (
                <Sheet open={showVersions} onOpenChange={setShowVersions}>
                  <SheetTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={versions.length === 0}
                    >
                      <History className="h-4 w-4 mr-2" />
                      Histórico ({versions.length})
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full sm:max-w-md">
                    <SheetHeader>
                      <SheetTitle>Histórico de Versões</SheetTitle>
                      <SheetDescription>
                        Restaure versões anteriores do conteúdo
                      </SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-150px)] mt-4 pr-4">
                      {versions.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhuma versão anterior encontrada
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {versions.map((version) => (
                            <div 
                              key={version.id}
                              className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{version.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Versão {version.version_number} • {format(new Date(version.created_at), "dd/MM/yyyy 'às' HH:mm")}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {version.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRestoreVersion(version)}
                                  disabled={isRestoring}
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Restaurar
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              )}

              {/* Preview Button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!title.trim() || !content.trim()}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Preview do Conteúdo</SheetTitle>
                    <SheetDescription>
                      Visualize como o conteúdo aparecerá no portal do cliente
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    {/* Preview Card */}
                    <div className="rounded-lg border bg-card p-4 space-y-4">
                      {mediaUrl && type === 'image' && (
                        <img 
                          src={mediaUrl} 
                          alt={title}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      )}
                      {mediaUrl && type === 'video' && (
                        <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                          <Video className="h-12 w-12 text-muted-foreground" />
                          <span className="ml-2 text-muted-foreground">Vídeo</span>
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold">{title || 'Título do conteúdo'}</h3>
                        {category && (
                          <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {category}
                          </span>
                        )}
                      </div>
                      <div 
                        className="prose prose-sm max-w-none text-foreground"
                        dangerouslySetInnerHTML={{ __html: content || '<p class="text-muted-foreground">Conteúdo aparecerá aqui...</p>' }}
                      />
                      {images.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {images.slice(0, 4).map((img, idx) => (
                            <img 
                              key={idx}
                              src={img} 
                              alt={`Imagem ${idx + 1}`}
                              className="w-full h-24 object-cover rounded"
                            />
                          ))}
                          {images.length > 4 && (
                            <div className="w-full h-24 bg-muted rounded flex items-center justify-center text-muted-foreground">
                              +{images.length - 4} mais
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 
                  publishMode === 'schedule' ? 'Agendar' :
                  publishMode === 'draft' ? 'Salvar Rascunho' :
                  post ? 'Salvar' : 'Publicar'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
