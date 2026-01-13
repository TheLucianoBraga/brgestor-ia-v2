import React, { useState } from 'react';
import { Receipt, Plus, Search, MoreHorizontal, Pencil, Trash2, Check, X, ExternalLink, Copy } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ChargeModal, CustomerChargeInsert } from '@/components/cobrancas/ChargeModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown_menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCustomerCharges, CustomerCharge } from '@/hooks/useCustomerCharges';
import { useCustomers, CustomerWithRelations } from '@/hooks/useCustomers';
import { useTenant } from '@/contexts/TenantContext';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-postgres';

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
};

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  paid: 'default',
  overdue: 'destructive',
  cancelled: 'outline',
};

interface CustomerChargeWithCustomer extends CustomerCharge {
  customer?: CustomerWithRelations;
}

const Cobrancas: React.FC = () => {
  const { currentTenant } = useTenant();
  const {
    charges,
    isLoading: chargesLoading,
    createCharge,
    markAsPaid,
    cancelCharge,
    refetch,
  } = useCustomerCharges();
  const { customers, isLoading: customersLoading } = useCustomers();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<CustomerCharge | null>(null);
  const [deletingCharge, setDeletingCharge] = useState<CustomerCharge | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLoading = chargesLoading || customersLoading;

  // Route guard - only master, adm, revenda
  if (currentTenant && !['master', 'adm', 'revenda'].includes(currentTenant.type)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  // Enrich charges with customer data
  const enrichedCharges: CustomerChargeWithCustomer[] = charges.map(charge => ({
    ...charge,
    customer: customers.find(c => c.id === charge.customer_id),
  }));

  const filteredCharges = enrichedCharges.filter(charge => {
    const customerName = charge.customer?.full_name || '';
    const matchesSearch = 
      charge.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || charge.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate metrics
  const metrics = {
    total: charges.length,
    pending: charges.filter(c => c.status === 'pending').length,
    paid: charges.filter(c => c.status === 'paid').length,
    paidAmount: charges.filter(c => c.status === 'paid').reduce((acc, c) => acc + Number(c.amount), 0),
  };

  const handleCreate = () => {
    setEditingCharge(null);
    setIsModalOpen(true);
  };

  const handleEdit = (charge: CustomerCharge) => {
    setEditingCharge(charge);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: CustomerChargeInsert) => {
    if (editingCharge && currentTenant) {
      // Update existing charge
      const { error } = await supabase
        .from('customer_charges')
        .update({
          description: data.description,
          amount: data.amount,
          due_date: data.due_date,
        })
        .eq('id', editingCharge.id)
        .eq('tenant_id', currentTenant.id); // 🔒 SEGURANÇA: Validar que pertence ao tenant

      if (error) {
        toast.error('Erro ao atualizar cobrança');
        return;
      }
      toast.success('Cobrança atualizada!');
      refetch();
      setIsModalOpen(false);
    } else {
      // Create new charge
      createCharge.mutate(
        {
          customer_id: data.customer_id,
          description: data.description,
          amount: data.amount,
          due_date: data.due_date,
        },
        {
          onSuccess: (newCharge) => {
            setIsModalOpen(false);
            
            // If generate invoice is enabled, copy the invoice link
            if (data.generate_invoice && newCharge) {
              const invoiceUrl = `${window.location.origin}/fatura/${newCharge.id}`;
              navigator.clipboard.writeText(invoiceUrl);
              toast.success('Cobrança criada! Link da fatura copiado para a área de transferência.');
            }
          },
        }
      );
    }
  };

  const handleMarkAsPaid = (charge: CustomerCharge) => {
    markAsPaid.mutate(charge.id);
  };

  const handleCancel = (charge: CustomerCharge) => {
    cancelCharge.mutate(charge.id);
  };

  const handleDelete = (charge: CustomerCharge) => {
    setDeletingCharge(charge);
  };

  const confirmDelete = async () => {
    if (deletingCharge && currentTenant) {
      setIsDeleting(true);
      const { error } = await supabase
        .from('customer_charges')
        .delete()
        .eq('id', deletingCharge.id)
        .eq('tenant_id', currentTenant.id); // 🔒 SEGURANÇA: Validar que pertence ao tenant

      if (error) {
        toast.error('Erro ao excluir cobrança');
      } else {
        toast.success('Cobrança excluída!');
        refetch();
      }
      setIsDeleting(false);
      setDeletingCharge(null);
    }
  };

  const copyInvoiceLink = (chargeId: string) => {
    const invoiceUrl = `${window.location.origin}/fatura/${chargeId}`;
    navigator.clipboard.writeText(invoiceUrl);
    toast.success('Link da fatura copiado!');
  };

  const openInvoice = (chargeId: string) => {
    window.open(`/fatura/${chargeId}`, '_blank');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <LoadingSkeleton variant="card" count={4} />
      </div>
    );
  }

  return (
    <div className="page-container space-y-4 sm:space-y-6">
      <PageHeader
        title="Cobranças"
        description="Gerencie as cobranças dos seus clientes"
        icon={Receipt}
        actions={
          <Button onClick={handleCreate} className="btn-gradient-primary h-8 sm:h-10 text-xs sm:text-sm px-2 sm:px-4">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="ml-1 sm:ml-2">Nova</span>
          </Button>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-4 pt-7">
            <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
            <p className="text-lg sm:text-2xl font-bold">{metrics.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 pt-7">
            <p className="text-xs sm:text-sm text-muted-foreground">Pendentes</p>
            <p className="text-lg sm:text-2xl font-bold text-yellow-500">{metrics.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Pagas</p>
            <p className="text-lg sm:text-2xl font-bold text-green-500">{metrics.paid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Recebido</p>
            <p className="text-lg sm:text-2xl font-bold truncate">{formatCurrency(metrics.paidAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {charges.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhuma cobrança cadastrada"
          description="Crie cobranças para seus clientes."
          actionLabel="Criar Cobrança"
          onAction={handleCreate}
        />
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 sm:h-10 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[130px] h-8 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table with mobile scroll */}
          <div className="mobile-table-wrapper rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCharges.map((charge) => (
                  <TableRow key={charge.id}>
                    <TableCell className="font-medium">
                      {charge.customer?.full_name || 'Cliente removido'}
                    </TableCell>
                    <TableCell>{charge.description}</TableCell>
                    <TableCell>{formatCurrency(charge.amount)}</TableCell>
                    <TableCell>
                      {format(new Date(charge.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[charge.status] || 'secondary'}>
                        {statusLabels[charge.status] || charge.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => copyInvoiceLink(charge.id)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Link da Fatura
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openInvoice(charge.id)}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Abrir Fatura
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {charge.status === 'pending' && (
                            <>
                              <DropdownMenuItem onClick={() => handleMarkAsPaid(charge)}>
                                <Check className="w-4 h-4 mr-2" />
                                Marcar como Pago
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(charge)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCancel(charge)}>
                                <X className="w-4 h-4 mr-2" />
                                Cancelar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDelete(charge)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <ChargeModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        charge={editingCharge}
        customers={customers}
        onSubmit={handleSubmit}
        isLoading={createCharge.isPending}
      />

      <ConfirmDialog
        open={!!deletingCharge}
        onOpenChange={(open) => !open && setDeletingCharge(null)}
        title="Excluir Cobrança"
        description={`Tem certeza que deseja excluir esta cobrança? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Cobrancas;

