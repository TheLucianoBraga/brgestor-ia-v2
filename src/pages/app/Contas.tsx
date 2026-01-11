import React, { useState, useMemo } from 'react';
import { Building2, Plus, Search, Filter, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useChildTenants, ChildTenant } from '@/hooks/useChildTenants';
import { useTenant } from '@/contexts/TenantContext';
import { TenantCard } from '@/components/contas/TenantCard';
import { CreateTenantModal } from '@/components/contas/CreateTenantModal';
import { TenantDetailsDrawer } from '@/components/contas/TenantDetailsDrawer';
import { toast } from 'sonner';

const TYPE_OPTIONS = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'adm', label: 'Administradora' },
  { value: 'revenda', label: 'Revenda' },
  { value: 'cliente', label: 'Cliente' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'active', label: 'Ativos' },
  { value: 'suspended', label: 'Suspensos' },
];

const Contas: React.FC = () => {
  const { currentTenant } = useTenant();
  const {
    children,
    isLoading,
    updateStatus,
    resendInvite,
    getAllowedTypes,
    refetch,
  } = useChildTenants();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  const [selectedTenant, setSelectedTenant] = useState<ChildTenant | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const allowedTypes = getAllowedTypes();
  const canCreate = allowedTypes.length > 0;

  // Filter children
  const filteredChildren = useMemo(() => {
    return children.filter((child) => {
      const matchesSearch = 
        child.name.toLowerCase().includes(search.toLowerCase()) ||
        child.owner?.name?.toLowerCase().includes(search.toLowerCase()) ||
        child.owner?.email?.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || child.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || child.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [children, search, typeFilter, statusFilter]);

  const handleViewDetails = (tenant: ChildTenant) => {
    setSelectedTenant(tenant);
    setDetailsDrawerOpen(true);
  };

  const handleToggleStatus = (tenant: ChildTenant) => {
    setSelectedTenant(tenant);
    setConfirmDialogOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedTenant) return;

    setIsUpdating(true);
    const newStatus = selectedTenant.status === 'active' ? 'suspended' : 'active';
    const result = await updateStatus(selectedTenant.id, newStatus);
    setIsUpdating(false);

    if (result.success) {
      toast.success(
        newStatus === 'active' 
          ? 'Conta ativada com sucesso!' 
          : 'Conta suspensa com sucesso!'
      );
      setConfirmDialogOpen(false);
    } else {
      toast.error(result.error || 'Erro ao alterar status');
    }
  };

  const handleResendInvite = async (tenant: ChildTenant) => {
    if (!tenant.owner?.email) {
      toast.error('Email do responsável não disponível');
      return;
    }

    const result = await resendInvite(tenant.id, tenant.owner.email);
    
    if (result.success) {
      if (result.emailSent) {
        toast.success('Convite reenviado com sucesso!');
      } else {
        // Copy link to clipboard
        if (result.accessLink) {
          await navigator.clipboard.writeText(result.accessLink);
          toast.success('Link copiado! Envio de email não disponível.');
        }
      }
    } else {
      toast.error(result.error || 'Erro ao reenviar convite');
    }
  };

  const handleCreateSuccess = () => {
    refetch();
  };

  if (!currentTenant) {
    return (
      <div className="page-container flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Títulos dinâmicos baseados no tipo de tenant
  const getPageInfo = () => {
    switch (currentTenant.type) {
      case 'master':
        return { title: 'Organizações', description: 'Gerencie todas as organizações do sistema' };
      case 'adm':
        return { title: 'Revendas', description: 'Gerencie as revendas vinculadas' };
      case 'revenda':
        return { title: 'Clientes', description: 'Gerencie os clientes da sua revenda' };
      default:
        return { title: 'Organizações', description: 'Gerencie as organizações vinculadas' };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <div className="page-container">
      <PageHeader
        title={pageInfo.title}
        description={pageInfo.description}
        icon={Building2}
        actions={
          canCreate && (
            <Button onClick={() => setCreateModalOpen(true)} className="btn-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, responsável ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredChildren.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={children.length === 0 ? 'Nenhuma conta cadastrada' : 'Nenhuma conta encontrada'}
          description={
            children.length === 0
              ? 'Crie sua primeira conta filha para começar a gerenciar.'
              : 'Tente ajustar os filtros para encontrar o que procura.'
          }
          actionLabel={canCreate && children.length === 0 ? 'Criar Conta' : undefined}
          onAction={canCreate && children.length === 0 ? () => setCreateModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredChildren.map((tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              onViewDetails={handleViewDetails}
              onToggleStatus={handleToggleStatus}
              onResendInvite={handleResendInvite}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateTenantModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        allowedTypes={allowedTypes}
        onSuccess={handleCreateSuccess}
      />

      {/* Details Drawer */}
      <TenantDetailsDrawer
        open={detailsDrawerOpen}
        onOpenChange={setDetailsDrawerOpen}
        tenant={selectedTenant}
      />

      {/* Confirm Status Change */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title={selectedTenant?.status === 'active' ? 'Suspender Conta' : 'Ativar Conta'}
        description={
          selectedTenant?.status === 'active'
            ? `Tem certeza que deseja suspender a conta "${selectedTenant?.name}"? Os usuários não poderão acessar enquanto estiver suspensa.`
            : `Tem certeza que deseja ativar a conta "${selectedTenant?.name}"?`
        }
        confirmLabel={selectedTenant?.status === 'active' ? 'Suspender' : 'Ativar'}
        variant={selectedTenant?.status === 'active' ? 'destructive' : 'default'}
        onConfirm={handleConfirmStatusChange}
        isLoading={isUpdating}
      />
    </div>
  );
};

export default Contas;
