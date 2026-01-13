import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Store, 
  Crown, 
  Search, 
  Plus, 
  MoreHorizontal,
  X,
  RefreshCcw,
  Key,
  UserMinus,
  Trash2,
  Edit,
  Check,
  Bell,
  PlayCircle
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useChildTenants } from '@/hooks/useChildTenants';
import { usePlans } from '@/hooks/usePlans';
import { useTenant } from '@/contexts/TenantContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-postgres';
import { ManagePlanModal } from '@/components/gestao/ManagePlanModal';
import { EditTenantModal } from '@/components/gestao/EditTenantModal';
import { ChangePasswordModal } from '@/components/gestao/ChangePasswordModal';
import { GestaoPlanoModal, GestaoPlanoData } from '@/components/gestao/GestaoPlanoModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CreateTenantModal } from '@/components/contas/CreateTenantModal';
import { toast } from 'sonner';

interface UserWithTenant {
  id: string;
  user_id: string;
  tenant_id: string;
  role_in_tenant: string;
  status: string;
  created_at: string;
  tenant: {
    id: string;
    name: string;
    type: string;
    status: string;
    trial_ends_at: string | null;
  };
  profile: {
    full_name: string | null;
    user_id: string;
  } | null;
  subscription?: {
    plan_name: string;
    ends_at: string | null;
  } | null;
}

const GestaoRevendas: React.FC = () => {
  const { currentTenant } = useTenant();
  const { children, isLoading: isLoadingChildren, refetch: refetchChildren } = useChildTenants();
  const { plans, isLoading: isLoadingPlans, refetch: refetchPlans } = usePlans();
  
  const [activeTab, setActiveTab] = useState('revendas');
  const [searchTerm, setSearchTerm] = useState('');
  const [revendaSearchTerm, setRevendaSearchTerm] = useState('');
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [revendaStatusFilter, setRevendaStatusFilter] = useState('all');
  const [adminStatusFilter, setAdminStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [managePlanModal, setManagePlanModal] = useState<{
    open: boolean;
    tenant: { id: string; name: string; type: string; trial_ends_at: string | null } | null;
  }>({ open: false, tenant: null });
  
  const [editModal, setEditModal] = useState<{
    open: boolean;
    tenant: { id: string; name: string; type: string } | null;
  }>({ open: false, tenant: null });
  
  const [passwordModal, setPasswordModal] = useState<{
    open: boolean;
    user: { user_id: string; name: string; tenant_name: string } | null;
  }>({ open: false, user: null });
  
  const [suspendDialog, setSuspendDialog] = useState<{
    open: boolean;
    tenant: { id: string; name: string } | null;
  }>({ open: false, tenant: null });
  
  const [activateDialog, setActivateDialog] = useState<{
    open: boolean;
    tenant: { id: string; name: string } | null;
  }>({ open: false, tenant: null });
  
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    tenant: { id: string; name: string } | null;
  }>({ open: false, tenant: null });

  const [planoModal, setPlanoModal] = useState<{
    open: boolean;
    planType: 'adm' | 'revenda';
    plan: GestaoPlanoData | null;
  }>({ open: false, planType: 'revenda', plan: null });

  const [createTenantModal, setCreateTenantModal] = useState(false);

  // Fetch all users from child tenants - Otimizado com Promise.all
  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['all-tenant_users', currentTenant?.id, children.length],
    queryFn: async () => {
      if (!currentTenant?.id || children.length === 0) return [];
      
      const childIds = children.map(c => c.id);
      
      // Query separadas para evitar erro de FK entre tenant_members e profiles
      const [membersResult, tenantsResult, subscriptionsResult] = await Promise.all([
        supabase
          .from('tenant_members')
          .select('user_id, tenant_id, role_in_tenant, status, created_at')
          .in('tenant_id', childIds)
          .eq('status', 'active'),
        supabase
          .from('tenants')
          .select('id, name, type, status, trial_ends_at')
          .in('id', childIds),
        supabase
          .from('subscriptions')
          .select('buyer_tenant_id, plans(name), ends_at, status')
          .in('buyer_tenant_id', childIds)
          .eq('status', 'active')
      ]);
      
      if (membersResult.error) throw membersResult.error;
      
      // Buscar profiles separadamente
      const userIds = membersResult.data?.map(m => m.user_id).filter(Boolean) || [];
      let profilesMap = new Map<string, { full_name: string | null; user_id: string }>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        
        profiles?.forEach(p => profilesMap.set(p.user_id, p));
      }
      
      // Criar maps para tenants e subscriptions
      const tenantMap = new Map();
      tenantsResult.data?.forEach(t => tenantMap.set(t.id, t));
      
      const subMap = new Map();
      subscriptionsResult.data?.forEach(sub => {
        subMap.set(sub.buyer_tenant_id, {
          plan_name: (sub.plans as any)?.name || 'Sem plano',
          ends_at: sub.ends_at
        });
      });
      
      return (membersResult.data || []).map((item: any) => ({
        id: `${item.user_id}-${item.tenant_id}`,
        user_id: item.user_id,
        tenant_id: item.tenant_id,
        role_in_tenant: item.role_in_tenant,
        status: item.status,
        created_at: item.created_at,
        tenant: tenantMap.get(item.tenant_id) || null,
        profile: profilesMap.get(item.user_id) || null,
        subscription: subMap.get(item.tenant_id) || null
      })) as UserWithTenant[];
    },
    enabled: !!currentTenant?.id && children.length > 0,
    staleTime: 30000, // Cache por 30 segundos
  });

  // Fetch user counts per tenant (excluding owners)
  const { data: tenantUserCounts = {} } = useQuery({
    queryKey: ['tenant-user_counts', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return {};
      
      const childIds = children.map(c => c.id);
      if (childIds.length === 0) return {};
      
      // Get all members excluding admins (owners)
      const { data, error } = await supabase
        .from('tenant_members')
        .select('tenant_id, role_in_tenant')
        .in('tenant_id', childIds)
        .eq('status', 'active');
      
      if (error) throw error;
      
      // Count users per tenant (excluding admin/owner)
      const counts: Record<string, number> = {};
      data?.forEach(member => {
        if (member.role_in_tenant !== 'admin' && member.role_in_tenant !== 'owner') {
          counts[member.tenant_id] = (counts[member.tenant_id] || 0) + 1;
        }
      });
      
      return counts;
    },
    enabled: !!currentTenant?.id && children.length > 0,
  });

  // Fetch real customer counts per tenant from customers table
  const { data: tenantCustomerCounts = {} } = useQuery({
    queryKey: ['tenant-customer_counts', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return {};
      
      const childIds = children.map(c => c.id);
      if (childIds.length === 0) return {};
      
      // Get customer counts per tenant
      const { data, error } = await supabase
        .from('customers')
        .select('tenant_id')
        .in('tenant_id', childIds);
      
      if (error) throw error;
      
      // Count customers per tenant
      const counts: Record<string, number> = {};
      data?.forEach(customer => {
        counts[customer.tenant_id] = (counts[customer.tenant_id] || 0) + 1;
      });
      
      return counts;
    },
    enabled: !!currentTenant?.id && children.length > 0,
  });

  // Get client counts per tenant from real customers table
  const getClientCount = (tenantId: string) => {
    return tenantCustomerCounts[tenantId] || 0;
  };

  // Get user count for a tenant (excluding owner)
  const getUserCount = (tenantId: string) => {
    return tenantUserCounts[tenantId] || 0;
  };

  // Filter revendas (type === 'revenda')
  const revendas = useMemo(() => {
    return children.filter(c => c.type === 'revenda');
  }, [children]);

  // Filter admins (type === 'adm')
  const admins = useMemo(() => {
    return children.filter(c => c.type === 'adm');
  }, [children]);

  // Get revenda trial status for filtering
  const getRevendaTrialStatus = (revenda: typeof revendas[0]) => {
    if (revenda.status === 'suspended') return 'suspended';
    if (!revenda.trial_ends_at) return 'active';
    const days = differenceInDays(new Date(revenda.trial_ends_at), new Date());
    if (days < 0) return 'expired';
    if (days <= 3) return 'trial_critical';
    return 'trial';
  };

  // Filtered revendas based on search and status filter
  const filteredRevendas = useMemo(() => {
    return revendas.filter(revenda => {
      const matchesSearch = revenda.name.toLowerCase().includes(revendaSearchTerm.toLowerCase());
      
      if (revendaStatusFilter === 'all') return matchesSearch;
      
      const trialStatus = getRevendaTrialStatus(revenda);
      
      switch (revendaStatusFilter) {
        case 'active':
          return matchesSearch && revenda.status === 'active' && !revenda.trial_ends_at;
        case 'suspended':
          return matchesSearch && revenda.status === 'suspended';
        case 'trial':
          return matchesSearch && revenda.trial_ends_at && differenceInDays(new Date(revenda.trial_ends_at), new Date()) >= 0;
        case 'trial_critical':
          return matchesSearch && revenda.trial_ends_at && 
            differenceInDays(new Date(revenda.trial_ends_at), new Date()) >= 0 &&
            differenceInDays(new Date(revenda.trial_ends_at), new Date()) <= 3;
        case 'expired':
          return matchesSearch && revenda.trial_ends_at && differenceInDays(new Date(revenda.trial_ends_at), new Date()) < 0;
        default:
          return matchesSearch;
      }
    });
  }, [revendas, revendaSearchTerm, revendaStatusFilter]);

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      const matchesSearch = 
        user.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.tenant.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || 
        (roleFilter === 'revenda' && user.tenant.type === 'revenda') ||
        (roleFilter === 'usuario' && user.tenant.type !== 'revenda');
      
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [allUsers, searchTerm, roleFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = allUsers.length;
    const pending = allUsers.filter(u => u.status === 'pending').length;
    const approved = allUsers.filter(u => u.status === 'active').length;
    const withPlan = allUsers.filter(u => u.subscription).length;
    
    return { total, pending, approved, withPlan };
  }, [allUsers]);

  const revendaStats = useMemo(() => {
    const total = revendas.length;
    const active = revendas.filter(r => r.status === 'active').length;
    const suspended = revendas.filter(r => r.status === 'suspended').length;
    const inTrial = revendas.filter(r => {
      if (!r.trial_ends_at) return false;
      return differenceInDays(new Date(r.trial_ends_at), new Date()) >= 0;
    }).length;
    const trialCritical = revendas.filter(r => {
      if (!r.trial_ends_at) return false;
      const days = differenceInDays(new Date(r.trial_ends_at), new Date());
      return days >= 0 && days <= 3;
    }).length;
    const expired = revendas.filter(r => {
      if (!r.trial_ends_at) return false;
      return differenceInDays(new Date(r.trial_ends_at), new Date()) < 0;
    }).length;
    
    return { total, active, suspended, inTrial, trialCritical, expired };
  }, [revendas]);

  // Admin stats
  const adminStats = useMemo(() => {
    const total = admins.length;
    const active = admins.filter(r => r.status === 'active').length;
    const suspended = admins.filter(r => r.status === 'suspended').length;
    const inTrial = admins.filter(r => {
      if (!r.trial_ends_at) return false;
      return differenceInDays(new Date(r.trial_ends_at), new Date()) >= 0;
    }).length;
    const trialCritical = admins.filter(r => {
      if (!r.trial_ends_at) return false;
      const days = differenceInDays(new Date(r.trial_ends_at), new Date());
      return days >= 0 && days <= 3;
    }).length;
    const expired = admins.filter(r => {
      if (!r.trial_ends_at) return false;
      return differenceInDays(new Date(r.trial_ends_at), new Date()) < 0;
    }).length;
    
    return { total, active, suspended, inTrial, trialCritical, expired };
  }, [admins]);

  // Filtered admins based on search and status filter
  const filteredAdmins = useMemo(() => {
    return admins.filter(admin => {
      const matchesSearch = admin.name.toLowerCase().includes(adminSearchTerm.toLowerCase());
      
      if (adminStatusFilter === 'all') return matchesSearch;
      
      switch (adminStatusFilter) {
        case 'active':
          return matchesSearch && admin.status === 'active' && !admin.trial_ends_at;
        case 'suspended':
          return matchesSearch && admin.status === 'suspended';
        case 'trial':
          return matchesSearch && admin.trial_ends_at && differenceInDays(new Date(admin.trial_ends_at), new Date()) >= 0;
        case 'trial_critical':
          return matchesSearch && admin.trial_ends_at && 
            differenceInDays(new Date(admin.trial_ends_at), new Date()) >= 0 &&
            differenceInDays(new Date(admin.trial_ends_at), new Date()) <= 3;
        case 'expired':
          return matchesSearch && admin.trial_ends_at && differenceInDays(new Date(admin.trial_ends_at), new Date()) < 0;
        default:
          return matchesSearch;
      }
    });
  }, [admins, adminSearchTerm, adminStatusFilter]);

  // Get validity badge
  const getValidityBadge = (trialEndsAt: string | null, subscription: any) => {
    if (subscription?.ends_at) {
      const days = differenceInDays(new Date(subscription.ends_at), new Date());
      if (days < 0) {
        return <Badge variant="destructive">Expirado</Badge>;
      }
      return (
        <div className="flex flex-col items-center gap-1">
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">Ativo</Badge>
          <span className="text-xs text-muted-foreground">{format(new Date(subscription.ends_at), 'dd/MM/yyyy')}</span>
        </div>
      );
    }
    
    if (trialEndsAt) {
      const days = differenceInDays(new Date(trialEndsAt), new Date());
      if (days < 0) {
        return (
          <div className="flex flex-col items-center gap-1">
            <Badge variant="destructive">Expirado</Badge>
            <span className="text-xs text-muted-foreground">{format(new Date(trialEndsAt), 'dd/MM/yyyy')}</span>
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center gap-1">
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">{days}d restantes</Badge>
          <span className="text-xs text-muted-foreground">{format(new Date(trialEndsAt), 'dd/MM/yyyy')}</span>
        </div>
      );
    }
    
    return <Badge variant="outline">Sem plano</Badge>;
  };

  const getRoleBadge = (type: string, role: string) => {
    if (type === 'revenda') {
      return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/40">Revenda</Badge>;
    }
    if (role === 'admin' || role === 'owner') {
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">Super Admin</Badge>;
    }
    return <Badge variant="secondary">Usuário</Badge>;
  };

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const isLoading = isLoadingChildren || isLoadingUsers || isLoadingPlans;

  if (isLoading) {
    return (
      <div className="page-container space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Gestão de Usuários"
        description="Gerencie usuários, revendas e planos do sistema"
        icon={Users}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
          <TabsTrigger value="revendas" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            Revendas
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Admins
          </TabsTrigger>
          <TabsTrigger value="planos" className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Planos
          </TabsTrigger>
        </TabsList>

        {/* Admins Tab */}
        <TabsContent value="usuarios" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{adminStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border cursor-pointer hover:border-emerald-500/50 transition-colors" onClick={() => setAdminStatusFilter('active')}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Check className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{adminStats.active}</p>
                  <p className="text-xs text-muted-foreground">Ativos</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border cursor-pointer hover:border-amber-500/50 transition-colors" onClick={() => setAdminStatusFilter('trial')}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{adminStats.inTrial}</p>
                  <p className="text-xs text-muted-foreground">Em Trial</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border cursor-pointer hover:border-orange-500/50 transition-colors" onClick={() => setAdminStatusFilter('trial_critical')}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Bell className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{adminStats.trialCritical}</p>
                  <p className="text-xs text-muted-foreground">Trial Crítico</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border cursor-pointer hover:border-destructive/50 transition-colors" onClick={() => setAdminStatusFilter('suspended')}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <X className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{adminStats.suspended}</p>
                  <p className="text-xs text-muted-foreground">Suspensos</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar admins..."
                value={adminSearchTerm}
                onChange={(e) => setAdminSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={adminStatusFilter} onValueChange={setAdminStatusFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Todos status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="trial">Em Trial</SelectItem>
                <SelectItem value="trial_critical">Trial Crítico (≤3d)</SelectItem>
                <SelectItem value="expired">Trial Expirado</SelectItem>
                <SelectItem value="suspended">Suspensos</SelectItem>
              </SelectContent>
            </Select>
            <Button className="btn-gradient-primary" onClick={() => setCreateTenantModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Admin
            </Button>
          </div>

          {/* Admins Table */}
          <Card className="border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-12">
                    <Checkbox />
                  </TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((admin) => {
                  const trialStatus = getRevendaTrialStatus(admin);
                  
                  return (
                    <TableRow key={admin.id} className="border-border">
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-amber-500/20 text-amber-400 font-semibold">
                              {getInitials(admin.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">{admin.name}</span>
                            {trialStatus === 'trial_critical' && (
                              <div className="flex items-center gap-1 text-orange-500 text-xs">
                                <Bell className="w-3 h-3" />
                                Trial crítico
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {admin.status === 'suspended' ? (
                          <Badge className="bg-destructive/20 text-destructive border-destructive/40">
                            Suspenso
                          </Badge>
                        ) : trialStatus === 'expired' ? (
                          <Badge className="bg-destructive/20 text-destructive border-destructive/40">
                            Expirado
                          </Badge>
                        ) : trialStatus === 'trial_critical' ? (
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/40">
                            Trial Crítico
                          </Badge>
                        ) : trialStatus === 'trial' ? (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">
                            Em Trial
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                            Ativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {getValidityBadge(admin.trial_ends_at, admin.subscription)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full">
                          {getClientCount(admin.id)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full">
                          {getUserCount(admin.id)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setManagePlanModal({
                              open: true,
                              tenant: {
                                id: admin.id,
                                name: admin.name,
                                type: admin.type,
                                trial_ends_at: admin.trial_ends_at,
                              }
                            })}
                          >
                            <Crown className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditModal({
                                open: true,
                                tenant: { id: admin.id, name: admin.name, type: admin.type }
                              })}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setManagePlanModal({
                                open: true,
                                tenant: {
                                  id: admin.id,
                                  name: admin.name,
                                  type: admin.type,
                                  trial_ends_at: admin.trial_ends_at,
                                }
                              })}>
                                <RefreshCcw className="w-4 h-4 mr-2" />
                                Renovar Acesso
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {admin.status === 'suspended' ? (
                                <DropdownMenuItem onClick={() => setActivateDialog({
                                  open: true,
                                  tenant: { id: admin.id, name: admin.name }
                                })}>
                                  <PlayCircle className="w-4 h-4 mr-2" />
                                  Reativar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => setSuspendDialog({
                                  open: true,
                                  tenant: { id: admin.id, name: admin.name }
                                })}>
                                  <UserMinus className="w-4 h-4 mr-2" />
                                  Suspender
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeleteDialog({
                                  open: true,
                                  tenant: { id: admin.id, name: admin.name }
                                })}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Apagar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredAdmins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum admin encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Revendas Tab */}
        <TabsContent value="revendas" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{revendaStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border cursor-pointer hover:border-emerald-500/50 transition-colors" onClick={() => setRevendaStatusFilter('active')}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Check className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{revendaStats.active}</p>
                  <p className="text-xs text-muted-foreground">Ativas</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border cursor-pointer hover:border-amber-500/50 transition-colors" onClick={() => setRevendaStatusFilter('trial')}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{revendaStats.inTrial}</p>
                  <p className="text-xs text-muted-foreground">Em Trial</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border cursor-pointer hover:border-orange-500/50 transition-colors" onClick={() => setRevendaStatusFilter('trial_critical')}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Bell className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{revendaStats.trialCritical}</p>
                  <p className="text-xs text-muted-foreground">Trial Crítico</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border cursor-pointer hover:border-destructive/50 transition-colors" onClick={() => setRevendaStatusFilter('suspended')}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <X className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{revendaStats.suspended}</p>
                  <p className="text-xs text-muted-foreground">Suspensas</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar revendas..."
                value={revendaSearchTerm}
                onChange={(e) => setRevendaSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={revendaStatusFilter} onValueChange={setRevendaStatusFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Todos status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="trial">Em Trial</SelectItem>
                <SelectItem value="trial_critical">Trial Crítico (≤3d)</SelectItem>
                <SelectItem value="expired">Trial Expirado</SelectItem>
                <SelectItem value="suspended">Suspensas</SelectItem>
              </SelectContent>
            </Select>
            <Button className="btn-gradient-primary" onClick={() => setCreateTenantModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Admin
            </Button>
          </div>

          {/* Revendas Table */}
          <Card className="border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-12">
                    <Checkbox />
                  </TableHead>
                  <TableHead>Revenda</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRevendas.map((revenda) => {
                  const trialStatus = getRevendaTrialStatus(revenda);
                  
                  return (
                    <TableRow key={revenda.id} className="border-border">
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-cyan-500/20 text-cyan-400 font-semibold">
                              {getInitials(revenda.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">{revenda.name}</span>
                            {trialStatus === 'trial_critical' && (
                              <div className="flex items-center gap-1 text-orange-500 text-xs">
                                <Bell className="w-3 h-3" />
                                Trial crítico
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {revenda.status === 'suspended' ? (
                          <Badge className="bg-destructive/20 text-destructive border-destructive/40">
                            Suspensa
                          </Badge>
                        ) : trialStatus === 'expired' ? (
                          <Badge className="bg-destructive/20 text-destructive border-destructive/40">
                            Expirada
                          </Badge>
                        ) : trialStatus === 'trial_critical' ? (
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/40">
                            Trial Crítico
                          </Badge>
                        ) : trialStatus === 'trial' ? (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">
                            Em Trial
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                            Ativa
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {getValidityBadge(revenda.trial_ends_at, revenda.subscription)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full">
                          {getClientCount(revenda.id)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full">
                          {getUserCount(revenda.id)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setManagePlanModal({
                              open: true,
                              tenant: {
                                id: revenda.id,
                                name: revenda.name,
                                type: revenda.type,
                                trial_ends_at: revenda.trial_ends_at,
                              }
                            })}
                          >
                            <Crown className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditModal({
                                open: true,
                                tenant: { id: revenda.id, name: revenda.name, type: revenda.type }
                              })}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setManagePlanModal({
                                open: true,
                                tenant: {
                                  id: revenda.id,
                                  name: revenda.name,
                                  type: revenda.type,
                                  trial_ends_at: revenda.trial_ends_at,
                                }
                              })}>
                                <RefreshCcw className="w-4 h-4 mr-2" />
                                Renovar Acesso
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {revenda.status === 'suspended' ? (
                                <DropdownMenuItem onClick={() => setActivateDialog({
                                  open: true,
                                  tenant: { id: revenda.id, name: revenda.name }
                                })}>
                                  <PlayCircle className="w-4 h-4 mr-2" />
                                  Reativar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => setSuspendDialog({
                                  open: true,
                                  tenant: { id: revenda.id, name: revenda.name }
                                })}>
                                  <UserMinus className="w-4 h-4 mr-2" />
                                  Suspender
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeleteDialog({
                                  open: true,
                                  tenant: { id: revenda.id, name: revenda.name }
                                })}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Apagar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredRevendas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma revenda encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Planos Tab */}
        <TabsContent value="planos" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{plans.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {plans.filter(p => p.plan_type === 'adm').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Usuários</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <Crown className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {plans.filter(p => p.plan_type === 'revenda').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Revendas</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Check className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {plans.filter(p => p.active).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Ativos</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar planos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="adm">Usuários</SelectItem>
                <SelectItem value="revenda">Revendas</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="btn-gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Plano
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setPlanoModal({ open: true, planType: 'revenda', plan: null })}>
                  <Store className="w-4 h-4 mr-2" />
                  Plano Revenda
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPlanoModal({ open: true, planType: 'adm', plan: null })}>
                  <Crown className="w-4 h-4 mr-2" />
                  Plano Admin
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Plans Table */}
          <Card className="border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Plano</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Preço Min.</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans
                  .filter(plan => planFilter === 'all' || plan.plan_type === planFilter)
                  .filter(plan => 
                    searchTerm === '' || 
                    plan.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((plan) => (
                    <TableRow key={plan.id} className="border-border">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-500/10">
                            <Crown className="w-5 h-5 text-amber-400" />
                          </div>
                          <div>
                            <p className="font-medium">{plan.name}</p>
                            {plan.max_users && (
                              <p className="text-xs text-muted-foreground">
                                Até {plan.max_users} usuários
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={plan.plan_type === 'revenda' 
                          ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        }>
                          {plan.plan_type === 'revenda' ? 'Revenda' : 'Administradora'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        R$ {((plan as any).price_monthly || plan.base_price || 0).toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell>
                        R$ {((plan as any).min_fee_monthly || plan.base_price || 0).toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell>{(plan as any).duration_months || 1} {(plan as any).duration_months === 1 ? 'mês' : 'meses'}</TableCell>
                      <TableCell>
                        <Badge className={plan.active 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-muted/50 text-muted_foreground'
                        }>
                          {plan.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                // Get features for this plan
                                const planFeatures = (plan as any).features?.map((f: any) => ({
                                  category: f.feature_category,
                                  subcategory: f.feature_subcategory,
                                  feature: f.feature_name,
                                })) || [];
                                
                                setPlanoModal({
                                  open: true,
                                  planType: plan.plan_type,
                                  plan: {
                                    id: plan.id,
                                    name: plan.name,
                                    plan_type: plan.plan_type,
                                    description: (plan as any).description,
                                    price_monthly: (plan as any).price_monthly || plan.base_price || 0,
                                    price_annual: (plan as any).price_annual || 0,
                                    min_fee_monthly: (plan as any).min_fee_monthly || plan.base_price || 0,
                                    min_fee_annual: (plan as any).min_fee_annual || 0,
                                    per_active_revenda_price: plan.per_active_revenda_price,
                                    duration_months: (plan as any).duration_months || 1,
                                    sort_order: (plan as any).sort_order || 0,
                                    max_users: plan.max_users,
                                    max_clients: (plan as any).max_clients,
                                    benefits: (plan as any).benefits,
                                    active: plan.active,
                                    features: planFeatures,
                                  }
                                });
                              }}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                {plans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum plano encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manage Plan Modal */}
      <ManagePlanModal
        open={managePlanModal.open}
        onOpenChange={(open) => setManagePlanModal({ ...managePlanModal, open })}
        tenant={managePlanModal.tenant}
        onSuccess={refetchChildren}
      />
      
      {/* Edit Tenant Modal */}
      <EditTenantModal
        open={editModal.open}
        onOpenChange={(open) => setEditModal({ ...editModal, open })}
        tenant={editModal.tenant}
        onSuccess={refetchChildren}
      />
      
      {/* Change Password Modal */}
      <ChangePasswordModal
        open={passwordModal.open}
        onOpenChange={(open) => setPasswordModal({ ...passwordModal, open })}
        user={passwordModal.user}
        onSuccess={refetchChildren}
      />
      
      {/* Suspend Dialog */}
      <ConfirmDialog
        open={suspendDialog.open}
        onOpenChange={(open) => setSuspendDialog({ ...suspendDialog, open })}
        title="Suspender conta"
        description={`Tem certeza que deseja suspender "${suspendDialog.tenant?.name}"? A conta perderá acesso ao sistema.`}
        confirmLabel="Suspender"
        variant="destructive"
        onConfirm={async () => {
          if (!suspendDialog.tenant) return;
          try {
            await supabase
              .from('tenants')
              .update({ status: 'suspended' })
              .eq('id', suspendDialog.tenant.id);
            toast.success('Conta suspensa com sucesso!');
            refetchChildren();
          } catch (error: any) {
            toast.error(error.message || 'Erro ao suspender conta');
          }
        }}
      />
      
      {/* Activate Dialog */}
      <ConfirmDialog
        open={activateDialog.open}
        onOpenChange={(open) => setActivateDialog({ ...activateDialog, open })}
        title="Reativar conta"
        description={`Tem certeza que deseja reativar "${activateDialog.tenant?.name}"?`}
        confirmLabel="Reativar"
        onConfirm={async () => {
          if (!activateDialog.tenant) return;
          try {
            await supabase
              .from('tenants')
              .update({ status: 'active' })
              .eq('id', activateDialog.tenant.id);
            toast.success('Conta reativada com sucesso!');
            refetchChildren();
          } catch (error: any) {
            toast.error(error.message || 'Erro ao reativar conta');
          }
        }}
      />
      
      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Apagar conta"
        description={`Tem certeza que deseja apagar permanentemente "${deleteDialog.tenant?.name}"? Esta ação não pode ser desfeita. Todos os dados, clientes, cobranças e configurações serão perdidos.`}
        confirmLabel="Apagar Permanentemente"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteDialog.tenant) return;
          try {
            const tenantId = deleteDialog.tenant.id;
            
            console.log('Iniciando exclusão do tenant:', tenantId);
            
            // Com CASCADE DELETE configurado no banco, só precisamos deletar o tenant
            // Todas as tabelas relacionadas serão deletadas automaticamente
            const { error } = await supabase
              .from('tenants')
              .delete()
              .eq('id', tenantId);
            
            if (error) {
              console.error('Erro na exclusão:', error);
              throw error;
            }
            
            console.log('Tenant excluído com sucesso');
            toast.success('Conta e todos os dados apagados com sucesso!');
            refetchChildren();
          } catch (error: any) {
            console.error('Erro ao apagar conta:', error);
            toast.error(error.message || 'Erro ao apagar conta. Verifique as dependências.');
          }
        }}
      />

      {/* Gestão Plano Modal */}
      <GestaoPlanoModal
        open={planoModal.open}
        onOpenChange={(open) => setPlanoModal({ ...planoModal, open })}
        planType={planoModal.planType}
        plan={planoModal.plan}
        onSubmit={async (data) => {
          try {
            if (data.id) {
              // Atualizar plano existente
              const { error } = await supabase
                .from('plans')
                .update({
                  name: data.name,
                  description: data.description,
                  base_price: data.price_monthly,
                  price_monthly: data.price_monthly,
                  price_annual: data.price_annual,
                  min_fee_monthly: data.min_fee_monthly,
                  min_fee_annual: data.min_fee_annual,
                  per_active_revenda_price: data.per_active_revenda_price || 0,
                  duration_months: data.duration_months,
                  sort_order: data.sort_order,
                  max_users: data.max_users,
                  max_clients: data.max_clients,
                  benefits: data.benefits,
                  active: data.active,
                })
                .eq('id', data.id);
              
              if (error) throw error;

              // Update features
              if (data.features) {
                // Delete existing features
                await supabase.from('plan_features').delete().eq('plan_id', data.id);
                
                // Insert new features
                if (data.features.length > 0) {
                  const featureRecords = data.features.map((f) => ({
                    plan_id: data.id,
                    feature_category: f.category,
                    feature_subcategory: f.subcategory,
                    feature_name: f.feature,
                    is_enabled: true,
                  }));
                  await supabase.from('plan_features').insert(featureRecords);
                }
              }
            } else {
              // Criar novo plano
              const { data: newPlan, error } = await supabase
                .from('plans')
                .insert({
                  name: data.name,
                  plan_type: data.plan_type,
                  created_by_tenant_id: currentTenant?.id,
                  description: data.description,
                  base_price: data.price_monthly,
                  price_monthly: data.price_monthly,
                  price_annual: data.price_annual,
                  min_fee_monthly: data.min_fee_monthly,
                  min_fee_annual: data.min_fee_annual,
                  per_active_revenda_price: data.per_active_revenda_price || 0,
                  duration_months: data.duration_months,
                  sort_order: data.sort_order,
                  max_users: data.max_users,
                  max_clients: data.max_clients,
                  benefits: data.benefits,
                  active: data.active,
                })
                .select()
                .single();
              
              if (error) throw error;

              // Insert features for new plan
              if (data.features && data.features.length > 0 && newPlan) {
                const featureRecords = data.features.map((f) => ({
                  plan_id: newPlan.id,
                  feature_category: f.category,
                  feature_subcategory: f.subcategory,
                  feature_name: f.feature,
                  is_enabled: true,
                }));
                await supabase.from('plan_features').insert(featureRecords);
              }
            }
            
            await refetchPlans();
            return { success: true };
          } catch (error: any) {
            console.error('Error saving plan:', error);
            return { success: false, error: error.message };
          }
        }}
      />

      {/* Create Tenant Modal */}
      <CreateTenantModal
        open={createTenantModal}
        onOpenChange={setCreateTenantModal}
        allowedTypes={['revenda', 'adm']}
        onSuccess={() => refetchChildren()}
      />
    </div>
  );
};

export default GestaoRevendas;

