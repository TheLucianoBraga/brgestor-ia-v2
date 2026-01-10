import React, { useState, useEffect, useRef } from 'react';
import { Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plan } from '@/hooks/usePlans';

export interface SelectedFeature {
  category: string;
  subcategory: string;
  feature: string;
}

interface PlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: Plan | null;
  initialFeatures?: SelectedFeature[];
  onSubmit: (data: any, features: SelectedFeature[]) => Promise<{ success: boolean; error?: string }>;
}

export const PlanModal: React.FC<PlanModalProps> = ({
  open,
  onOpenChange,
  plan,
  initialFeatures = [],
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [planType, setPlanType] = useState<'adm' | 'revenda'>('revenda');
  const [maxUsers, setMaxUsers] = useState(1);
  const [basePrice, setBasePrice] = useState(0);
  const [perActiveRevendaPrice, setPerActiveRevendaPrice] = useState(0);
  const [active, setActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Store features in a ref to avoid re-render loops
  const featuresRef = useRef<SelectedFeature[]>([]);

  const isEditing = !!plan;

  // Only update when modal opens
  useEffect(() => {
    if (!open) return;
    
    if (plan) {
      setName(plan.name);
      setPlanType(plan.plan_type);
      setMaxUsers(plan.max_users);
      setBasePrice(plan.base_price);
      setPerActiveRevendaPrice(plan.per_active_revenda_price);
      setActive(plan.active);
      featuresRef.current = initialFeatures;
    } else {
      setName('');
      setPlanType('revenda');
      setMaxUsers(1);
      setBasePrice(0);
      setPerActiveRevendaPrice(0);
      setActive(true);
      featuresRef.current = [];
    }
  }, [open, plan?.id]); // Only depend on open and plan.id

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Preencha o nome do plano');
      return;
    }

    setIsLoading(true);
    
    const data = {
      name: name.trim(),
      plan_type: planType,
      max_users: maxUsers,
      base_price: basePrice,
      per_active_revenda_price: planType === 'adm' ? perActiveRevendaPrice : 0,
      active,
    };

    const result = await onSubmit(data, featuresRef.current);
    setIsLoading(false);

    if (result.success) {
      toast.success(isEditing ? 'Plano atualizado!' : 'Plano criado!');
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Erro ao salvar plano');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {isEditing ? 'Editar Plano' : 'Novo Plano'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações do plano.' : 'Configure um novo plano para venda.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do plano</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Plano Básico"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="planType">Tipo de plano</Label>
            <Select 
              value={planType} 
              onValueChange={(v) => setPlanType(v as 'adm' | 'revenda')} 
              disabled={isLoading || isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adm">Administradora (ADM)</SelectItem>
                <SelectItem value="revenda">Revenda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxUsers">Máx. usuários</Label>
              <Input
                id="maxUsers"
                type="number"
                min={1}
                value={maxUsers}
                onChange={(e) => setMaxUsers(parseInt(e.target.value) || 1)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="basePrice">Preço base (R$)</Label>
              <Input
                id="basePrice"
                type="number"
                min={0}
                step={0.01}
                value={basePrice}
                onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                disabled={isLoading}
              />
            </div>
          </div>

          {planType === 'adm' && (
            <div className="space-y-2">
              <Label htmlFor="perRevenda">Preço por revenda ativa (R$)</Label>
              <Input
                id="perRevenda"
                type="number"
                min={0}
                step={0.01}
                value={perActiveRevendaPrice}
                onChange={(e) => setPerActiveRevendaPrice(parseFloat(e.target.value) || 0)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Cobrado mensalmente por cada revenda ativa vinculada à ADM.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Plano ativo</Label>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={setActive}
              disabled={isLoading}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="btn-gradient-primary">
              {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar Plano'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};