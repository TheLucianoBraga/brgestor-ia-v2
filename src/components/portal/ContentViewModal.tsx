import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentPost } from '@/hooks/useContentPosts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Share2, FileText, Image, Video, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface ContentViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: ContentPost | null;
}

export function ContentViewModal({ open, onOpenChange, post }: ContentViewModalProps) {
  const handleShare = () => {
    if (!post) return;
    // Strip HTML tags for sharing
    const plainText = post.content.replace(/<[^>]*>/g, '').slice(0, 200);
    const text = `${post.title}\n\n${plainText}...`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Abrindo WhatsApp...');
  };

  const getYoutubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    return url;
  };

  // Check if content is HTML or plain text
  const isHtmlContent = (text: string) => {
    return /<[a-z][\s\S]*>/i.test(text);
  };

  const renderContent = (text: string) => {
    // If already HTML (from rich text editor), return as-is with proper styling
    if (isHtmlContent(text)) {
      // Ensure paragraphs have proper spacing
      return text
        .replace(/<p>/g, '<p class="mb-4 leading-relaxed">')
        .replace(/<h1>/g, '<h1 class="text-2xl font-bold mt-6 mb-4">')
        .replace(/<h2>/g, '<h2 class="text-xl font-bold mt-6 mb-3">')
        .replace(/<h3>/g, '<h3 class="text-lg font-semibold mt-4 mb-2">')
        .replace(/<ul>/g, '<ul class="list-disc ml-6 mb-4 space-y-2">')
        .replace(/<ol>/g, '<ol class="list-decimal ml-6 mb-4 space-y-2">');
    }
    
    // Split by double newlines to create paragraphs
    const paragraphs = text.split(/\n\n+/);
    const htmlParts: string[] = [];
    
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;
      
      const lines = paragraph.split('\n');
      let paragraphHtml = '';
      let inList = false;
      let listType: 'ul' | 'ol' | null = null;
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (!line.trim()) continue;
        
        // Headers
        if (line.startsWith('### ')) {
          if (inList) { paragraphHtml += listType === 'ol' ? '</ol>' : '</ul>'; inList = false; listType = null; }
          const content = line.slice(4).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          paragraphHtml += `<h3 class="text-lg font-semibold mt-6 mb-3">${content}</h3>`;
          continue;
        }
        if (line.startsWith('## ')) {
          if (inList) { paragraphHtml += listType === 'ol' ? '</ol>' : '</ul>'; inList = false; listType = null; }
          const content = line.slice(3).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          paragraphHtml += `<h2 class="text-xl font-bold mt-8 mb-4">${content}</h2>`;
          continue;
        }
        if (line.startsWith('# ')) {
          if (inList) { paragraphHtml += listType === 'ol' ? '</ol>' : '</ul>'; inList = false; listType = null; }
          const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          paragraphHtml += `<h1 class="text-2xl font-bold mt-8 mb-4">${content}</h1>`;
          continue;
        }
        
        // Apply inline formatting
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Numbered lists
        const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (numberedMatch) {
          if (!inList || listType !== 'ol') {
            if (inList) paragraphHtml += listType === 'ol' ? '</ol>' : '</ul>';
            paragraphHtml += '<ol class="list-decimal ml-6 my-4 space-y-2">';
            inList = true;
            listType = 'ol';
          }
          paragraphHtml += `<li class="leading-relaxed">${numberedMatch[2]}</li>`;
          continue;
        }
        
        // Bullet points
        if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
          if (!inList || listType !== 'ul') {
            if (inList) paragraphHtml += listType === 'ol' ? '</ol>' : '</ul>';
            paragraphHtml += '<ul class="list-disc ml-6 my-4 space-y-2">';
            inList = true;
            listType = 'ul';
          }
          const content = line.slice(2);
          paragraphHtml += `<li class="leading-relaxed">${content}</li>`;
          continue;
        }
        
        // Close list if we hit non-list content
        if (inList) {
          paragraphHtml += listType === 'ol' ? '</ol>' : '</ul>';
          inList = false;
          listType = null;
        }
        
        // Regular text line - add line break if not first line
        if (paragraphHtml && !paragraphHtml.endsWith('>')) {
          paragraphHtml += '<br />';
        }
        paragraphHtml += line;
      }
      
      // Close any open list
      if (inList) {
        paragraphHtml += listType === 'ol' ? '</ol>' : '</ul>';
      }
      
      // Wrap in paragraph if it's regular text (not headers or lists)
      if (paragraphHtml && !paragraphHtml.startsWith('<h') && !paragraphHtml.startsWith('<ul') && !paragraphHtml.startsWith('<ol')) {
        htmlParts.push(`<p class="mb-5 leading-relaxed text-base">${paragraphHtml}</p>`);
      } else {
        htmlParts.push(paragraphHtml);
      }
    }
    
    return htmlParts.join('');
  };

  if (!post) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <div className="p-4 text-center text-muted-foreground">
            Carregando...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const TypeIcon = post.type === 'image' ? Image : post.type === 'video' ? Video : FileText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{post.title}</DialogTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(post.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                {post.category && (
                  <Badge variant="secondary" className="ml-2">
                    {post.category}
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Media */}
          {post.type === 'image' && post.media_url && (
            <div className="rounded-lg overflow-hidden">
              <img 
                src={post.media_url} 
                alt={post.title}
                className="w-full h-auto max-h-96 object-cover"
              />
            </div>
          )}

          {post.type === 'video' && post.media_url && (
            <div className="rounded-lg overflow-hidden aspect-video">
              <iframe
                src={getYoutubeEmbedUrl(post.media_url)}
                title={post.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Image Gallery */}
          {post.images && post.images.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {post.images.map((url, index) => (
                  <div key={index} className="rounded-lg overflow-hidden">
                    <img 
                      src={url} 
                      alt={`${post.title} - ${index + 1}`}
                      className="w-full h-40 object-cover hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => window.open(url, '_blank')}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div 
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
