import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { TenantPlan, TenantPlanFormData } from '@/hooks/useTenantPlans';

interface TenantPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: TenantPlan | null;
  onSubmit: (data: TenantPlanFormData) => Promise<{ success: boolean; error?: string }>;
}

export function TenantPlanModal({ open, onOpenChange, plan, onSubmit }: TenantPlanModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState<TenantPlanFormData>({
    name: '',
    description: '',
    price: 0,
    cost_price: 0,
    duration_months: 1,
    entry_fee: 0,
    entry_fee_mode: 'separate',
    auto_renew: true,
    is_active: true,
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        description: plan.description || '',
        price: plan.price,
        cost_price: plan.cost_price,
        duration_months: plan.duration_months,
        entry_fee: plan.entry_fee,
        entry_fee_mode: plan.entry_fee_mode,
        auto_renew: plan.auto_renew,
        is_active: plan.is_active,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        cost_price: 0,
        duration_months: 1,
        entry_fee: 0,
        entry_fee_mode: 'separate',
        auto_renew: true,
        is_active: true,
      });
    }
  }, [plan, open]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);
    const result = await onSubmit(formData);
    setIsSubmitting(false);

    if (result.success) {
      toast.success(plan ? 'Plano atualizado!' : 'Plano criado!');
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Erro ao salvar plano');
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Plano Básico"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do plano..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Preço Mensal</Label>
              <CurrencyInput
                id="price"
                value={formData.price}
                onChange={(value) => setFormData({ ...formData, price: value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost_price">Custo</Label>
              <CurrencyInput
                id="cost_price"
                value={formData.cost_price || 0}
                onChange={(value) => setFormData({ ...formData, cost_price: value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duração (meses)</Label>
              <Select
                value={String(formData.duration_months)}
                onValueChange={(value) => setFormData({ ...formData, duration_months: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mês</SelectItem>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                  <SelectItem value="24">24 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry_fee">Taxa de Entrada</Label>
              <CurrencyInput
                id="entry_fee"
                value={formData.entry_fee || 0}
                onChange={(value) => setFormData({ ...formData, entry_fee: value })}
              />
            </div>
          </div>

          {(formData.entry_fee || 0) > 0 && (
            <div className="space-y-2">
              <Label>Modo da Taxa de Entrada</Label>
              <Select
                value={formData.entry_fee_mode}
                onValueChange={(value: 'separate' | 'first_payment') => 
                  setFormData({ ...formData, entry_fee_mode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="separate">Cobrança separada</SelectItem>
                  <SelectItem value="first_payment">Soma na 1ª mensalidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="auto_renew"
                checked={formData.auto_renew}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_renew: checked })}
              />
              <Label htmlFor="auto_renew">Renovação automática</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Ativo</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : plan ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar {plan ? 'Atualização' : 'Criação'} do Plano</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Deseja salvar o plano com os seguintes valores?</p>
              <div className="mt-3 p-3 bg-muted rounded-md space-y-1 text-sm">
                <p><strong>Nome:</strong> {formData.name}</p>
                <p><strong>Preço:</strong> {formatCurrency(formData.price)}</p>
                {formData.cost_price > 0 && <p><strong>Custo:</strong> {formatCurrency(formData.cost_price)}</p>}
                <p><strong>Duração:</strong> {formData.duration_months} {formData.duration_months === 1 ? 'mês' : 'meses'}</p>
                {(formData.entry_fee || 0) > 0 && <p><strong>Taxa de Entrada:</strong> {formatCurrency(formData.entry_fee || 0)}</p>}
                <p><strong>Status:</strong> {formData.is_active ? 'Ativo' : 'Inativo'}</p>
                <p><strong>Renovação Automática:</strong> {formData.auto_renew ? 'Sim' : 'Não'}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Confirmar e Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
