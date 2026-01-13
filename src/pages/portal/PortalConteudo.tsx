import React, { useState } from 'react';
import { usePortalContent, ContentPost } from '@/hooks/useContentPosts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ContentViewModal } from '@/components/portal/ContentViewModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Search,
  Calendar,
  ArrowRight,
  Newspaper,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PortalConteudo() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const { posts, categories, isLoading } = usePortalContent(selectedCategory);

  const filteredPosts = posts
    .filter(post => 
      (post.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.content || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Prioritize featured posts
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      // Then by date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const handleViewPost = (post: ContentPost) => {
    setSelectedPost(post);
    setViewModalOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return ImageIcon;
      case 'video': return Video;
      default: return FileText;
    }
  };

  const getPreview = (content: string, maxLength = 180) => {
    if (!content) return '';
    // Remove HTML tags and markdown symbols
    const text = content
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/[#*`]/g, '')    // Remove Markdown symbols
      .replace(/- /g, '')       // Remove list dashes
      .replace(/\s+/g, ' ')     // Normalize spaces
      .trim();
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-80 rounded-[2rem] overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <div className="p-6 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">Conteúdo & <span className="text-primary">Novidades</span></h1>
          <p className="text-muted-foreground mt-2 text-lg">Fique por dentro de tudo o que acontece no seu ecossistema.</p>
        </div>
        <div className="flex items-center gap-3 bg-secondary/20 p-3 rounded-2xl border border-secondary/30">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Newspaper className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Postagens</span>
            <span className="text-base font-black text-primary">{posts.length}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="O que você deseja ler hoje?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 rounded-xl border-none bg-secondary/30 focus:bg-background shadow-sm transition-all text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'secondary'}
            onClick={() => setSelectedCategory('all')}
            className={cn(
              "h-12 px-6 rounded-xl font-bold transition-all text-sm",
              selectedCategory === 'all' ? "shadow-md shadow-primary/10" : "bg-secondary/30 hover:bg-secondary/50"
            )}
          >
            Todos
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'secondary'}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "h-12 px-6 rounded-xl font-bold transition-all text-sm whitespace-nowrap",
                selectedCategory === cat ? "shadow-md shadow-primary/10" : "bg-secondary/30 hover:bg-secondary/50"
              )}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <Card className="border-none shadow-2xl shadow-black/5 rounded-[3rem] overflow-hidden bg-secondary/10">
          <CardContent className="py-32 text-center">
            <div className="h-24 w-24 rounded-full bg-secondary/40 flex items-center justify-center mx-auto mb-8">
              <Newspaper className="h-12 w-12 text-muted-foreground/40" />
            </div>
            <h3 className="text-2xl font-black mb-3">Nada por aqui ainda</h3>
            <p className="text-muted-foreground max-w-md mx-auto text-lg">
              Não encontramos nenhuma postagem para os filtros selecionados. Tente buscar por outro termo ou categoria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => {
            const TypeIcon = getTypeIcon(post.type);
            
            return (
              <Card 
                key={post.id} 
                className="border-none shadow-xl shadow-black/5 rounded-[3rem] overflow-hidden group cursor-pointer hover:shadow-2xl transition-all duration-500 flex flex-col bg-card hover:-translate-y-2"
                onClick={() => handleViewPost(post)}
              >
                {post.type === 'image' && post.media_url && (
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src={post.media_url} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    />
                    <div className="absolute top-6 left-6 flex flex-col gap-2">
                      <Badge className="bg-white/90 backdrop-blur-md text-primary border-none font-black text-[10px] uppercase tracking-[0.2em] px-4 py-2 shadow-lg">
                        {post.category || 'Geral'}
                      </Badge>
                      {post.is_featured && (
                        <Badge className="bg-primary text-white border-none font-black text-[10px] uppercase tracking-[0.2em] px-4 py-2 shadow-lg flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Destaque
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <CardHeader className={cn("p-8 pb-4", !post.media_url && "pt-10")}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(post.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </div>
                    <div className="flex items-center gap-2">
                      {!post.media_url && (
                        <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-[0.2em] px-3 py-1">
                          {post.category || 'Geral'}
                        </Badge>
                      )}
                      {post.is_featured && (
                        <Badge className="bg-primary text-white border-none font-black text-[10px] uppercase tracking-[0.2em] px-3 py-1 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Destaque
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-black leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="px-8 pb-10 flex-1 flex flex-col">
                  <p className={cn(
                    "text-muted-foreground leading-relaxed mb-8 flex-1 text-base",
                    post.media_url ? "line-clamp-3" : "line-clamp-6"
                  )}>
                    {getPreview(post.content, post.media_url ? 180 : 350)}
                  </p>
                  <div className="flex items-center justify-between pt-6 border-t border-secondary/50">
                    <span className="text-sm font-black text-primary flex items-center gap-2 group-hover:gap-3 transition-all">
                      Ler postagem completa
                      <ArrowRight className="h-5 w-5" />
                    </span>
                    <div className="h-10 w-10 rounded-full bg-secondary/40 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                      <TypeIcon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ContentViewModal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        post={selectedPost}
      />
    </div>
  );
}
