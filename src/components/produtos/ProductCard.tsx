import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, Power, Layers } from 'lucide-react';
import { TenantProduct } from '@/hooks/useTenantProducts';

interface ProductCardProps {
  product: TenantProduct;
  onEdit?: (product: TenantProduct) => void;
  onDelete?: (product: TenantProduct) => void;
  onToggleActive?: (product: TenantProduct) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function ProductCard({ product, onEdit, onDelete, onToggleActive }: ProductCardProps) {
  return (
    <Card className={!product.is_active ? 'opacity-60' : ''}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{product.name}</h3>
            {!product.is_active && (
              <Badge variant="secondary">Inativo</Badge>
            )}
            {product.has_price_tiers && (
              <Badge variant="outline" className="gap-1">
                <Layers className="h-3 w-3" />
                Faixas
              </Badge>
            )}
          </div>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(product)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive?.(product)}>
              <Power className="h-4 w-4 mr-2" />
              {product.is_active ? 'Desativar' : 'Ativar'}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete?.(product)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{formatCurrency(product.sale_price)}</span>
          {product.has_price_tiers && (
            <span className="text-muted-foreground text-sm">(base)</span>
          )}
        </div>

        {product.has_price_tiers && product.price_tiers && product.price_tiers.length > 0 && (
          <div className="text-sm space-y-1">
            <p className="text-muted-foreground font-medium">Faixas de Preço:</p>
            <div className="space-y-0.5">
              {product.price_tiers.slice(0, 3).map((tier, idx) => (
                <div key={idx} className="text-muted-foreground">
                  {tier.min_quantity}-{tier.max_quantity || '∞'} un: {formatCurrency(tier.unit_price)}/un
                </div>
              ))}
              {product.price_tiers.length > 3 && (
                <div className="text-muted-foreground">
                  +{product.price_tiers.length - 3} faixas...
                </div>
              )}
            </div>
          </div>
        )}

        {product.cost_price > 0 && (
          <div className="text-xs text-muted-foreground">
            Custo: {formatCurrency(product.cost_price)} | Margem: {formatCurrency(product.sale_price - product.cost_price)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
