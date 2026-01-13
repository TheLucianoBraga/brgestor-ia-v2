import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll_area';
import { Package, Check, Star, ShoppingCart, Gift, RefreshCw, Layers, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Service {
  id: string;
  name: string;
  description?: string | null;
  short_description?: string | null;
  images?: string[];
  benefits?: string[];
  price: number;
  billing_type?: string;
  interval?: string | null;
  commission_value?: number;
  recurrence_enabled?: boolean;
  recurrence_value?: number;
  duration_months?: number;
  cta_text?: string;
  is_featured?: boolean;
  variation_label?: string | null;
}

interface ServiceVariationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentService: Service | null;
  variations: Service[];
  isSubscribed: (name: string) => boolean;
  onSelectVariation: (service: Service) => void;
  onViewDetails: (service: Service) => void;
}

export function ServiceVariationsModal({
  open,
  onOpenChange,
  parentService,
  variations,
  isSubscribed,
  onSelectVariation,
  onViewDetails,
}: ServiceVariationsModalProps) {
  if (!parentService) return null;

  const allServices = [parentService, ...variations];
  const images = parentService.images || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          {/* Hero Section */}
          <div className="relative h-40 bg-muted">
            {images.length > 0 ? (
              <img
                src={images[0]}
                alt={parentService.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                <Layers className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-6 right-6">
              <Badge className="bg-primary/90 mb-2">
                <Layers className="h-3 w-3 mr-1" />
                {allServices.length} opções disponíveis
              </Badge>
              <h2 className="text-2xl font-bold text-white">{parentService.name}</h2>
              {parentService.short_description && (
                <p className="text-white/80 text-sm mt-1">{parentService.short_description}</p>
              )}
            </div>
          </div>

          <div className="p-6">
            <DialogHeader className="p-0 mb-6">
              <DialogTitle className="text-lg">Escolha a opção ideal para você</DialogTitle>
            </DialogHeader>

            {/* Variations Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {allServices.map((service, index) => {
                const subscribed = isSubscribed(service.name);
                const benefits = service.benefits || [];

                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "relative border rounded-xl p-4 transition-all cursor-pointer hover:shadow-lg",
                      subscribed 
                        ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" 
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => onViewDetails(service)}
                  >
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-3">
                      {service.variation_label && (
                        <Badge variant="secondary" className="text-xs">
                          {service.variation_label}
                        </Badge>
                      )}
                      {service.is_featured && (
                        <Badge className="bg-amber-500 text-black text-xs">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Popular
                        </Badge>
                      )}
                      {subscribed && (
                        <Badge className="bg-emerald-500 text-white text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Assinado
                        </Badge>
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="font-semibold text-lg mb-2">
                      {service.variation_label || service.name}
                    </h3>

                    {/* Price */}
                    <div className="mb-3">
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(service.price)}
                      </span>
                      {service.interval && (
                        <span className="text-muted-foreground text-sm">
                          /{service.interval === 'monthly' ? 'mês' : 
                            service.interval === 'quarterly' ? 'trim' :
                            service.interval === 'semiannual' ? 'sem' : 'ano'}
                        </span>
                      )}
                    </div>

                    {/* Benefits Preview */}
                    {benefits.length > 0 && (
                      <div className="space-y-1 mb-4">
                        {benefits.slice(0, 3).map((benefit, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{benefit}</span>
                          </div>
                        ))}
                        {benefits.length > 3 && (
                          <p className="text-xs text-primary ml-6">+{benefits.length - 3} mais...</p>
                        )}
                      </div>
                    )}

                    {/* Commission */}
                    {(service.commission_value || 0) > 0 && (
                      <div className="flex items-center gap-1 text-xs text-emerald-500 mb-3">
                        <Gift className="h-3 w-3" />
                        <span>Ganhe {service.commission_value}% indicando</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-auto">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(service);
                        }}
                      >
                        Detalhes
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                      <Button 
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVariation(service);
                        }}
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        {subscribed ? 'Renovar' : (service.cta_text || 'Assinar')}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
