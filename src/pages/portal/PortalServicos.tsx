import React, { useState, useMemo } from 'react';
import { Package, Check, Star, ShoppingCart, Gift, RefreshCw, Sparkles, Wallet, Eye, Layers } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { ServiceDetailsModal } from '@/components/portal/ServiceDetailsModal';
import { ServiceVariationsModal } from '@/components/portal/ServiceVariationsModal';
import { useCustomerServices } from '@/hooks/useCustomerServices';
import { usePortalCustomerId } from '@/hooks/usePortalCustomerId';
import { useReferral } from '@/hooks/useReferral';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/formatters';
import { isActiveStatus } from '@/utils/statusUtils';

interface ServiceWithVariations {
  parent: any;
  variations: any[];
  hasVariations: boolean;
}

const PortalServicos: React.FC = () => {
  const { customerId, tenantId, isLoading: customerLoading } = usePortalCustomerId();
  const { availableServices, customerItems, isLoading: servicesLoading, refetch } = useCustomerServices(customerId);
  const { stats } = useReferral(customerId, { context: 'portal', tenantId });
  const [selectedService, setSelectedService] = useState<any>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsService, setDetailsService] = useState<any>(null);
  const [variationsOpen, setVariationsOpen] = useState(false);
  const [variationsParent, setVariationsParent] = useState<any>(null);

  const isLoading = customerLoading || servicesLoading;

  // Group services by parent
  const groupedServices = useMemo(() => {
    const parentServices: ServiceWithVariations[] = [];
    const variationsByParent: Record<string, any[]> = {};
    
    // First pass: identify parent services and collect variations
    availableServices.forEach((service: any) => {
      if (service.is_variation && service.parent_service_id) {
        if (!variationsByParent[service.parent_service_id]) {
          variationsByParent[service.parent_service_id] = [];
        }
        variationsByParent[service.parent_service_id].push(service);
      }
    });
    
    // Second pass: create grouped structure
    availableServices.forEach((service: any) => {
      // Skip variations (they'll be grouped under parents)
      if (service.is_variation && service.parent_service_id) {
        return;
      }
      
      const variations = variationsByParent[service.id] || [];
      parentServices.push({
        parent: service,
        variations,
        hasVariations: variations.length > 0,
      });
    });
    
    return parentServices;
  }, [availableServices]);

  const formatPrice = formatCurrency;

  const isSubscribed = (serviceName: string) => {
    return customerItems?.some(item => 
      item.product_name === serviceName && isActiveStatus(item.status)
    );
  };

  const handleSubscribe = (service: any) => {
    setSelectedService(service);
    setCheckoutOpen(true);
  };

  const handleViewDetails = (service: any) => {
    setDetailsService(service);
    setDetailsOpen(true);
  };

  const handleOpenVariations = (group: ServiceWithVariations) => {
    setVariationsParent(group.parent);
    setVariationsOpen(true);
  };

  const handleCheckoutSuccess = () => {
    setCheckoutOpen(false);
    setSelectedService(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Serviços</h1>
          <p className="text-muted-foreground">Explore e assine nossos serviços exclusivos</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <Skeleton className="h-40 w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Catálogo de <span className="text-primary">Serviços</span></h1>
          <p className="text-muted-foreground">Soluções exclusivas para potencializar seus resultados.</p>
        </div>
        <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-2xl">
          <Button variant="ghost" size="sm" className="rounded-xl text-xs font-bold bg-background shadow-sm">Todos</Button>
          <Button variant="ghost" size="sm" className="rounded-xl text-xs font-bold text-muted-foreground">Destaques</Button>
        </div>
      </motion.div>

      {/* Saldo de Indicações - Destaque Premium */}
      {stats.availableBalance > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="relative overflow-hidden border-none bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 rounded-3xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-6 sm:p-8 relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md shrink-0 shadow-inner">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-100">
                      Crédito Disponível
                    </span>
                  </div>
                  <p className="text-4xl font-black tracking-tighter">
                    {formatPrice(stats.availableBalance)}
                  </p>
                  <p className="text-sm text-emerald-50/80 mt-1 font-medium">
                    Aproveite seu saldo para contratar novos serviços com desconto.
                  </p>
                </div>
                <Button variant="secondary" className="rounded-2xl font-bold px-6 h-12 shadow-lg hover:scale-105 transition-transform">
                  <Gift className="w-4 h-4 mr-2" />
                  Indicar Amigos
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {groupedServices.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum serviço disponível</h3>
            <p className="text-muted-foreground">
              Não há serviços disponíveis para contratação no momento.
            </p>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {groupedServices.map((group, index) => {
            const service = group.parent;
            const subscribed = isSubscribed(service.name);
            const images = service.images || [];
            const benefits = service.benefits || [];
            const showBenefits = benefits.slice(0, 4);
            const remainingBenefits = benefits.length - 4;
            
            // Calculate price range for services with variations
            const allPrices = [service.price, ...group.variations.map((v: any) => v.price)];
            const minPrice = Math.min(...allPrices);
            const maxPrice = Math.max(...allPrices);
            const hasPriceRange = group.hasVariations && minPrice !== maxPrice;

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.4, 
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
                whileHover={{ 
                  y: -8,
                  transition: { duration: 0.2 }
                }}
              >
                <Card className="flex flex-col overflow-hidden relative h-full group border-none shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-[2rem]">
                  {/* Featured Badge */}
                  {service.is_featured && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-amber-400 text-amber-950 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-amber-400/20">
                      <Star className="h-3 w-3 fill-current" />
                      Destaque
                    </div>
                  )}

                  {/* Subscribed Badge */}
                  {subscribed && (
                    <div className="absolute top-4 left-4 z-10 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-emerald-500/20">
                      <Check className="h-3 w-3" />
                      Assinado
                    </div>
                  )}

                  {/* Variations Badge */}
                  {group.hasVariations && (
                    <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg">
                      <Layers className="h-3 w-3" />
                      {group.variations.length + 1} Opções
                    </div>
                  )}

                  {/* Image Section */}
                  <div className="relative h-48 bg-muted overflow-hidden">
                    {images.length > 0 ? (
                      <img
                        src={images[0]}
                        alt={service.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <Package className="h-16 w-16 text-primary/20 transition-transform duration-500 group-hover:scale-110" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>

                  <CardContent className="p-6 flex-1 flex flex-col">
                    <h3 className="font-black text-xl mb-2 group-hover:text-primary transition-colors duration-300 leading-tight">
                      {service.name}
                    </h3>
                    
                    {/* Short Description */}
                    {service.short_description && (
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                        {service.short_description}
                      </p>
                    )}

                    {/* Benefits */}
                    {showBenefits.length > 0 && (
                      <div className="space-y-1.5 mb-4">
                        {showBenefits.map((benefit: string, idx: number) => (
                          <motion.div 
                            key={idx} 
                            className="flex items-start gap-2 text-sm"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 + idx * 0.05 }}
                          >
                            <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{benefit}</span>
                          </motion.div>
                        ))}
                        {remainingBenefits > 0 && (
                          <p className="text-xs text-primary ml-6">+{remainingBenefits} mais...</p>
                        )}
                      </div>
                    )}

                    {/* Price */}
                    <div className="mb-3">
                      {hasPriceRange ? (
                        <div>
                          <span className="text-sm text-muted-foreground">A partir de</span>
                          <span className="text-2xl font-bold text-primary ml-1">
                            {formatPrice(minPrice)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-2xl font-bold text-primary">
                          {formatPrice(service.price)}
                        </span>
                      )}
                    </div>

                    {/* Commission Info */}
                    <div className="space-y-1 text-sm">
                      {service.commission_value > 0 && (
                        <div className="flex items-center gap-1 text-emerald-500">
                          <Gift className="h-3.5 w-3.5" />
                          <span>Indique e ganhe {service.commission_value}%</span>
                        </div>
                      )}
                      {service.recurrence_enabled && service.recurrence_value > 0 && (
                        <div className="flex items-center gap-1 text-primary">
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Recorrente: {service.recurrence_value}%/renovação</span>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                    {group.hasVariations ? (
                      // Service with variations - show single button to open variations modal
                      <Button 
                        className="w-full bg-primary hover:bg-primary/90" 
                        onClick={() => handleOpenVariations(group)}
                      >
                        <Layers className="w-4 h-4 mr-2" />
                        Ver Opções
                      </Button>
                    ) : (
                      // Single service - show details and subscribe buttons
                      <>
                        <Button 
                          variant="ghost" 
                          className="w-full" 
                          onClick={() => handleViewDetails(service)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </Button>
                        <Button 
                          className="w-full bg-emerald-600 hover:bg-emerald-700" 
                          onClick={() => handleSubscribe(service)}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          {subscribed ? 'Renovar' : (service.cta_text || 'Assinar')}
                        </Button>
                      </>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {selectedService && (
        <CheckoutModal
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          service={selectedService}
          onSuccess={handleCheckoutSuccess}
        />
      )}

      {detailsOpen && detailsService && (
        <ServiceDetailsModal
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          service={detailsService}
          isSubscribed={isSubscribed(detailsService.name)}
          onSubscribe={() => handleSubscribe(detailsService)}
        />
      )}

      {variationsOpen && variationsParent && (
        <ServiceVariationsModal
          open={variationsOpen}
          onOpenChange={setVariationsOpen}
          parentService={variationsParent}
          variations={groupedServices.find(g => g.parent?.id === variationsParent?.id)?.variations || []}
          isSubscribed={isSubscribed}
          onSelectVariation={(service) => {
            setVariationsOpen(false);
            handleSubscribe(service);
          }}
          onViewDetails={(service) => {
            setVariationsOpen(false);
            handleViewDetails(service);
          }}
        />
      )}
    </div>
  );
};

export default PortalServicos;