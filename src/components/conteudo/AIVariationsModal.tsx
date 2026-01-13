import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll_area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface AIVariationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variations: string[];
  onSelect: (variation: string) => void;
}

export function AIVariationsModal({
  open,
  onOpenChange,
  variations,
  onSelect
}: AIVariationsModalProps) {
  const handleSelect = (variation: string) => {
    onSelect(variation);
    onOpenChange(false);
  };

  // Try to parse variation titles
  const parseVariation = (text: string, index: number) => {
    // Try to extract title from patterns like "1. Formal:" or "**Versão Formal:**"
    const titleMatch = text.match(/^(?:\d+\.\s*)?(?:\*\*)?([^:*\n]+)(?:\*\*)?:/);
    if (titleMatch) {
      const title = titleMatch[1].trim();
      const content = text.slice(titleMatch[0].length).trim();
      return { title, content };
    }
    
    // Default titles
    const defaultTitles = ['Versão Formal', 'Versão Casual', 'Versão Concisa'];
    return {
      title: defaultTitles[index] || `Variação ${index + 1}`,
      content: text
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Variações Geradas</DialogTitle>
          <DialogDescription>
            Selecione uma das variações para usar no conteúdo
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            {variations.map((variation, index) => {
              const { title, content } = parseVariation(variation, index);
              return (
                <Card 
                  key={index} 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleSelect(content || variation)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {index + 1}
                      </span>
                      {title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                      {content || variation}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(content || variation);
                      }}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Usar esta variação
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
