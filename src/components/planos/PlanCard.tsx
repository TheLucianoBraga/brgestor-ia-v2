import React from 'react';
import { Package, Users, DollarSign, MoreVertical, Pencil, Trash2, Power, PowerOff } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlanWithPrice } from '@/hooks/usePlans';

interface PlanCardProps {
  plan: PlanWithPrice;
  showActions?: boolean;
  onEdit?: (plan: PlanWithPrice) => void;
  onDelete?: (plan: PlanWithPrice) => void;
  onToggleActive?: (plan: PlanWithPrice) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  showActions = false,
  onEdit,
  onDelete,
  onToggleActive,
}) => {
  return (
    <Card className={`hover:shadow-md transition-shadow ${!plan.active ? 'opacity-60' : ''}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold leading-tight">{plan.name}</h3>
            <Badge variant="outline" className="mt-1 capitalize">
              {plan.plan_type === 'adm' ? 'Administradora' : 'Revenda'}
            </Badge>
          </div>
        </div>
        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(plan)}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive?.(plan)}>
                {plan.active ? (
                  <>
                    <PowerOff className="w-4 h-4 mr-2" />
                    Desativar
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4 mr-2" />
                    Ativar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete?.(plan)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>Máx. usuários</span>
          </div>
          <span className="font-medium">{plan.max_users}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span>Preço mensal</span>
          </div>
          <span className="font-bold text-lg">{formatCurrency(plan.effective_price || plan.base_price)}</span>
        </div>

        {plan.plan_type === 'adm' && plan.per_active_revenda_price > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              + {formatCurrency(plan.per_active_revenda_price)}/revenda ativa
            </p>
          </div>
        )}

        <div className="pt-2">
          <Badge variant={plan.active ? 'default' : 'secondary'}>
            {plan.active ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
