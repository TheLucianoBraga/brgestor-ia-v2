import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, Power, Percent, DollarSign, Calendar } from 'lucide-react';
import { Discount } from '@/hooks/useTenantDiscounts';
import { TenantPlan } from '@/hooks/useTenantPlans';
import { TenantProduct } from '@/hooks/useTenantProducts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DiscountCardProps {
  discount: Discount;
  plans: TenantPlan[];
  products: TenantProduct[];
  onEdit?: (discount: Discount) => void;
  onDelete?: (discount: Discount) => void;
  onToggleActive?: (discount: Discount) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function DiscountCard({ 
  discount, 
  plans, 
  products, 
  onEdit, 
  onDelete, 
  onToggleActive 
}: DiscountCardProps) {
  const planItems = discount.items?.filter(i => i.item_type === 'plan') || [];
  const productItems = discount.items?.filter(i => i.item_type === 'product') || [];

  const getPlanName = (planId: string) => plans.find(p => p.id === planId)?.name || 'Plano removido';
  const getProductName = (productId: string) => products.find(p => p.id === productId)?.name || 'Produto removido';

  const isExpired = discount.valid_until && new Date(discount.valid_until) < new Date();
  const isNotStarted = discount.valid_from && new Date(discount.valid_from) > new Date();

  return (
    <Card className={!discount.is_active || isExpired ? 'opacity-60' : ''}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{discount.name}</h3>
            {!discount.is_active && <Badge variant="secondary">Inativo</Badge>}
            {isExpired && <Badge variant="destructive">Expirado</Badge>}
            {isNotStarted && <Badge variant="outline">Agendado</Badge>}
          </div>
          {discount.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{discount.description}</p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(discount)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive?.(discount)}>
              <Power className="h-4 w-4 mr-2" />
              {discount.is_active ? 'Desativar' : 'Ativar'}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete?.(discount)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          {discount.discount_type === 'percentage' ? (
            <>
              <Percent className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{discount.discount_value}%</span>
            </>
          ) : (
            <>
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{formatCurrency(discount.discount_value)}</span>
            </>
          )}
          <span className="text-muted-foreground">de desconto</span>
        </div>

        {(discount.valid_from || discount.valid_until) && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {discount.valid_from && format(new Date(discount.valid_from), 'dd/MM/yyyy', { locale: ptBR })}
              {discount.valid_from && discount.valid_until && ' - '}
              {discount.valid_until && format(new Date(discount.valid_until), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </div>
        )}

        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Aplica-se em:</p>
          <div className="flex flex-wrap gap-1">
            {planItems.map(item => (
              <Badge key={item.id} variant="outline" className="text-xs">
                📋 {getPlanName(item.plan_id!)}
              </Badge>
            ))}
            {productItems.map(item => (
              <Badge key={item.id} variant="outline" className="text-xs">
                📦 {getProductName(item.product_id!)}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
