import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown_menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { TemplateModal } from '@/components/templates/TemplateModal';
import { 
  useTemplates, 
  MessageTemplate, 
  TemplateInsert,
  TEMPLATE_TYPES,
  TEMPLATE_CHANNELS,
  TemplateChannel
} from '@/hooks/useTemplates';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  MessageSquare,
  ToggleLeft,
  ToggleRight,
  FileText,
  Calendar,
  Clock,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Send,
  MessageCircle,
  Mail,
  Bell,
} from 'lucide-react';

export default function Templates() {
  const {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    toggleActive,
  } = useTemplates();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<MessageTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<TemplateChannel | 'all'>('all');

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    const matchesChannel = channelFilter === 'all' || t.channel === channelFilter;
    return matchesSearch && matchesType && matchesChannel;
  });

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleSave = (data: TemplateInsert) => {
    if (editingTemplate) {
      updateTemplate.mutate(
        { id: editingTemplate.id, ...data },
        { onSuccess: () => setIsModalOpen(false) }
      );
    } else {
      createTemplate.mutate(data, {
        onSuccess: () => setIsModalOpen(false),
      });
    }
  };

  const handleDelete = (template: MessageTemplate) => {
    setTemplateToDelete(template);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteTemplate.mutate(templateToDelete.id);
      setDeleteConfirmOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleDuplicate = (template: MessageTemplate) => {
    duplicateTemplate.mutate(template);
  };

  const handleToggleActive = (template: MessageTemplate) => {
    toggleActive.mutate({ id: template.id, is_active: !template.is_active });
  };


  const getTypeLabel = (type: string) => {
    return TEMPLATE_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'cobranca':
        return 'destructive';
      case 'aviso_vencimento':
        return 'secondary';
      case 'boas_vindas':
        return 'default';
      case 'confirmacao':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case 'sent':
        return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle2 className="h-3 w-3" /> Enviada</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Falhou</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" /> Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="page-container space-y-6">
        <PageHeader
          title="Templates de Mensagem"
          description="Gerencie os templates para envio automático de mensagens"
        />
        <LoadingSkeleton />
      </div>
    );
  }

  const handleEmptyAction = templates.length === 0 ? handleOpenCreate : undefined;

  return (
    <div className="page-container space-y-4 sm:space-y-6">
      <PageHeader
        title="Templates"
        description="Templates para envio automático de mensagens"
        actions={
          <Button onClick={handleOpenCreate} className="h-8 sm:h-10 text-xs sm:text-sm px-2 sm:px-4">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="ml-1 sm:ml-1.5">Novo Template</span>
          </Button>
        }
      />

      <Tabs defaultValue="templates" className="space-y-3 sm:space-y-4">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:w-auto">
          <TabsTrigger value="templates" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Templates</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="templates" className="space-y-3 sm:space-y-4">
          {/* Channel Tabs */}
          <Tabs value={channelFilter} onValueChange={(v) => setChannelFilter(v as TemplateChannel | 'all')} className="w-full">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 mb-2">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-4 bg-muted/50 p-1">
                <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Todos</span>
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                  <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>WhatsApp</span>
                </TabsTrigger>
                <TabsTrigger value="email" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                  <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>E-mail</span>
                </TabsTrigger>
                <TabsTrigger value="push" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                  <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Push</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {TEMPLATE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Templates Grid */}
          {filteredTemplates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum template encontrado"
              description={
                templates.length === 0
                  ? 'Crie seu primeiro template de mensagem para automatizar a comunicação com seus clientes.'
                  : 'Nenhum template corresponde aos filtros aplicados.'
              }
              actionLabel={handleEmptyAction ? 'Criar Template' : undefined}
              onAction={handleEmptyAction}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`relative group hover:shadow-md transition-shadow border-sidebar-border/50 ${
                    !template.is_active ? 'opacity_60' : ''
                  }`}
                >
                  <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 flex-shrink-0 text-primary" />
                          {template.name}
                        </CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(template)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(template)}>
                            {template.is_active ? (
                              <>
                                <ToggleLeft className="mr-2 h-4 w-4" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <ToggleRight className="mr-2 h-4 w-4" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(template)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant={getTypeBadgeVariant(template.type)}>
                        {getTypeLabel(template.type)}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        {template.channel === 'whatsapp' && <MessageCircle className="h-3 w-3" />}
                        {template.channel === 'email' && <Mail className="h-3 w-3" />}
                        {template.channel === 'in_app' && <Bell className="h-3 w-3" />}
                        {TEMPLATE_CHANNELS.find(c => c.value === template.channel)?.label || 'WhatsApp'}
                      </Badge>
                      {!template.is_active && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {truncateContent(template.content)}
                    </p>
                    {template.image_url && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="inline-block w-3 h-3 bg-muted rounded" />
                        Contém imagem
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Modal */}
      <TemplateModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        template={editingTemplate}
        onSave={handleSave}
        isLoading={createTemplate.isPending || updateTemplate.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Excluir Template"
        description={`Tem certeza que deseja excluir o template "${templateToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}
