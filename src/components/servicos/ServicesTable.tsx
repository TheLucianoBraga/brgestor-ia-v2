import React from 'react';
import { Edit, ToggleLeft, ToggleRight, Trash2, Layers, GitBranch } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Service } from '@/hooks/useServices';
import { cn } from '@/lib/utils';

interface ServicesTableProps {
  services: Service[];
  onEdit: (service: Service) => void;
  onToggleStatus: (service: Service) => void;
  onDelete: (service: Service) => void;
}

export const ServicesTable: React.FC<ServicesTableProps> = ({
  services,
  onEdit,
  onToggleStatus,
  onDelete,
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getBillingTypeLabel = (type: string) => {
    return type === 'recurring' ? 'Recorrente' : 'Único';
  };

  const getIntervalLabel = (interval: string | null) => {
    switch (interval) {
      case 'monthly':
        return 'Mensal';
      case 'yearly':
        return 'Anual';
      default:
        return '-';
    }
  };

  // Helper to count variations for a service
  const getVariationsCount = (serviceId: string) => {
    return services.filter(s => s.parent_service_id === serviceId).length;
  };

  // Helper to get parent service
  const getParentService = (parentId: string | null) => {
    if (!parentId) return null;
    return services.find(s => s.id === parentId);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Agrupamento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Intervalo</TableHead>
            <TableHead className="text-right">Preço</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => {
            const variationsCount = getVariationsCount(service.id);
            const hasVariations = variationsCount > 0;
            const isVariation = service.is_variation && service.parent_service_id;
            const parentService = getParentService(service.parent_service_id);

            return (
              <TableRow 
                key={service.id}
                className={cn(
                  !service.active && 'opacity_60',
                  isVariation && 'bg-muted/30'
                )}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {hasVariations && (
                      <Layers className="w-4 h-4 text-primary shrink-0" />
                    )}
                    {isVariation && (
                      <GitBranch className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <div>
                      <p className="font-medium">{service.name}</p>
                      {service.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {service.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {hasVariations ? (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                      <Layers className="w-3 h-3 mr-1" />
                      {variationsCount} {variationsCount === 1 ? 'variação' : 'variações'}
                    </Badge>
                  ) : isVariation && parentService ? (
                    <span className="text-xs text-muted-foreground">
                      ↳ {parentService.name}
                      {service.variation_label && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {service.variation_label}
                        </Badge>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getBillingTypeLabel(service.billing_type)}
                  </Badge>
                </TableCell>
                <TableCell>{getIntervalLabel(service.interval)}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatPrice(service.price)}
                </TableCell>
                <TableCell>
                  <Badge variant={service.active ? 'default' : 'secondary'}>
                    {service.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(service)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleStatus(service)}
                    >
                      {service.active ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(service)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
