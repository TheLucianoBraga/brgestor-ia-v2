import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Filter,
  ArrowRight,
  Calendar,
  Clock,
  UserPlus
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { usePendingCustomers } from '@/hooks/usePendingCustomers';
import { useCustomerApproval } from '@/hooks/useCustomerApproval';
import { useChildTenants } from '@/hooks/useChildTenants';
import { useTenant } from '@/contexts/TenantContext';
import { useRevendaTrialNotifications } from '@/hooks/useRevendaTrialNotifications';
import { toast } from 'sonner';
import { AIInsightsCard } from '@/components/dashboard/AIInsightsCard';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  onClick?: () => void;
  isLoading?: boolean;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  trend = 'neutral', 
  icon: Icon, 
  onClick,
  isLoading,
  color = "primary"
}) => {
  return (
    <Card 
      className={cn(
        "premium-card group animate-slide-up",
        onClick && "cursor-pointer active:scale-95"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg shadow-primary/5",
                color === "primary" ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-500"
              )}>
                <Icon className="w-6 h-6" />
              </div>
              {change && (
                <Badge variant="secondary" className={cn(
                  "px-2 py-1 rounded-lg border-none font-bold text-[10px]",
                  trend === 'up' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                )}>
                  {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1 inline" /> : <ArrowDownRight className="w-3 h-3 mr-1 inline" />}
                  {change}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{title}</p>
              <h3 className="text-2xl font-extrabold tracking-tight">{value}</h3>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { metrics, isLoading, revenueChange } = useDashboardMetrics();
  const { pendingCustomers, pendingCount, isLoading: loadingPending, refetch: refetchPending } = usePendingCustomers();
  const { approveCustomer } = useCustomerApproval();
  const { currentTenant } = useTenant();
  
  useRevendaTrialNotifications();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const stats = [
    {
      title: 'Receita Mensal',
      value: formatCurrency(metrics?.monthlyRevenue || 0),
      change: revenueChange ? `${Math.abs(revenueChange).toFixed(1)}%` : undefined,
      trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'neutral',
      icon: DollarSign,
      color: "primary",
      onClick: () => navigate('/app/relatorios'),
    },
    {
      title: 'Clientes Ativos',
      value: metrics?.activeCustomers?.toString() || '0',
      icon: Users,
      color: "primary",
      onClick: () => navigate('/app/clientes'),
    },
    {
      title: 'Cobranças Pendentes',
      value: metrics?.pendingCharges?.toString() || '0',
      icon: CreditCard,
      color: "primary",
      onClick: () => navigate('/app/cobrancas'),
    },
    {
      title: 'Taxa de Conversão',
      value: `${(metrics?.conversionRate || 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: "emerald",
      onClick: () => navigate('/app/relatorios'),
    },
  ];

  return (
    <div className="page-container space-y-8">
      <PageHeader
        title="Dashboard"
        description="Bem-vindo de volta ao seu centro de controle."
        icon={LayoutDashboard}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/app/relatorios')}
              className="rounded-xl border-primary/20 text-primary hover:bg-primary/5 font-bold"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Relatórios
            </Button>
            <Button 
              onClick={() => navigate('/app/clientes/novo')}
              className="rounded-xl bg-primary shadow-lg shadow-primary/20 font-bold"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        }
      />

      {/* AI Insights Section */}
      {!isLoading && metrics && (
        <div className="animate-fade-in">
          <AIInsightsCard 
            metrics={{
              monthlyRevenue: metrics.monthlyRevenue || 0,
              activeCustomers: metrics.activeCustomers || 0,
              pendingCharges: metrics.pendingCharges || 0,
              conversionRate: metrics.conversionRate || 0,
            }}
            revenueChange={revenueChange}
          />
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={stat.title} {...stat} trend={stat.trend as 'up' | 'down' | 'neutral'} isLoading={isLoading} />
        ))}
      </div>

      {/* Critical Alerts & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Dívida Ativa Card */}
        <Card className="premium-card border-red-500/20 bg-red-500/[0.02] lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Dívida Ativa</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h2 className="text-3xl font-black text-red-500">{formatCurrency(metrics?.activeDebt || 0)}</h2>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  {metrics?.overdueCount || 0} cobranças vencidas aguardando pagamento.
                </p>
              </div>
              <Button 
                variant="destructive" 
                className="w-full rounded-xl font-bold shadow-lg shadow-red-500/20"
                onClick={() => navigate('/app/cobrancas?status=overdue')}
              >
                Gerenciar Cobranças
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="premium-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Aprovações Pendentes</CardTitle>
            </div>
            {pendingCount > 0 && (
              <Badge className="bg-amber-500 text-white border-none font-bold">{pendingCount}</Badge>
            )}
          </CardHeader>
          <CardContent>
            {loadingPending ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : pendingCustomers.length > 0 ? (
              <div className="space-y-3">
                {pendingCustomers.slice(0, 3).map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/50 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {customer.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{customer.full_name}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">{customer.email}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="rounded-lg h-8 px-4 font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                      onClick={() => approveCustomer.mutate(customer.id)}
                    >
                      Aprovar
                    </Button>
                  </div>
                ))}
                {pendingCount > 3 && (
                  <Button variant="ghost" className="w-full text-xs font-bold text-primary" onClick={() => navigate('/app/clientes?status=pending')}>
                    Ver todos os {pendingCount} pendentes
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-3">
                  <Activity className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-muted-foreground">Tudo em dia!</p>
                <p className="text-xs text-muted-foreground/60">Não há clientes aguardando aprovação.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
