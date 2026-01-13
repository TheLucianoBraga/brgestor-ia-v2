import React from 'react';
import { Package, Edit, ToggleLeft, ToggleRight, Trash2, ShoppingCart, Layers, GitBranch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Service } from '@/hooks/useServices';
import { cn } from '@/lib/utils';

interface ServiceCardProps {
  service: Service;
  canManage?: boolean;
  isClient?: boolean;
  allServices?: Service[];
  onEdit?: (service: Service) => void;
  onToggleStatus?: (service: Service) => void;
  onDelete?: (service: Service) => void;
  onSubscribe?: (service: Service) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  canManage,
  isClient,
  allServices = [],
  onEdit,
  onToggleStatus,
  onDelete,
  onSubscribe,
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getIntervalLabel = (interval: string | null) => {
    switch (interval) {
      case 'monthly':
        return '/mês';
      case 'yearly':
        return '/ano';
      default:
        return '';
    }
  };

  const getBillingTypeLabel = (type: string) => {
    return type === 'recurring' ? 'Recorrente' : 'Único';
  };

  // Count variations for this service (if it's a parent)
  const variationsCount = allServices.filter(s => s.parent_service_id === service.id).length;
  const hasVariations = variationsCount > 0;
  
  // Check if this service is a variation
  const isVariation = service.is_variation && service.parent_service_id;
  const parentService = isVariation 
    ? allServices.find(s => s.id === service.parent_service_id) 
    : null;

  return (
    <Card className={cn(
      'transition-all hover:shadow_md',
      !service.active && 'opacity_60',
      hasVariations && 'ring-1 ring-primary/20',
      isVariation && 'border-l-4 border-l-primary/50'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              hasVariations ? "bg-primary/20" : isVariation ? "bg-muted" : "bg-primary/10"
            )}>
              {hasVariations ? (
                <Layers className="w-5 h-5 text-primary" />
              ) : isVariation ? (
                <GitBranch className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Package className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">{service.name}</CardTitle>
              {isVariation && parentService && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Variação de: {parentService.name}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant={service.active ? 'default' : 'secondary'}>
                  {service.active ? 'Ativo' : 'Inativo'}
                </Badge>
                <Badge variant="outline">
                  {getBillingTypeLabel(service.billing_type)}
                </Badge>
                {hasVariations && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                    <Layers className="w-3 h-3 mr-1" />
                    {variationsCount} {variationsCount === 1 ? 'variação' : 'variações'}
                  </Badge>
                )}
                {isVariation && service.variation_label && (
                  <Badge variant="outline" className="bg-muted/50">
                    {service.variation_label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-primary">
              {formatPrice(service.price)}
            </p>
            <p className="text-xs text-muted-foreground">
              {getIntervalLabel(service.interval)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {service.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {service.description}
          </p>
        )}
        
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit?.(service)}
              >
                <Edit className="w-4 h-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleStatus?.(service)}
              >
                {service.active ? (
                  <>
                    <ToggleRight className="w-4 h-4 mr-1" />
                    Desativar
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 mr-1" />
                    Ativar
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete?.(service)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
          
          {isClient && (
            <Button
              className="w-full btn-gradient-primary"
              onClick={() => onSubscribe?.(service)}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Assinar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
