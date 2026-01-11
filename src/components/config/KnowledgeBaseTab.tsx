import { useState, useRef } from 'react';
import { Plus, Trash2, BookOpen, HelpCircle, FileText, Edit2, Loader2, User, Upload, File, Globe, Wand2, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useKnowledgeBase, type KnowledgeBaseItem } from '@/hooks/useKnowledgeBase';
import { useAIGenerate } from '@/hooks/useAIGenerate';
import { useToast } from '@/hooks/use-toast';

export function KnowledgeBaseTab() {
  const { items: knowledgeItems, isLoading: kbLoading, createItem, updateItem, deleteItem } = useKnowledgeBase();
  const { improveText, isGenerating: isImproving, isActionLoading } = useAIGenerate();
  const { toast } = useToast();

  const [showKbModal, setShowKbModal] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBaseItem | null>(null);
  const [kbForm, setKbForm] = useState({
    type: 'faq' as 'faq' | 'document' | 'snippet' | 'procedure' | 'pricing' | 'policy' | 'persona' | 'contact' | 'link' | 'glossary' | 'error_response',
    category: '',
    question: '',
    answer: '',
    content: '',
    priority: 0,
    file_name: '' as string | null,
  });
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.md', '.txt', '.json'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      toast({
        title: 'Formato não suportado',
        description: 'Apenas arquivos .md, .txt e .json são permitidos.',
        variant: 'destructive'
      });
      return;
    }

    setIsUploadingFile(true);
    try {
      const text = await file.text();
      setKbForm(prev => ({
        ...prev,
        type: 'document',
        content: text,
        file_name: file.name
      }));
      toast({
        title: 'Arquivo carregado!',
        description: `${file.name} foi lido com sucesso.`
      });
    } catch (error) {
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Não foi possível processar o arquivo.',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveKbItem = async () => {
    if (editingKb) {
      await updateItem.mutateAsync({
        id: editingKb.id,
        ...kbForm
      });
    } else {
      await createItem.mutateAsync(kbForm);
    }
    setShowKbModal(false);
    setEditingKb(null);
    setKbForm({ type: 'faq', category: '', question: '', answer: '', content: '', priority: 0, file_name: null });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'faq': 'FAQ',
      'document': 'Documento',
      'snippet': 'Informação',
      'procedure': 'Procedimento',
      'pricing': 'Preços',
      'policy': 'Política/Regra',
      'persona': 'Tom de Voz',
      'contact': 'Contatos',
      'link': 'Link Útil',
      'glossary': 'Glossário',
      'error_response': 'Erro/Fallback'
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      'faq': <HelpCircle className="h-4 w-4 text-blue-500" />,
      'document': <File className="h-4 w-4 text-green-500" />,
      'snippet': <FileText className="h-4 w-4 text-purple-500" />,
      'procedure': <FileText className="h-4 w-4 text-orange-500" />,
      'pricing': <FileText className="h-4 w-4 text-emerald-500" />,
      'policy': <FileText className="h-4 w-4 text-red-500" />,
      'persona': <User className="h-4 w-4 text-pink-500" />,
      'contact': <MessageSquare className="h-4 w-4 text-cyan-500" />,
      'link': <Globe className="h-4 w-4 text-indigo-500" />,
      'glossary': <BookOpen className="h-4 w-4 text-amber-500" />,
      'error_response': <HelpCircle className="h-4 w-4 text-gray-500" />
    };
    return icons[type] || <FileText className="h-4 w-4" />;
  };

  const openEditKb = (item: KnowledgeBaseItem) => {
    setEditingKb(item);
    setKbForm({
      type: item.type as typeof kbForm.type,
      category: item.category || '',
      question: item.question || '',
      answer: item.answer || '',
      content: item.content || '',
      priority: item.priority,
      file_name: item.file_name || null
    });
    setShowKbModal(true);
  };

  const handleImproveQuestion = async () => {
    if (!kbForm.question.trim()) {
      toast({ title: 'Digite uma pergunta primeiro', variant: 'destructive' });
      return;
    }
    const improved = await improveText(kbForm.question);
    if (improved) {
      setKbForm(prev => ({ ...prev, question: improved }));
      toast({ title: 'Pergunta melhorada com IA!' });
    }
  };

  const handleImproveAnswer = async () => {
    if (!kbForm.answer.trim()) {
      toast({ title: 'Digite uma resposta primeiro', variant: 'destructive' });
      return;
    }
    const improved = await improveText(kbForm.answer);
    if (improved) {
      setKbForm(prev => ({ ...prev, answer: improved }));
      toast({ title: 'Resposta melhorada com IA!' });
    }
  };

  const handleImproveContent = async () => {
    if (!kbForm.content.trim()) {
      toast({ title: 'Digite o conteúdo primeiro', variant: 'destructive' });
      return;
    }
    const improved = await improveText(kbForm.content);
    if (improved) {
      setKbForm(prev => ({ ...prev, content: improved }));
      toast({ title: 'Conteúdo melhorado com IA!' });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Base de Conhecimento</CardTitle>
              <CardDescription>Perguntas frequentes e informações para a IA usar nas respostas</CardDescription>
            </div>
            <Button onClick={() => { setEditingKb(null); setKbForm({ type: 'faq', category: '', question: '', answer: '', content: '', priority: 0, file_name: null }); setShowKbModal(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {knowledgeItems.length > 0 ? (
            <div className="space-y-6">
              {/* Group items by type */}
              {Object.entries(
                knowledgeItems.reduce((acc, item) => {
                  const type = item.type;
                  if (!acc[type]) acc[type] = [];
                  acc[type].push(item);
                  return acc;
                }, {} as Record<string, typeof knowledgeItems>)
              ).map(([type, typeItems]) => (
                <div key={type} className="space-y-2">
                  {/* Type Header */}
                  <div className="flex items-center gap-2 pb-2 border-b">
                    {getTypeIcon(type)}
                    <h3 className="font-semibold text-sm">{getTypeLabel(type)}</h3>
                    <Badge variant="secondary" className="text-xs">{typeItems.length}</Badge>
                  </div>
                  
                  {/* Items of this type */}
                  <div className="space-y-2 pl-2">
                    {typeItems.map((item) => (
                      <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg bg-card hover:bg-accent/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {item.category && <Badge variant="secondary" className="text-xs">{item.category}</Badge>}
                            <Switch 
                              checked={item.is_active} 
                              onCheckedChange={(checked) => updateItem.mutate({ id: item.id, is_active: checked })}
                            />
                          </div>
                          {item.type === 'faq' && (
                            <>
                              <p className="font-medium text-sm">{item.question}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.answer}</p>
                            </>
                          )}
                          {item.type === 'document' && (
                            <>
                              <div className="flex items-center gap-2">
                                <File className="h-4 w-4 text-muted-foreground" />
                                <p className="font-medium text-sm">{item.file_name || 'Documento'}</p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.content}</p>
                            </>
                          )}
                          {(item.type === 'snippet' || item.type === 'procedure' || item.type === 'policy' || 
                            item.type === 'persona' || item.type === 'glossary' || item.type === 'error_response') && (
                            <p className="text-sm line-clamp-2">{item.content}</p>
                          )}
                          {item.type === 'pricing' && (
                            <p className="text-sm line-clamp-2">💰 {item.content}</p>
                          )}
                          {item.type === 'contact' && (
                            <p className="text-sm line-clamp-2">📞 {item.content}</p>
                          )}
                          {item.type === 'link' && (
                            <p className="text-sm line-clamp-2 text-primary">🔗 {item.content}</p>
                          )}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditKb(item)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate(item.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum item na base de conhecimento</p>
              <p className="text-sm">Adicione FAQs para melhorar as respostas da IA</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Knowledge Base Modal */}
      <Dialog open={showKbModal} onOpenChange={setShowKbModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingKb ? 'Editar Item' : 'Novo Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <select
                value={kbForm.type}
                onChange={(e) => setKbForm({ ...kbForm, type: e.target.value as typeof kbForm.type })}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
              >
                <option value="faq">❓ FAQ (Pergunta e Resposta)</option>
                <option value="procedure">📋 Procedimento (Passo a Passo)</option>
                <option value="pricing">💰 Tabela de Preços</option>
                <option value="policy">📜 Política/Regra</option>
                <option value="persona">🎭 Tom de Voz/Persona</option>
                <option value="contact">📞 Contatos/Canais</option>
                <option value="link">🔗 Link Útil</option>
                <option value="glossary">📖 Glossário/Termo</option>
                <option value="error_response">⚠️ Resposta de Erro/Fallback</option>
                <option value="snippet">📝 Informação Geral</option>
                <option value="document">📄 Documento (Arquivo)</option>
              </select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Input
                value={kbForm.category}
                onChange={(e) => setKbForm({ ...kbForm, category: e.target.value })}
                placeholder="Ex: Pagamentos, Suporte, Planos"
              />
            </div>
            {kbForm.type === 'faq' ? (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Pergunta</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-primary hover:text-primary"
                      onClick={handleImproveQuestion}
                      disabled={isImproving || !kbForm.question.trim()}
                    >
                      {isActionLoading('improve') && kbForm.question ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="h-3 w-3" />
                      )}
                      Melhorar com IA
                    </Button>
                  </div>
                  <Input
                    value={kbForm.question}
                    onChange={(e) => setKbForm({ ...kbForm, question: e.target.value })}
                    placeholder="Como faço para..."
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Resposta</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-primary hover:text-primary"
                      onClick={handleImproveAnswer}
                      disabled={isImproving || !kbForm.answer.trim()}
                    >
                      {isActionLoading('improve') && kbForm.answer ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="h-3 w-3" />
                      )}
                      Melhorar com IA
                    </Button>
                  </div>
                  <Textarea
                    value={kbForm.answer}
                    onChange={(e) => setKbForm({ ...kbForm, answer: e.target.value })}
                    placeholder="Para isso, você deve..."
                    rows={4}
                  />
                </div>
              </>
            ) : kbForm.type === 'document' ? (
              <>
                <div>
                  <Label>Carregar Arquivo</Label>
                  <div className="mt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".md,.txt,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="kb-file-upload"
                    />
                    <label htmlFor="kb-file-upload">
                      <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors">
                        {isUploadingFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Carregando...</span>
                          </div>
                        ) : kbForm.file_name ? (
                          <div className="flex items-center justify-center gap-2 text-primary">
                            <File className="h-5 w-5" />
                            <span className="font-medium">{kbForm.file_name}</span>
                          </div>
                        ) : (
                          <div className="text-muted-foreground">
                            <Upload className="h-8 w-8 mx-auto mb-2" />
                            <p className="text-sm">Clique para carregar</p>
                            <p className="text-xs">.md, .txt, .json</p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
                {kbForm.content && (
                  <div>
                    <Label>Conteúdo do Arquivo</Label>
                    <Textarea
                      value={kbForm.content}
                      onChange={(e) => setKbForm({ ...kbForm, content: e.target.value })}
                      placeholder="Conteúdo do documento..."
                      rows={6}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {kbForm.content.length} caracteres
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>
                    {kbForm.type === 'procedure' && 'Passo a Passo'}
                    {kbForm.type === 'pricing' && 'Tabela de Preços'}
                    {kbForm.type === 'policy' && 'Política/Regra'}
                    {kbForm.type === 'persona' && 'Descrição do Tom de Voz'}
                    {kbForm.type === 'contact' && 'Canais de Contato'}
                    {kbForm.type === 'link' && 'URL e Descrição'}
                    {kbForm.type === 'glossary' && 'Termo e Definição'}
                    {kbForm.type === 'error_response' && 'Resposta Padrão para Erros'}
                    {kbForm.type === 'snippet' && 'Conteúdo'}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs text-primary hover:text-primary"
                    onClick={handleImproveContent}
                    disabled={isImproving || !kbForm.content.trim()}
                  >
                    {isActionLoading('improve') ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Wand2 className="h-3 w-3" />
                    )}
                    Melhorar com IA
                  </Button>
                </div>
                <Textarea
                  value={kbForm.content}
                  onChange={(e) => setKbForm({ ...kbForm, content: e.target.value })}
                  placeholder={
                    kbForm.type === 'procedure' ? '1. Primeiro passo...\n2. Segundo passo...\n3. Terceiro passo...' :
                    kbForm.type === 'pricing' ? 'Plano Básico: R$ 29,90/mês\nPlano Pro: R$ 59,90/mês\nPlano Enterprise: Sob consulta' :
                    kbForm.type === 'policy' ? 'Regra de cancelamento: O cliente pode solicitar cancelamento com até 7 dias de antecedência...' :
                    kbForm.type === 'persona' ? 'Seja sempre amigável e profissional. Use emojis com moderação. Trate o cliente pelo nome...' :
                    kbForm.type === 'contact' ? 'WhatsApp: (11) 99999-9999\nE-mail: contato@empresa.com\nHorário: Seg-Sex 9h às 18h' :
                    kbForm.type === 'link' ? 'https://meusite.com/pagina - Descrição do link útil' :
                    kbForm.type === 'glossary' ? 'TERMO: Definição clara e objetiva do termo técnico usado pela empresa...' :
                    kbForm.type === 'error_response' ? 'Desculpe, não entendi sua pergunta. Pode reformular? Ou se preferir, posso transferir para um atendente.' :
                    'Informações que a IA deve saber...'
                  }
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {kbForm.type === 'procedure' && '💡 Use passos numerados para guiar o cliente'}
                  {kbForm.type === 'pricing' && '💡 Liste todos os planos e valores'}
                  {kbForm.type === 'policy' && '💡 Seja claro sobre regras e exceções'}
                  {kbForm.type === 'persona' && '💡 Defina como a IA deve se comportar e falar'}
                  {kbForm.type === 'contact' && '💡 Inclua todos os canais de atendimento'}
                  {kbForm.type === 'link' && '💡 Forneça links úteis para autoatendimento'}
                  {kbForm.type === 'glossary' && '💡 Explique termos técnicos do seu negócio'}
                  {kbForm.type === 'error_response' && '💡 Defina respostas quando a IA não souber responder'}
                  {kbForm.type === 'snippet' && '💡 Adicione qualquer informação útil'}
                </p>
              </div>
            )}
            <div>
              <Label>Prioridade (maior = mais importante)</Label>
              <Input
                type="number"
                value={kbForm.priority}
                onChange={(e) => setKbForm({ ...kbForm, priority: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKbModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveKbItem} disabled={createItem.isPending || updateItem.isPending}>
              {createItem.isPending || updateItem.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
