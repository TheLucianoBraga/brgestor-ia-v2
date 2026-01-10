import React, { useState, useMemo } from 'react';
import { Package, Plus, Loader2, DollarSign } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePlans, PlanWithPrice } from '@/hooks/usePlans';
import { useTenant } from '@/contexts/TenantContext';
import { PlanCard } from '@/components/planos/PlanCard';
import { PlanModal } from '@/components/planos/PlanModal';
import { PricingTable } from '@/components/planos/PricingTable';
import { toast } from 'sonner';

const Planos: React.FC = () => {
  const { currentTenant } = useTenant();
  const {
    plans,
    isLoading,
    createPlan,
    updatePlan,
    deletePlan,
    upsertPrice,
    getPlanFeatures,
    isMaster,
    isAdm,
  } = usePlans();

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanWithPrice | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter plans by type
  const admPlans = useMemo(() => plans.filter((p) => p.plan_type === 'adm'), [plans]);
  const revendaPlans = useMemo(() => plans.filter((p) => p.plan_type === 'revenda'), [plans]);

  // Get features only when needed (not during render)
  const getInitialFeatures = () => {
    if (!selectedPlan) return [];
    return getPlanFeatures(selectedPlan.id);
  };

  const handleCreate = () => {
    setSelectedPlan(null);
    setPlanModalOpen(true);
  };

  const handleEdit = (plan: PlanWithPrice) => {
    setSelectedPlan(plan);
    setPlanModalOpen(true);
  };

  const handleDelete = (plan: PlanWithPrice) => {
    setSelectedPlan(plan);
    setDeleteDialogOpen(true);
  };

  const handleToggleActive = async (plan: PlanWithPrice) => {
    const result = await updatePlan(plan.id, { active: !plan.active });
    if (result.success) {
      toast.success(plan.active ? 'Plano desativado!' : 'Plano ativado!');
    } else {
      toast.error(result.error || 'Erro ao alterar status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedPlan) return;
    setIsDeleting(true);
    const result = await deletePlan(selectedPlan.id);
    setIsDeleting(false);
    
    if (result.success) {
      toast.success('Plano excluído!');
      setDeleteDialogOpen(false);
    } else {
      toast.error(result.error || 'Erro ao excluir plano');
    }
  };

  const handleSubmit = async (data: any, features: any[]) => {
    if (selectedPlan) {
      return await updatePlan(selectedPlan.id, data, features);
    }
    return await createPlan(data, features);
  };

  // Only master and adm can access Planos
  const canAccessPlanos = isMaster || isAdm;

  if (!currentTenant) {
    return (
      <div className="page-container flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccessPlanos) {
    return <Navigate to="/app/dashboard" replace />;
  }

  // MASTER view: Full CRUD with tabs
  if (isMaster) {
    return (
      <div className="page-container">
        <PageHeader
          title="Planos"
          description="Gerencie os planos disponíveis para venda"
          icon={Package}
          actions={
            <Button onClick={handleCreate} className="btn-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Novo Plano
            </Button>
          }
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum plano cadastrado"
            description="Crie seu primeiro plano para começar a vender."
            actionLabel="Criar Plano"
            onAction={handleCreate}
          />
        ) : (
          <Tabs defaultValue="adm" className="w-full">
            <TabsList>
              <TabsTrigger value="adm">Planos ADM ({admPlans.length})</TabsTrigger>
              <TabsTrigger value="revenda">Planos Revenda ({revendaPlans.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="adm" className="mt-6">
              {admPlans.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Nenhum plano ADM"
                  description="Crie um plano para administradoras."
                  actionLabel="Criar Plano ADM"
                  onAction={handleCreate}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {admPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      showActions
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="revenda" className="mt-6">
              {revendaPlans.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Nenhum plano Revenda"
                  description="Crie um plano para revendas."
                  actionLabel="Criar Plano Revenda"
                  onAction={handleCreate}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {revendaPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      showActions
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {planModalOpen && (
          <PlanModal
            open={planModalOpen}
            onOpenChange={setPlanModalOpen}
            plan={selectedPlan}
            initialFeatures={getInitialFeatures()}
            onSubmit={handleSubmit}
          />
        )}

        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Excluir Plano"
          description={`Tem certeza que deseja excluir o plano "${selectedPlan?.name}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          variant="destructive"
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
        />
      </div>
    );
  }

  // ADM view: Pricing table for revenda plans
  if (isAdm) {
    return (
      <div className="page-container">
        <PageHeader
          title="Precificação Revenda"
          description="Configure os preços dos planos para suas revendas"
          icon={DollarSign}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <PricingTable plans={plans} onSavePrice={upsertPrice} />
        )}
      </div>
    );
  }

  // Default view (shouldn't reach here due to guard above)
  return <Navigate to="/app/dashboard" replace />;
};

export default Planos;