import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Discount, DiscountFormData } from '@/hooks/useTenantDiscounts';
import { TenantPlan } from '@/hooks/useTenantPlans';
import { TenantProduct } from '@/hooks/useTenantProducts';

interface DiscountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount?: Discount | null;
  plans: TenantPlan[];
  products: TenantProduct[];
  onSubmit: (data: DiscountFormData) => Promise<{ success: boolean; error?: string }>;
}

export function DiscountModal({ 
  open, 
  onOpenChange, 
  discount, 
  plans, 
  products, 
  onSubmit 
}: DiscountModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<DiscountFormData>({
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    valid_from: '',
    valid_until: '',
    is_active: true,
    plan_ids: [],
    product_ids: [],
  });

  useEffect(() => {
    if (discount) {
      const planIds = discount.items?.filter(i => i.item_type === 'plan').map(i => i.plan_id!) || [];
      const productIds = discount.items?.filter(i => i.item_type === 'product').map(i => i.product_id!) || [];
      
      setFormData({
        name: discount.name,
        description: discount.description || '',
        discount_type: discount.discount_type,
        discount_value: discount.discount_value,
        valid_from: discount.valid_from || '',
        valid_until: discount.valid_until || '',
        is_active: discount.is_active,
        plan_ids: planIds,
        product_ids: productIds,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 0,
        valid_from: '',
        valid_until: '',
        is_active: true,
        plan_ids: [],
        product_ids: [],
      });
    }
  }, [discount, open]);

  const togglePlan = (planId: string) => {
    const current = formData.plan_ids || [];
    if (current.includes(planId)) {
      setFormData({ ...formData, plan_ids: current.filter(id => id !== planId) });
    } else {
      setFormData({ ...formData, plan_ids: [...current, planId] });
    }
  };

  const toggleProduct = (productId: string) => {
    const current = formData.product_ids || [];
    if (current.includes(productId)) {
      setFormData({ ...formData, product_ids: current.filter(id => id !== productId) });
    } else {
      setFormData({ ...formData, product_ids: [...current, productId] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (formData.discount_value <= 0) {
      toast.error('Valor do desconto deve ser maior que zero');
      return;
    }

    if ((formData.plan_ids?.length || 0) === 0 && (formData.product_ids?.length || 0) === 0) {
      toast.error('Selecione pelo menos um plano ou produto');
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmit(formData);
    setIsSubmitting(false);

    if (result.success) {
      toast.success(discount ? 'Desconto atualizado!' : 'Desconto criado!');
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Erro ao salvar desconto');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{discount ? 'Editar Desconto' : 'Novo Desconto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Desconto de Verão"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do desconto..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Desconto</Label>
              <Select
                value={formData.discount_type}
                onValueChange={(value: 'percentage' | 'fixed') => 
                  setFormData({ ...formData, discount_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                  <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_value">
                Valor {formData.discount_type === 'percentage' ? '(%)' : ''}
              </Label>
              {formData.discount_type === 'percentage' ? (
                <Input
                  id="discount_value"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                />
              ) : (
                <CurrencyInput
                  value={formData.discount_value}
                  onChange={(value) => setFormData({ ...formData, discount_value: value })}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valid_from">Válido de</Label>
              <Input
                id="valid_from"
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_until">Válido até</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>
          </div>

          {/* Plans Selection */}
          {plans.length > 0 && (
            <div className="space-y-2">
              <Label>Aplicar em Planos</Label>
              <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2">
                {plans.map(plan => (
                  <div key={plan.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`plan-${plan.id}`}
                      checked={formData.plan_ids?.includes(plan.id)}
                      onCheckedChange={() => togglePlan(plan.id)}
                    />
                    <Label htmlFor={`plan-${plan.id}`} className="text-sm font-normal cursor-pointer">
                      {plan.name} - R$ {plan.price.toFixed(2)}/mês
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products Selection */}
          {products.length > 0 && (
            <div className="space-y-2">
              <Label>Aplicar em Produtos</Label>
              <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2">
                {products.map(product => (
                  <div key={product.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`product-${product.id}`}
                      checked={formData.product_ids?.includes(product.id)}
                      onCheckedChange={() => toggleProduct(product.id)}
                    />
                    <Label htmlFor={`product-${product.id}`} className="text-sm font-normal cursor-pointer">
                      {product.name} - R$ {product.sale_price.toFixed(2)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Ativo</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : discount ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
