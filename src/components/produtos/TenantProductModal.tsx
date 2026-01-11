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
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { TenantProduct, TenantProductFormData, PriceTier } from '@/hooks/useTenantProducts';

interface TenantProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: TenantProduct | null;
  onSubmit: (data: TenantProductFormData) => Promise<{ success: boolean; error?: string }>;
}

interface TierInput {
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
}

export function TenantProductModal({ open, onOpenChange, product, onSubmit }: TenantProductModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TenantProductFormData>({
    name: '',
    description: '',
    cost_price: 0,
    sale_price: 0,
    has_price_tiers: false,
    is_active: true,
  });
  const [tiers, setTiers] = useState<TierInput[]>([]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        cost_price: product.cost_price,
        sale_price: product.sale_price,
        has_price_tiers: product.has_price_tiers,
        is_active: product.is_active,
      });
      setTiers(
        product.price_tiers?.map(t => ({
          min_quantity: t.min_quantity,
          max_quantity: t.max_quantity,
          unit_price: t.unit_price,
        })) || []
      );
    } else {
      setFormData({
        name: '',
        description: '',
        cost_price: 0,
        sale_price: 0,
        has_price_tiers: false,
        is_active: true,
      });
      setTiers([]);
    }
  }, [product, open]);

  const handleAddTier = () => {
    const lastTier = tiers[tiers.length - 1];
    setTiers([
      ...tiers,
      {
        min_quantity: lastTier ? (lastTier.max_quantity || lastTier.min_quantity) + 1 : 1,
        max_quantity: null,
        unit_price: formData.sale_price,
      },
    ]);
  };

  const handleRemoveTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const handleTierChange = (index: number, field: keyof TierInput, value: number | null) => {
    const newTiers = [...tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setTiers(newTiers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    const dataToSubmit: TenantProductFormData = {
      ...formData,
      price_tiers: formData.has_price_tiers ? tiers : [],
    };

    setIsSubmitting(true);
    const result = await onSubmit(dataToSubmit);
    setIsSubmitting(false);

    if (result.success) {
      toast.success(product ? 'Produto atualizado!' : 'Produto criado!');
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Erro ao salvar produto');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Licença de Software"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do produto..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sale_price">Preço de Venda</Label>
              <CurrencyInput
                id="sale_price"
                value={formData.sale_price}
                onChange={(value) => setFormData({ ...formData, sale_price: value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost_price">Custo</Label>
              <CurrencyInput
                id="cost_price"
                value={formData.cost_price}
                onChange={(value) => setFormData({ ...formData, cost_price: value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="has_price_tiers"
              checked={formData.has_price_tiers}
              onCheckedChange={(checked) => setFormData({ ...formData, has_price_tiers: checked })}
            />
            <Label htmlFor="has_price_tiers">Preço por quantidade</Label>
          </div>

          {formData.has_price_tiers && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Faixas de Preço</Label>
                <Button type="button" size="sm" variant="outline" onClick={handleAddTier}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {tiers.map((tier, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="1"
                      placeholder="De"
                      value={tier.min_quantity}
                      onChange={(e) => handleTierChange(index, 'min_quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <span className="text-muted-foreground">a</span>
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Até (vazio = ∞)"
                      value={tier.max_quantity || ''}
                      onChange={(e) => handleTierChange(index, 'max_quantity', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                  <span className="text-muted-foreground">=</span>
                  <div className="flex-1">
                    <CurrencyInput
                      value={tier.unit_price}
                      onChange={(value) => handleTierChange(index, 'unit_price', value)}
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveTier(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}

              {tiers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhuma faixa configurada
                </p>
              )}
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
              {isSubmitting ? 'Salvando...' : product ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
