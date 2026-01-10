import React, { useState } from 'react';
import { Package, Plus, LayoutGrid, List } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ServiceModal } from '@/components/servicos/ServiceModal';
import { ServiceCard } from '@/components/servicos/ServiceCard';
import { ServicesTable } from '@/components/servicos/ServicesTable';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { useServices, Service, ServiceInsert } from '@/hooks/useServices';
import { useTenant } from '@/contexts/TenantContext';
import { useQueryClient } from '@tanstack/react-query';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type ViewMode = 'grid' | 'table';

const Servicos: React.FC = () => {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const {
    services,
    isLoading,
    createService,
    updateService,
    toggleServiceStatus,
    deleteService,
  } = useServices();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [checkoutService, setCheckoutService] = useState<Service | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const handleCreate = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleSubmit = (data: ServiceInsert) => {
    if (editingService) {
      updateService.mutate(
        { id: editingService.id, ...data },
        { onSuccess: () => setIsModalOpen(false) }
      );
    } else {
      createService.mutate(data, {
        onSuccess: () => setIsModalOpen(false),
      });
    }
  };

  const handleToggleStatus = (service: Service) => {
    toggleServiceStatus.mutate({
      id: service.id,
      active: !service.active,
    });
  };

  const handleDelete = (service: Service) => {
    setDeletingService(service);
  };

  const confirmDelete = () => {
    if (deletingService) {
      deleteService.mutate(deletingService.id, {
        onSuccess: () => setDeletingService(null),
      });
    }
  };

  const handleSubscribe = (service: Service) => {
    setCheckoutService(service);
  };

  const handleCheckoutSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <LoadingSkeleton variant="card" count={6} />
      </div>
    );
  }

  // All tenants can manage services now
  return (
    <div className="page-container space-y-4 sm:space-y-6">
      <PageHeader
        title="Serviços"
        description="Gerencie os serviços disponíveis"
        icon={Package}
        actions={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => value && setViewMode(value as ViewMode)}
              className="border rounded-md"
            >
              <ToggleGroupItem value="grid" size="sm" className="h-8 w-8 sm:h-9 sm:w-9">
                <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" size="sm" className="h-8 w-8 sm:h-9 sm:w-9">
                <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <Button onClick={handleCreate} className="btn-gradient-primary h-8 sm:h-10 text-xs sm:text-sm px-2 sm:px-4">
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="ml-1 sm:ml-2">Novo</span>
            </Button>
          </div>
        }
      />

      {services.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum serviço cadastrado"
          description="Cadastre serviços avulsos ou adicionais para oferecer aos seus clientes."
          actionLabel="Adicionar Serviço"
          onAction={handleCreate}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              canManage
              allServices={services}
              onEdit={handleEdit}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <ServicesTable
          services={services}
          onEdit={handleEdit}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
        />
      )}

      <ServiceModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        service={editingService}
        onSubmit={handleSubmit}
        isLoading={createService.isPending || updateService.isPending}
        allServices={services}
      />

      <ConfirmDialog
        open={!!deletingService}
        onOpenChange={(open) => !open && setDeletingService(null)}
        title="Excluir Serviço"
        description={`Tem certeza que deseja excluir o serviço "${deletingService?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteService.isPending}
      />

      <CheckoutModal
        open={!!checkoutService}
        onOpenChange={(open) => !open && setCheckoutService(null)}
        service={checkoutService}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
};

export default Servicos;
