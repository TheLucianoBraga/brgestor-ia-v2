import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Search, 
  Download,
  Users,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Send,
  Eye,
  Ban
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown_menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useChildTenants } from '@/hooks/useChildTenants';
import { useTenant } from '@/contexts/TenantContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-postgres';

const CobrancaAtivos: React.FC = () => {
  const { currentTenant, isLoading: isLoadingTenant } = useTenant();
  const { children, isLoading: isLoadingChildren } = useChildTenants();

  // Apenas Master e ADM podem acessar esta página
  const isAuthorized = currentTenant?.type === 'master' || currentTenant?.type === 'adm';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch subscriptions and payments
  const { data: subscriptions = [], isLoading: isLoadingSubs } = useQuery({
    queryKey: ['active_subscriptions', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      
      const childIds = children.map(c => c.id);
      if (childIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plans(name, base_price),
          buyer_tenant:tenants!subscriptions_buyer_tenant_id_fkey(id, name, type)
        `)
        .in('buyer_tenant_id', childIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id && children.length > 0,
  });

  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['tenant_payments', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          buyer_tenant:tenants!payments_buyer_tenant_id_fkey(id, name)
        `)
        .eq('seller_tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Calculate stats
  const stats = useMemo(() => {
    const activeRevendas = children.filter(c => c.type === 'revenda' && c.status === 'active');
    const totalActive = activeRevendas.length;
    const pricePerActive = 50.00;
    const monthlyTotal = totalActive * pricePerActive;
    
    const totalRevenue = payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0);
    const pendingPayments = payments.filter(p => p.status === 'pending').length;
    const overduePayments = payments.filter(p => {
      if (p.status !== 'pending' || !p.due_date) return false;
      return differenceInDays(new Date(), new Date(p.due_date)) > 0;
    }).length;
    
    return { totalActive, totalRevenue, pendingPayments, overduePayments, monthlyTotal, pricePerActive };
  }, [children, payments]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      const tenantName = (sub.buyer_tenant as any)?.name || '';
      const matchesSearch = tenantName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, searchTerm, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">Ativo</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">Pendente</Badge>;
      case 'cancelled':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/40">Cancelado</Badge>;
      case 'paid':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">Pago</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const isLoading = isLoadingTenant || isLoadingChildren || isLoadingSubs || isLoadingPayments;

  if (isLoading) {
    return (
      <div className="page-container space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Cobrança de Ativos"
        description="Gerencie cobranças e assinaturas das revendas"
        icon={DollarSign}
        actions={
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revendas Ativas</p>
                <p className="text-2xl font-bold">{stats.totalActive}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-500/10">
                <Users className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Custo Mensal (Ativos)</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(stats.monthlyTotal)}</p>
                <p className="text-[10px] text-muted-foreground">{formatCurrency(stats.pricePerActive)} / revenda</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pagamentos Pendentes</p>
                <p className="text-2xl font-bold">{stats.pendingPayments}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-500/10">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pagamentos Atrasados</p>
                <p className="text-2xl font-bold">{stats.overduePayments}</p>
              </div>
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por revenda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subscriptions Table */}
      <Card className="bg-card border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Revenda</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubscriptions.map((sub) => {
              const tenant = sub.buyer_tenant as any;
              return (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-[10px]">{getInitials(tenant?.name || 'R')}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{tenant?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{(sub.plans as any)?.name}</TableCell>
                  <TableCell>{getStatusBadge(sub.status)}</TableCell>
                  <TableCell>
                    {sub.ends_at ? format(new Date(sub.ends_at), 'dd/MM/yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(sub.price)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar Cobrança
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Ban className="w-4 h-4 mr-2" />
                          Suspender
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredSubscriptions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma assinatura encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default CobrancaAtivos;

