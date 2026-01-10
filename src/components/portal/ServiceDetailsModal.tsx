import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Check, Star, ShoppingCart, Gift, RefreshCw, Clock, DollarSign, ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface ServiceDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: any;
  isSubscribed: boolean;
  onSubscribe: () => void;
}

// Lightbox Component
function ImageLightbox({ 
  images, 
  initialIndex, 
  onClose 
}: { 
  images: string[]; 
  initialIndex: number; 
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Image counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Previous button */}
      {images.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 text-white hover:bg-white/20 h-12 w-12"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}

      {/* Main image */}
      <img
        src={images[currentIndex]}
        alt={`Imagem ${currentIndex + 1}`}
        className="max-h-[85vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next button */}
      {images.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 text-white hover:bg-white/20 h-12 w-12"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto p-2">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={cn(
                "w-16 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0",
                currentIndex === idx 
                  ? "border-white scale-110" 
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <img
                src={img}
                alt={`Miniatura ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ServiceDetailsModal({ 
  open, 
  onOpenChange, 
  service, 
  isSubscribed,
  onSubscribe 
}: ServiceDetailsModalProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!service) return null;

  const images = service.images || [];
  const benefits = service.benefits || [];

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          <ScrollArea className="max-h-[90vh]">
            {/* Hero Image - Clickable */}
            <div 
              className="relative h-48 bg-muted cursor-pointer group"
              onClick={() => images.length > 0 && openLightbox(0)}
            >
              {images.length > 0 ? (
                <>
                  <img
                    src={images[0]}
                    alt={service.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Zoom indicator */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                    <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                  <Package className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              
              {/* Badges */}
              <div className="absolute top-3 left-3 flex gap-2">
                {service.is_featured && (
                  <Badge className="bg-amber-500 text-black gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Destaque
                  </Badge>
                )}
                {isSubscribed && (
                  <Badge className="bg-emerald-500 text-white gap-1">
                    <Check className="h-3 w-3" />
                    Assinado
                  </Badge>
                )}
              </div>

              {/* Image count indicator */}
              {images.length > 1 && (
                <Badge className="absolute bottom-3 right-3 bg-black/70 text-white">
                  {images.length} fotos
                </Badge>
              )}
            </div>

            <div className="p-6 space-y-6">
              <DialogHeader className="p-0">
                <DialogTitle className="text-2xl font-bold">{service.name}</DialogTitle>
                {service.short_description && (
                  <p className="text-sm text-muted-foreground uppercase tracking-wide">
                    {service.short_description}
                  </p>
                )}
              </DialogHeader>

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">
                  {formatCurrency(service.price)}
                </span>
                {service.billing_cycle && (
                  <span className="text-muted-foreground">/{service.billing_cycle}</span>
                )}
              </div>

              <Separator />

              {/* Description */}
              {(service.long_description || service.description) && (
                <div>
                  <h4 className="font-semibold mb-2">Descrição</h4>
                  <p 
                    className="text-muted-foreground whitespace-pre-wrap [&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80"
                    dangerouslySetInnerHTML={{
                      __html: (service.long_description || service.description)
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(
                          /(https?:\/\/[^\s<]+)/g,
                          '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
                        )
                    }}
                  />
                </div>
              )}

              {/* Benefits */}
              {benefits.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">O que está incluso</h4>
                  <div className="space-y-2">
                    {benefits.map((benefit: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="mt-0.5 h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-emerald-500" />
                        </div>
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Commission Info */}
              <div className="grid grid-cols-2 gap-4">
                {service.commission_value > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10">
                    <Gift className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-sm font-medium">Comissão por Indicação</p>
                      <p className="text-lg font-bold text-emerald-600">{service.commission_value}%</p>
                    </div>
                  </div>
                )}
                {service.recurrence_enabled && service.recurrence_value > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Comissão Recorrente</p>
                      <p className="text-lg font-bold text-primary">{service.recurrence_value}%</p>
                    </div>
                  </div>
                )}
                {service.trial_days > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Período de Teste</p>
                      <p className="text-lg font-bold text-blue-600">{service.trial_days} dias</p>
                    </div>
                  </div>
                )}
                {service.setup_fee > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10">
                    <DollarSign className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium">Taxa de Adesão</p>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(service.setup_fee)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Gallery - All images including the first one */}
              {images.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Galeria ({images.length} {images.length === 1 ? 'foto' : 'fotos'})</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => openLightbox(idx)}
                        className="relative aspect-square rounded-lg overflow-hidden group"
                      >
                        <img
                          src={img}
                          alt={`${service.name} - ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="pt-4">
                {isSubscribed ? (
                  <div className="space-y-3">
                    <Badge variant="secondary" className="w-full justify-center py-2 text-base">
                      <Check className="w-4 h-4 mr-2" />
                      Você já possui este serviço
                    </Badge>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => {
                        onOpenChange(false);
                        onSubscribe();
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Renovar / Adicionar Tempo
                    </Button>
                  </div>
                ) : (
                  <Button 
                    className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700" 
                    onClick={() => {
                      onOpenChange(false);
                      onSubscribe();
                    }}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    {service.cta_text || 'Assinar Agora'}
                  </Button>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}