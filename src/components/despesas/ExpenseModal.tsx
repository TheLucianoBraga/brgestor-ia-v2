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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useExpenses, ExpenseWithRelations } from '@/hooks/useExpenses';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { useExpenseCostCenters } from '@/hooks/useExpenseCostCenters';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { AITextAssistant } from '@/components/ui/AITextAssistant';

interface ScannedExpenseData {
  description?: string;
  amount?: number;
  supplier?: string;
  due_date?: string;
  category?: string;
}

interface ExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: ExpenseWithRelations | null;
  scannedData?: ScannedExpenseData | null;
}

interface AllocationRow {
  cost_center_id: string;
  percentage: number;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  open,
  onOpenChange,
  expense,
  scannedData,
}) => {
  const { createExpense, updateExpense } = useExpenses();
  const { categories } = useExpenseCategories();
  const { costCenters } = useExpenseCostCenters();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('monthly');
  const [recurrenceCount, setRecurrenceCount] = useState(12);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [status, setStatus] = useState('pending');

  const isEditing = !!expense;

  useEffect(() => {
    if (expense) {
      setDescription(expense.description);
      setAmount(expense.amount);
      setDueDate(expense.due_date);
      setCategoryId(expense.category_id || '');
      setSupplier(expense.supplier || '');
      setNotes(expense.notes || '');
      setStatus(expense.status || 'pending');
      setIsRecurring(expense.is_recurring || false);
      if (expense.recurrence_rule) {
        const rule = expense.recurrence_rule as { frequency?: string; count?: number };
        setRecurrenceFrequency(rule.frequency || 'monthly');
        setRecurrenceCount(rule.count || 12);
      }
      if (expense.allocations?.length) {
        setAllocations(
          expense.allocations.map(a => ({
            cost_center_id: a.cost_center_id,
            percentage: a.percentage,
          }))
        );
      }
    } else if (scannedData) {
      // Preencher com dados escaneados pela IA
      setDescription(scannedData.description || '');
      setAmount(scannedData.amount || 0);
      setDueDate(scannedData.due_date || new Date().toISOString().split('T')[0]);
      setSupplier(scannedData.supplier || '');
      // Tentar encontrar categoria pelo nome
      if (scannedData.category) {
        const foundCat = categories.find(c => 
          c.name.toLowerCase().includes(scannedData.category!.toLowerCase())
        );
        if (foundCat) setCategoryId(foundCat.id);
      }
      setNotes('Despesa escaneada por IA');
      setIsRecurring(false);
      setAllocations([]);
    } else {
      resetForm();
    }
  }, [expense, scannedData, open, categories]);

  const resetForm = () => {
    setDescription('');
    setAmount(0);
    setDueDate(new Date().toISOString().split('T')[0]);
    setCategoryId('');
    setSupplier('');
    setNotes('');
    setIsRecurring(false);
    setRecurrenceFrequency('monthly');
    setRecurrenceCount(12);
    setAllocations([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const expenseData = {
      description,
      amount,
      due_date: dueDate,
      category_id: categoryId || null,
      supplier: supplier || null,
      notes: notes || null,
      status,
      is_recurring: isRecurring,
      recurrence_rule: isRecurring
        ? { frequency: recurrenceFrequency, count: recurrenceCount }
        : null,
    };

    const validAllocations = allocations.filter(a => a.cost_center_id && a.percentage > 0);

    if (isEditing && expense) {
      await updateExpense.mutateAsync({
        id: expense.id,
        expense: expenseData,
        allocations: validAllocations,
      });
    } else {
      await createExpense.mutateAsync({
        expense: expenseData,
        allocations: validAllocations,
      });
    }

    onOpenChange(false);
    resetForm();
  };

  const addAllocation = () => {
    setAllocations([...allocations, { cost_center_id: '', percentage: 0 }]);
  };

  const removeAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const updateAllocation = (index: number, field: keyof AllocationRow, value: string | number) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], [field]: value };
    setAllocations(updated);
  };

  const totalAllocation = allocations.reduce((sum, a) => sum + a.percentage, 0);
  const isLoading = createExpense.isPending || updateExpense.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Despesa' : 'Nova Despesa'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Aluguel escritório"
                required
              />
            </div>

            <div>
              <Label htmlFor="amount">Valor *</Label>
              <CurrencyInput
                value={amount}
                onChange={setAmount}
              />
            </div>

            <div>
              <Label htmlFor="dueDate">Vencimento *</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="supplier">Fornecedor</Label>
              <Input
                id="supplier"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Nome do fornecedor"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="notes">Observações</Label>
                <AITextAssistant 
                  value={notes} 
                  onUpdate={setNotes}
                />
              </div>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anotações adicionais..."
                rows={2}
              />
            </div>
          </div>

          {/* Recurrence */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="recurring">Despesa Recorrente</Label>
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>

            {isRecurring && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Frequência</Label>
                  <Select value={recurrenceFrequency} onValueChange={setRecurrenceFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="biweekly">Quinzenal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Repetições</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={recurrenceCount}
                    onChange={(e) => setRecurrenceCount(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cost Center Allocations */}
          {costCenters.length > 0 && (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label>Rateio por Centro de Custo</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAllocation}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {allocations.map((alloc, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={alloc.cost_center_id}
                    onValueChange={(v) => updateAllocation(index, 'cost_center_id', v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Centro de custo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {costCenters.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id}>
                          {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1 w-24">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={alloc.percentage}
                      onChange={(e) => updateAllocation(index, 'percentage', parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAllocation(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}

              {allocations.length > 0 && (
                <div className={`text-sm ${totalAllocation === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                  Total: {totalAllocation}%
                  {totalAllocation !== 100 && ' (deve ser 100%)'}
                </div>
              )}
            </div>
          )}

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
