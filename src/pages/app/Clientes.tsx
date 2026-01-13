import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Plus, Search, Pencil, Trash2, MessageCircle, 
  Receipt, Download, Upload, Calendar, Filter, Phone,
  ChevronLeft, ChevronRight, FileSpreadsheet, FileText, UserCheck, Send,
  MoreHorizontal,
  Mail,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown_menu';
import { useCustomers, CustomerWithRelations, FullCustomerInsert } from '@/hooks/useCustomers';
import { useCustomerCharges } from '@/hooks/useCustomerCharges';
import { useChargeSchedules } from '@/hooks/useChargeSchedules';
import { CustomerModal } from '@/components/customers/CustomerModal';
import { CustomerDetailsDrawer } from '@/components/customers/CustomerDetailsDrawer';
import { CustomerChargeModal } from '@/components/customers/CustomerChargeModal';
import { ImportCustomersModal } from '@/components/customers/ImportCustomersModal';
import { SendMessageModal } from '@/components/customers/SendMessageModal';
import { useTenant } from '@/contexts/TenantContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { format, isToday, isBefore, addDays, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';
import { useExport, ExportColumn } from '@/hooks/useExport';
import { useCustomerApproval } from '@/hooks/useCustomerApproval';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'active' | 'inactive' | 'pending' | 'expired' | 'today' | 'upcoming';

const ITEMS_PER_PAGE = 10;

const Clientes: React.FC = () => {
  const { currentTenant } = useTenant();
  const { 
    customers, 
    isLoading, 
    planNames, 
    deleteCustomer, 
    createCustomer, 
    updateCustomer 
  } = useCustomers();
  const { charges } = useCustomerCharges();
  const { getCustomerScheduleStatus } = useChargeSchedules();
  const { exportToExcel, exportToCSV, exportToPDF } = useExport();
  const { approveCustomer } = useCustomerApproval();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerWithRelations | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithRelations | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithRelations | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [chargeCustomer, setChargeCustomer] = useState<CustomerWithRelations | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);

  if (currentTenant && !['master', 'adm', 'revenda'].includes(currentTenant.type)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const getCustomerPendingCharges = (customerId: string) => {
    return charges.filter(c => c.customer_id === customerId && c.status === 'pending');
  };

  const getCustomerStatus = (customer: CustomerWithRelations) => {
    if (customer.status === 'pending') return 'pending';
    if (customer.status === 'inactive') return 'inactive';
    
    const allItems = customer.customer_items || [];
    const activeItems = allItems.filter(i => i.status === 'active');
    const expiredItems = allItems.filter(i => i.status === 'expired');
    const pendingCharges = getCustomerPendingCharges(customer.id);
    
    // Se tem items expirados e nenhum ativo, está vencido
    if (expiredItems.length > 0 && activeItems.length === 0) return 'expired';
    
    // Se não tem nenhum item, o cliente está inativo
    if (allItems.length === 0) return 'inactive';
    
    // Se não tem itens ativos, o cliente está inativo
    if (activeItems.length === 0) return 'inactive';
    
    const today = startOfDay(new Date());
    
    // 1. Verificar cobranças pendentes (prioridade para vencimento)
    for (const charge of pendingCharges) {
      const dueDate = startOfDay(new Date(charge.due_date));
      if (isBefore(dueDate, today)) return 'expired';
      if (isToday(dueDate)) return 'today';
    }
    
    // 2. Verificar vencimento dos itens ativos
    for (const item of activeItems) {
      if (item.due_date) {
        const dueDate = startOfDay(new Date(item.due_date));
        if (isBefore(dueDate, today)) return 'expired';
        if (isToday(dueDate)) return 'today';
      }
    }

    // 3. Verificar próximos vencimentos (próximos 7 dias)
    for (const charge of pendingCharges) {
      const dueDate = startOfDay(new Date(charge.due_date));
      if (isAfter(dueDate, today) && isBefore(dueDate, addDays(today, 7))) return 'upcoming';
    }
    
    for (const item of activeItems) {
      if (item.due_date) {
        const dueDate = startOfDay(new Date(item.due_date));
        if (isAfter(dueDate, today) && isBefore(dueDate, addDays(today, 7))) return 'upcoming';
      }
    }
    
    return 'active';
  };

  const filteredCustomers = useMemo(() => {
    const filtered = customers.filter(customer => {
      // Garantir que apenas clientes reais (não revendas) apareçam nesta lista
      // Revendas devem ser gerenciadas em /app/gestao-revendas
      if (customer.notes?.includes('Cadastro revenda via link')) return false;
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        customer.full_name.toLowerCase().includes(searchLower) ||
        customer.whatsapp.includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
      if (statusFilter !== 'all') {
        const status = getCustomerStatus(customer);
        if (statusFilter !== status) return false;
      }
      if (planFilter !== 'all') {
        const hasMatchingPlan = customer.customer_items?.some(
          item => item.plan_name === planFilter || item.product_name === planFilter
        );
        if (!hasMatchingPlan) return false;
      }
      return true;
    });

    // Ordenar: Aguardando (pending) → Vencidos (expired) → Inativos (inactive) → Ativos (active) por vencimento
    const statusOrder: Record<string, number> = {
      pending: 0,
      expired: 1,
      today: 2,
      inactive: 3,
      upcoming: 4,
      active: 5,
    };

    return filtered.sort((a, b) => {
      const statusA = getCustomerStatus(a);
      const statusB = getCustomerStatus(b);
      
      // Primeiro ordenar por status
      const orderDiff = statusOrder[statusA] - statusOrder[statusB];
      if (orderDiff !== 0) return orderDiff;
      
      // Depois ordenar por data de vencimento (mais próximo primeiro)
      const dueDateA = a.customer_items?.[0]?.due_date;
      const dueDateB = b.customer_items?.[0]?.due_date;
      
      if (dueDateA && dueDateB) {
        return new Date(dueDateA).getTime() - new Date(dueDateB).getTime();
      }
      if (dueDateA) return -1;
      if (dueDateB) return 1;
      
      return 0;
    });
  }, [customers, searchTerm, statusFilter, planFilter, charges]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      active: { label: 'Ativo', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
      inactive: { label: 'Inativo', className: 'bg-muted text-muted-foreground border_transparent' },
      pending: { label: 'Pendente', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
      expired: { label: 'Vencido', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
      today: { label: 'Vence Hoje', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate_pulse' },
      upcoming: { label: 'Próximo', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    };
    const config = variants[status] || variants.inactive;
    return (
      <Badge variant="outline" className={cn("px-2 py-0.5 rounded-lg font-bold text-[10px] uppercase tracking-wider", config.className)}>
        {config.label}
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <div className="page-container space-y-8">
      <PageHeader
        title="Clientes"
        description="Gerencie sua base de clientes e assinaturas."
        icon={Users}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsImportModalOpen(true)}
              className="rounded-xl border-primary/20 text-primary hover:bg-primary/5 font-bold"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button 
              onClick={() => {
                navigate('/app/clientes/novo');
              }}
              className="rounded-xl bg-primary shadow-lg shadow-primary/20 font-bold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        }
      />

      {/* Filters Section */}
      <div className="premium-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome, WhatsApp ou e-mail..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-12 bg-secondary/30 border-transparent focus:bg-background focus:border-primary/20 rounded-xl"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-12 bg-secondary/30 border-transparent rounded-xl font-medium">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="expired">Vencidos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="h-12 bg-secondary/30 border-transparent rounded-xl font-medium">
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todos os Planos</SelectItem>
              {planNames.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Section */}
      <div className="premium-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : paginatedCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="font-bold text-xs uppercase tracking-widest py-5 px-6">Cliente</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-widest py-5">Status</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-widest py-5">Plano / Produto</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-widest py-5">Vencimento</TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase tracking-widest py-5 px-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map((customer) => {
                  const status = getCustomerStatus(customer);
                  const mainItem = customer.customer_items?.[0];
                  return (
                    <TableRow 
                      key={customer.id} 
                      className="group hover:bg-secondary/20 cursor-pointer transition-colors border-border/50"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setIsDrawerOpen(true);
                      }}
                    >
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 border-2 border-background shadow-sm group-hover:scale-110 transition-transform">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {getInitials(customer.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">{customer.full_name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium mt-0.5">
                              <Phone className="w-3 h-3" />
                              {customer.whatsapp}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {getStatusBadge(status)}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{mainItem?.plan_name || mainItem?.product_name || 'Nenhum'}</span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {mainItem?.price ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mainItem.price) : '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {mainItem?.due_date ? format(new Date(mainItem.due_date), 'dd/MM/yyyy') : '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary">
                              <MoreHorizontal className="w-5 h-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl shadow-2xl border-border/50">
                            <DropdownMenuItem onClick={() => {
                              setEditingCustomer(customer);
                              setIsModalOpen(true);
                            }} className="h-10 rounded-lg cursor-pointer">
                              <Pencil className="mr-2 h-4 w-4 text-primary" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setChargeCustomer(customer);
                            }} className="h-10 rounded-lg cursor-pointer">
                              <Receipt className="mr-2 h-4 w-4 text-primary" />
                              Nova Cobrança
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem onClick={() => {
                              setSelectedCustomer(customer);
                              setIsSendMessageOpen(true);
                            }} className="h-10 rounded-lg cursor-pointer">
                              <MessageCircle className="mr-2 h-4 w-4 text-emerald-500" />
                              WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem onClick={() => setDeletingCustomer(customer)} className="h-10 rounded-lg cursor-pointer text-destructive focus:bg-destructive/5 focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState 
            title="Nenhum cliente encontrado" 
            description="Tente ajustar seus filtros ou cadastre um novo cliente."
            icon={Users}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-border/50 flex items-center justify-between bg-secondary/10">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="rounded-xl h-9 px-4 font-bold"
              >
                Anterior
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="rounded-xl h-9 px-4 font-bold"
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Drawers */}
      {isModalOpen && (
        <CustomerModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          customer={editingCustomer}
          onSubmit={(data) => {
            if (editingCustomer) {
              updateCustomer.mutate({ ...data, id: editingCustomer.id });
            } else {
              createCustomer.mutate(data);
            }
            setIsModalOpen(false);
            setEditingCustomer(null);
          }}
          isLoading={createCustomer.isPending || updateCustomer.isPending}
        />
      )}

      {isDrawerOpen && selectedCustomer && (
        <CustomerDetailsDrawer
          open={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
          customer={selectedCustomer}
          onUpdate={(data) => {
            updateCustomer.mutate(data);
          }}
          onToggleStatus={(id, active) => {
            updateCustomer.mutate({ id, status: active ? 'active' : 'inactive' } as any);
          }}
          isUpdating={updateCustomer.isPending}
        />
      )}

      {isImportModalOpen && (
        <ImportCustomersModal
          open={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
          onImport={async (data) => {
            for (const customer of data) {
              await createCustomer.mutateAsync(customer);
            }
            setIsImportModalOpen(false);
          }}
        />
      )}

      {isSendMessageOpen && selectedCustomer && (
        <SendMessageModal
          open={isSendMessageOpen}
          onOpenChange={setIsSendMessageOpen}
          customer={selectedCustomer}
        />
      )}

      <ConfirmDialog
        open={!!deletingCustomer}
        onOpenChange={(open) => !open && setDeletingCustomer(null)}
        title="Excluir Cliente"
        description={`Tem certeza que deseja excluir o cliente ${deletingCustomer?.full_name}? Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          if (deletingCustomer) {
            deleteCustomer.mutate(deletingCustomer.id);
            setDeletingCustomer(null);
          }
        }}
        variant="destructive"
      />
    </div>
  );
};

export default Clientes;
