import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, Power, Calendar, RefreshCcw, DollarSign } from 'lucide-react';
import { TenantPlan } from '@/hooks/useTenantPlans';

interface PlanCardProps {
  plan: TenantPlan;
  onEdit?: (plan: TenantPlan) => void;
  onDelete?: (plan: TenantPlan) => void;
  onToggleActive?: (plan: TenantPlan) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function PlanCard({ plan, onEdit, onDelete, onToggleActive }: PlanCardProps) {
  return (
    <Card className={!plan.is_active ? 'opacity-60' : ''}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{plan.name}</h3>
            {!plan.is_active && (
              <Badge variant="secondary">Inativo</Badge>
            )}
          </div>
          {plan.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{plan.description}</p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(plan)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive?.(plan)}>
              <Power className="h-4 w-4 mr-2" />
              {plan.is_active ? 'Desativar' : 'Ativar'}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete?.(plan)}
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
          <span className="text-2xl font-bold">{formatCurrency(plan.price)}</span>
          <span className="text-muted-foreground">/mês</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{plan.duration_months} {plan.duration_months === 1 ? 'mês' : 'meses'}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <RefreshCcw className="h-4 w-4" />
            <span>{plan.auto_renew ? 'Renovação auto.' : 'Sem renovação'}</span>
          </div>
        </div>

        {plan.entry_fee > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>
              Taxa de entrada: {formatCurrency(plan.entry_fee)}
              <span className="text-muted-foreground text-xs ml-1">
                ({plan.entry_fee_mode === 'separate' ? 'separada' : 'na 1ª mensalidade'})
              </span>
            </span>
          </div>
        )}

        {plan.cost_price > 0 && (
          <div className="text-xs text-muted-foreground">
            Custo: {formatCurrency(plan.cost_price)} | Margem: {formatCurrency(plan.price - plan.cost_price)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
