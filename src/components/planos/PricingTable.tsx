import React, { useState } from 'react';
import { DollarSign, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlanWithPrice } from '@/hooks/usePlans';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PricingTableProps {
  plans: PlanWithPrice[];
  onSavePrice: (planId: string, price: number) => Promise<{ success: boolean; error?: string }>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const PricingTable: React.FC<PricingTableProps> = ({ plans, onSavePrice }) => {
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);

  const handlePriceChange = (planId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditingPrices((prev) => ({ ...prev, [planId]: numValue }));
  };

  const handleSave = async (plan: PlanWithPrice) => {
    const newPrice = editingPrices[plan.id];
    if (newPrice === undefined) return;

    // Validar preço mínimo (não pode ser menor que o preço base do Master)
    if (newPrice < plan.base_price) {
      toast.error(`O preço não pode ser menor que o preço base de ${formatCurrency(plan.base_price)}`);
      return;
    }

    setSavingPlanId(plan.id);
    const result = await onSavePrice(plan.id, newPrice);
    setSavingPlanId(null);

    if (result.success) {
      toast.success('Preço atualizado!');
      setEditingPrices((prev) => {
        const updated = { ...prev };
        delete updated[plan.id];
        return updated;
      });
    } else {
      toast.error(result.error || 'Erro ao atualizar preço');
    }
  };

  const revendaPlans = plans.filter((p) => p.plan_type === 'revenda');

  if (revendaPlans.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum plano de revenda disponível para precificação.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plano</TableHead>
            <TableHead>Preço Base (MASTER)</TableHead>
            <TableHead>Seu Preço</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {revendaPlans.map((plan) => {
            const currentPrice = editingPrices[plan.id] ?? plan.price?.price_monthly ?? plan.base_price;
            const hasOverride = plan.price && plan.price.seller_tenant_id !== plan.created_by_tenant_id;
            const hasChanges = editingPrices[plan.id] !== undefined;

            return (
              <TableRow key={plan.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{plan.name}</span>
                    {!plan.active && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatCurrency(plan.base_price)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={plan.base_price}
                      step={0.01}
                      value={currentPrice}
                      onChange={(e) => handlePriceChange(plan.id, e.target.value)}
                      className={cn(
                        "w-32",
                        currentPrice < plan.base_price && "border-destructive text-destructive"
                      )}
                      disabled={savingPlanId === plan.id}
                    />
                    {hasOverride && !hasChanges && (
                      <Badge variant="outline" className="text-xs">Override</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    onClick={() => handleSave(plan)}
                    disabled={!hasChanges || savingPlanId === plan.id}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {savingPlanId === plan.id ? 'Salvando...' : 'Salvar'}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
