import React, { useState, useEffect } from 'react';
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
import { useExpenseCostCenters } from '@/hooks/useExpenseCostCenters';
import { Database } from '@/integrations/supabase/types';
import { Loader2 } from 'lucide-react';

type ExpenseCostCenter = Database['public']['Tables']['expense_cost_centers']['Row'];

interface CostCenterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costCenter?: ExpenseCostCenter | null;
}

export const CostCenterModal: React.FC<CostCenterModalProps> = ({
  open,
  onOpenChange,
  costCenter,
}) => {
  const { createCostCenter, updateCostCenter } = useExpenseCostCenters();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const isEditing = !!costCenter;

  useEffect(() => {
    if (costCenter) {
      setName(costCenter.name);
      setDescription(costCenter.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [costCenter, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && costCenter) {
      await updateCostCenter.mutateAsync({
        id: costCenter.id,
        data: { name, description: description || null },
      });
    } else {
      await createCostCenter.mutateAsync({ name, description: description || null });
    }

    onOpenChange(false);
  };

  const isLoading = createCostCenter.isPending || updateCostCenter.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Projeto Alpha"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
