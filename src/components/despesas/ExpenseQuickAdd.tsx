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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-postgres';
import { useTenant } from '@/contexts/TenantContext';

interface ExpenseCategory {
  id: string;
  name: string;
}

interface ExpenseQuickAddProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExpenseQuickAdd: React.FC<ExpenseQuickAddProps> = ({ open, onOpenChange }) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    due_date: '',
    category_id: '',
    status: 'pending' as const
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const { currentTenant } = useTenant();

  useEffect(() => {
    if (open && currentTenant?.id) {
      fetchCategories();
    }
  }, [open, currentTenant]);

  const fetchCategories = async () => {
    if (!currentTenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('id, name')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.due_date) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!currentTenant?.id) {
      toast.error('Erro: Tenant não identificado');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Dados para inserir:', {
        tenant_id: currentTenant.id,
        description: formData.description,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        category_id: formData.category_id || null,
        status: formData.status
      });

      const { error } = await supabase
        .from('expenses')
        .insert({
          tenant_id: currentTenant.id,
          description: formData.description,
          amount: parseFloat(formData.amount),
          due_date: formData.due_date,
          category_id: formData.category_id || null,
          status: formData.status
        });

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw error;
      }

      toast.success('Despesa adicionada com sucesso!');
      setFormData({
        description: '',
        amount: '',
        due_date: '',
        category_id: '',
        status: 'pending'
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      toast.error(`Erro ao adicionar despesa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-600" />
            Adicionar Despesa Rápida
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Descrição *
            </Label>
            <Input
              id="description"
              placeholder="Ex: Conta de luz"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="amount" className="text-sm font-medium flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              Valor *
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="due_date" className="text-sm font-medium flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Vencimento *
            </Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="category" className="text-sm font-medium">
              Categoria
            </Label>
            <Select value={formData.category_id} onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

