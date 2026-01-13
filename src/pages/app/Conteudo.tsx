import React, { useState } from 'react';
import { useContentPosts, ContentPost, ContentPostInput } from '@/hooks/useContentPosts';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown_menu';
import { ContentPostModal } from '@/components/conteudo/ContentPostModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  Image,
  Video,
  Eye,
  EyeOff,
  Newspaper
} from 'lucide-react';

export default function Conteudo() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);

  const { 
    posts, 
    categories, 
    isLoading, 
    createPost, 
    updatePost, 
    deletePost,
    toggleActive,
    isCreating,
    isUpdating
  } = useContentPosts(selectedCategory);

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = (data: ContentPostInput & { id?: string }) => {
    if (data.id) {
      updatePost(data as ContentPostInput & { id: string });
    } else {
      createPost(data);
    }
    setEditingPost(null);
  };

  const handleEdit = (post: ContentPost) => {
    setEditingPost(post);
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (deletePostId) {
      deletePost(deletePostId);
      setDeletePostId(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'image': return 'Imagem';
      case 'video': return 'Vídeo';
      default: return 'Texto';
    }
  };

  // Stats
  const totalPosts = posts.length;
  const activePosts = posts.filter(p => p.is_active).length;
  const draftPosts = posts.filter(p => !p.is_active).length;

  if (isLoading) {
    return (
      <div className="page-container space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Conteúdo"
        description="Publique novidades, dicas e informações para seus clientes"
        actions={
          <Button onClick={() => { setEditingPost(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Conteúdo
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPosts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-green-500" />
              Publicados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activePosts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-muted-foreground" />
              Rascunhos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{draftPosts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            Todos
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {filteredPosts.length === 0 ? (
            <div className="py-12 text-center">
              <Newspaper className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                Nenhum conteúdo encontrado
              </p>
              <Button 
                className="mt-4"
                onClick={() => { setEditingPost(null); setModalOpen(true); }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro post
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div className="font-medium line-clamp-1">{post.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {post.content.slice(0, 60)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(post.type)}
                        <span className="text-sm">{getTypeLabel(post.type)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {post.category ? (
                        <Badge variant="secondary">{post.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(post.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={post.is_active}
                          onCheckedChange={(checked) => 
                            toggleActive({ id: post.id, is_active: checked })
                          }
                        />
                        <span className="text-sm">
                          {post.is_active ? 'Ativo' : 'Rascunho'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(post)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeletePostId(post.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ContentPostModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        post={editingPost}
        categories={categories}
        onSave={handleSave}
        isLoading={isCreating || isUpdating}
      />

      <ConfirmDialog
        open={!!deletePostId}
        onOpenChange={() => setDeletePostId(null)}
        title="Excluir conteúdo"
        description="Tem certeza que deseja excluir este conteúdo? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
