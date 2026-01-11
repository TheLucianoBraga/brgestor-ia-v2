import React, { useMemo, useState } from 'react';
import { RefreshCcw, CheckCircle, Clock, XCircle, Search, Filter, DollarSign, Users, Activity } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type Subscription = {
  id: string;
  kind: string;
  status: string;
  price: number;
  starts_at: string;
  ends_at: string | null;
  interval: string | null;
  buyer_tenant_id: string;
  seller_tenant_id: string;
  plan_id: string | null;
  service_id: string | null;
  created_at: string | null;
  cancelled_at: string | null;
};

const Assinaturas: React.FC = () => {
  const { currentTenant, isLoading: tenantLoading } = useTenant();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['subscriptions', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('seller_tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Subscription[];
    },
    enabled: !!currentTenant?.id,
  });

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const matchesSearch = sub.kind.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, search, statusFilter]);

  const metrics = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === 'active').length;
    const pending = subscriptions.filter((s) => s.status === 'pending').length;
    const cancelled = subscriptions.filter((s) => s.status === 'cancelled').length;
    const totalRevenue = subscriptions
      .filter((s) => s.status === 'active')
      .reduce((acc, s) => acc + s.price, 0);
    return { active, pending, cancelled, totalRevenue };
  }, [subscriptions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string; icon: any }> = {
      active: { label: 'Ativa', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle },
      pending: { label: 'Pendente', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Clock },
      cancelled: { label: 'Cancelada', className: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle },
    };
    const config = configs[status] || { label: status, className: '', icon: Activity };
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={cn("px-2 py-0.5 rounded-lg font-bold text-[10px] uppercase tracking-wider", config.className)}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (tenantLoading || isLoading) {
    return (
      <div className="page-container">
        <LoadingSkeleton variant="table" count={5} />
      </div>
    );
  }

  return (
    <div className="page-container space-y-8">
      <PageHeader
        title="Assinaturas"
        description="Acompanhe todas as assinaturas ativas e pendentes."
        icon={RefreshCcw}
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="premium-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ativas</p>
              <h3 className="text-2xl font-extrabold">{metrics.active}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="premium-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pendentes</p>
              <h3 className="text-2xl font-extrabold">{metrics.pending}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="premium-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Canceladas</p>
              <h3 className="text-2xl font-extrabold">{metrics.cancelled}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="premium-card bg-primary/5 border-primary/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Receita Ativa</p>
              <h3 className="text-2xl font-extrabold text-primary">{formatCurrency(metrics.totalRevenue)}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <div className="premium-card p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar assinaturas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 bg-secondary/30 border-transparent focus:bg-background focus:border-primary/20 rounded-xl"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px] h-12 bg-secondary/30 border-transparent rounded-xl font-medium">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Section */}
      <div className="premium-card overflow-hidden">
        {filteredSubscriptions.length === 0 ? (
          <EmptyState
            icon={RefreshCcw}
            title="Nenhuma assinatura encontrada"
            description="Quando clientes assinarem seus planos, elas aparecerão aqui."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="font-bold text-xs uppercase tracking-widest py-5 px-6">Tipo de Assinatura</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-widest py-5">Status</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-widest py-5">Valor Mensal</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-widest py-5">Data de Início</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-widest py-5 px-6">Vencimento / Fim</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((sub) => (
                  <TableRow key={sub.id} className="hover:bg-secondary/20 transition-colors border-border/50">
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Activity className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm">
                          {sub.kind === 'system_plan' ? 'Plano do Sistema' : 'Serviço Adicional'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">{getStatusBadge(sub.status)}</TableCell>
                    <TableCell className="py-4 font-extrabold text-sm">{formatCurrency(sub.price)}</TableCell>
                    <TableCell className="py-4 text-sm font-medium text-muted-foreground">
                      {format(new Date(sub.starts_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="py-4 px-6 text-sm font-medium text-muted-foreground">
                      {sub.ends_at
                        ? format(new Date(sub.ends_at), 'dd/MM/yyyy', { locale: ptBR })
                        : 'Renovação Automática'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Assinaturas;
