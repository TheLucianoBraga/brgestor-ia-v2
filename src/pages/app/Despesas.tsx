import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardLoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ExpenseModal } from '@/components/despesas/ExpenseModal';
import { ExpenseCard } from '@/components/despesas/ExpenseCard';
import { ExpenseFilters } from '@/components/despesas/ExpenseFilters';
import { ExpenseStats } from '@/components/despesas/ExpenseStats';
import { CategoryModal } from '@/components/despesas/CategoryModal';
import { CostCenterModal } from '@/components/despesas/CostCenterModal';
import { AIScanButton } from '@/components/despesas/AIScanButton';
import { useExpenses, ExpenseFilters as IExpenseFilters, ExpenseWithRelations } from '@/hooks/useExpenses';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { useExpenseCostCenters } from '@/hooks/useExpenseCostCenters';
import { Database } from '@/integrations/supabase/types';
import {
  Plus,
  Receipt,
  Tag,
  Building2,
  Trash2,
  Edit,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row'];
type ExpenseCostCenter = Database['public']['Tables']['expense_cost_centers']['Row'];

const Despesas = () => {
  usePageTitle();

  const [filters, setFilters] = useState<IExpenseFilters>({});
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [costCenterModalOpen, setCostCenterModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithRelations | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [selectedCostCenter, setSelectedCostCenter] = useState<ExpenseCostCenter | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'expense' | 'category' | 'costCenter'; id: string } | null>(null);
  const [scannedData, setScannedData] = useState<any>(null);

  const handleAIScan = (data: any) => {
    setScannedData(data);
    setSelectedExpense(null);
    setExpenseModalOpen(true);
  };

  const {
    expenses,
    isLoading,
    totals,
    deleteExpense,
    markAsPaid,
    cancelExpense,
    postponeExpense,
    reactivateExpense,
  } = useExpenses(filters);

  const {
    categories,
    isLoading: loadingCategories,
    deleteCategory,
  } = useExpenseCategories();

  const {
    costCenters,
    isLoading: loadingCostCenters,
    deleteCostCenter,
  } = useExpenseCostCenters();

  const handleEditExpense = (expense: ExpenseWithRelations) => {
    setSelectedExpense(expense);
    setExpenseModalOpen(true);
  };

  const handleDeleteExpense = (id: string) => {
    setItemToDelete({ type: 'expense', id });
    setDeleteConfirmOpen(true);
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setSelectedCategory(category);
    setCategoryModalOpen(true);
  };

  const handleDeleteCategory = (id: string) => {
    setItemToDelete({ type: 'category', id });
    setDeleteConfirmOpen(true);
  };

  const handleEditCostCenter = (costCenter: ExpenseCostCenter) => {
    setSelectedCostCenter(costCenter);
    setCostCenterModalOpen(true);
  };

  const handleDeleteCostCenter = (id: string) => {
    setItemToDelete({ type: 'costCenter', id });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'expense') {
      await deleteExpense.mutateAsync(itemToDelete.id);
    } else if (itemToDelete.type === 'category') {
      await deleteCategory.mutateAsync(itemToDelete.id);
    } else if (itemToDelete.type === 'costCenter') {
      await deleteCostCenter.mutateAsync(itemToDelete.id);
    }

    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Despesas"
        description="Gerencie as despesas do seu negócio"
        icon={Receipt}
        actions={
          <div className="flex items-center gap-2">
            <AIScanButton onScanComplete={handleAIScan} />
            <Button onClick={() => {
              setSelectedExpense(null);
              setScannedData(null);
              setExpenseModalOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Despesa
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="expenses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Despesas
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="cost-centers" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Centros de Custo
          </TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-6">
          <ExpenseStats totals={totals} />

          <div className="premium-card p-6">
            <ExpenseFilters
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i} 
                  className="h-24 rounded-xl bg-muted/30 animate-pulse border-l-4 border-muted"
                />
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Nenhuma despesa encontrada"
              description="Comece cadastrando sua primeira despesa"
              actionLabel="Nova Despesa"
              onAction={() => {
                setSelectedExpense(null);
                setExpenseModalOpen(true);
              }}
            />
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  onEdit={() => handleEditExpense(expense)}
                  onDelete={() => handleDeleteExpense(expense.id)}
                  onMarkPaid={() => markAsPaid.mutate(expense.id)}
                  onCancel={() => cancelExpense.mutate(expense.id)}
                  onPostpone={(days) => postponeExpense.mutate({ id: expense.id, days })}
                  onReactivate={() => reactivateExpense.mutate(expense.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {
              setSelectedCategory(null);
              setCategoryModalOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
          </div>

          {loadingCategories ? (
            <CardLoadingSkeleton count={3} />
          ) : categories.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="Nenhuma categoria"
              description="Crie categorias para organizar suas despesas"
              actionLabel="Nova Categoria"
              onAction={() => {
                setSelectedCategory(null);
                setCategoryModalOpen(true);
              }}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <Card key={category.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: category.color || '#6366f1' }}
                    />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditCategory(category)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Cost Centers Tab */}
        <TabsContent value="cost-centers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {
              setSelectedCostCenter(null);
              setCostCenterModalOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Centro de Custo
            </Button>
          </div>

          {loadingCostCenters ? (
            <CardLoadingSkeleton count={3} />
          ) : costCenters.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nenhum centro de custo"
              description="Crie centros de custo para ratear suas despesas"
              actionLabel="Novo Centro de Custo"
              onAction={() => {
                setSelectedCostCenter(null);
                setCostCenterModalOpen(true);
              }}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {costCenters.map((costCenter) => (
                <Card key={costCenter.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{costCenter.name}</h3>
                      {costCenter.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {costCenter.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditCostCenter(costCenter)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCostCenter(costCenter.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <ExpenseModal
        open={expenseModalOpen}
        onOpenChange={(open) => {
          setExpenseModalOpen(open);
          if (!open) {
            setSelectedExpense(null);
            setScannedData(null);
          }
        }}
        expense={selectedExpense}
        scannedData={scannedData}
      />

      <CategoryModal
        open={categoryModalOpen}
        onOpenChange={(open) => {
          setCategoryModalOpen(open);
          if (!open) setSelectedCategory(null);
        }}
        category={selectedCategory}
      />

      <CostCenterModal
        open={costCenterModalOpen}
        onOpenChange={(open) => {
          setCostCenterModalOpen(open);
          if (!open) setSelectedCostCenter(null);
        }}
        costCenter={selectedCostCenter}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Confirmar exclusão"
        description="Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteExpense.isPending || deleteCategory.isPending || deleteCostCenter.isPending}
      />
    </div>
  );
};

export default Despesas;
