import React from 'react';
import { Crown, AlertTriangle, CheckCircle, Star, Users, Headphones, LayoutDashboard, Shield, Clock, Building2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTenant } from '@/contexts/TenantContext';
import { usePlans, PlanWithPrice } from '@/hooks/usePlans';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function MeuPlano() {
  const { currentTenant, isLoading: tenantLoading } = useTenant();
  const { plans, isLoading: plansLoading, isMaster, isAdm, isRevenda } = usePlans();
  
  // Buscar assinatura atual do tenant
  const { data: currentSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['my-subscription', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:plans(*)
        `)
        .eq('buyer_tenant_id', currentTenant.id)
        .eq('kind', 'system_plan')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!currentTenant?.id && !isMaster,
  });

  // Verificar período de trial
  const trialEndsAt = currentTenant?.trial_ends_at ? new Date(currentTenant.trial_ends_at) : null;
  const isInTrial = trialEndsAt && trialEndsAt > new Date();
  const daysRemaining = trialEndsAt ? differenceInDays(trialEndsAt, new Date()) : 0;

  const hasActivePlan = currentSubscription?.status === 'active';

  // Filtrar planos por tipo
  const admPlans = plans.filter((p) => p.plan_type === 'adm' && p.active);
  const revendaPlans = plans.filter((p) => p.plan_type === 'revenda' && p.active);

  // Determinar quais planos mostrar baseado no tipo do tenant
  const showAdmPlans = isMaster || isAdm;
  const showRevendaPlans = isMaster || isAdm || isRevenda;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleSelectPlan = (plan: PlanWithPrice) => {
    toast.info('Em breve você poderá assinar este plano!');
    // TODO: Implementar checkout
  };

  if (tenantLoading || subscriptionLoading || plansLoading) {
    return (
      <div className="page-container">
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  return (
    <div className="page-container space-y-8">
      <PageHeader
        title={isMaster ? "Gestão de Planos" : "Plano PRO"}
        description={isMaster 
          ? "Visualize como os planos são exibidos para ADMs e Revendas" 
          : "Gerencie sua assinatura e escolha o plano ideal para sua revenda"}
        icon={Crown}
      />

      {/* Master Info */}
      {isMaster && (
        <Card className="border-primary/20 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-sky-100 dark:bg-sky-900/50">
                <Shield className="h-8 w-8 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Conta Master</h3>
                <p className="text-muted-foreground">
                  Como administrador master, você tem acesso ilimitado ao sistema. 
                  Abaixo está a visualização dos planos disponíveis para ADMs e Revendas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plano Atual - apenas para não-master */}
      {!isMaster && (
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-primary" />
            Plano Atual
          </h2>

          {hasActivePlan ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-foreground">{currentSubscription.plan?.name || 'Plano Ativo'}</CardTitle>
                    <CardDescription>
                      Próxima cobrança: {currentSubscription.ends_at 
                        ? format(new Date(currentSubscription.ends_at), "dd 'de' MMMM", { locale: ptBR })
                        : 'Sem data definida'}
                    </CardDescription>
                  </div>
                  <Badge className="bg-primary">Ativo</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(currentSubscription.price)}/mês
                </p>
              </CardContent>
            </Card>
          ) : isInTrial ? (
            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                      <Clock className="h-5 w-5 text-amber-500" />
                      Período de Teste
                    </CardTitle>
                    <CardDescription>
                      {daysRemaining > 0 
                        ? `${daysRemaining} dias restantes`
                        : 'Expira hoje'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                    Trial
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Alert className="border-amber-500/30 bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-foreground">
                    Seu período de teste expira em breve. Escolha um plano abaixo para continuar utilizando o sistema.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-muted bg-card">
              <CardContent className="py-8 text-center">
                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Nenhum plano ativo</h3>
                <p className="text-muted-foreground">
                  Você ainda não possui um plano ativo. Escolha um plano abaixo para continuar utilizando o sistema.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Planos de Revenda */}
      {showRevendaPlans && revendaPlans.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LayoutDashboard className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Planos de Revenda</h2>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
              <Crown className="h-3 w-3 mr-1" />
              PRO
            </Badge>
          </div>
          <p className="text-muted-foreground mb-6">
            Torne-se um revendedor e gerencie seus próprios clientes
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {revendaPlans.map((plan, index) => {
              const isHighlighted = index === 1 || plan.name.toLowerCase().includes('enterprise');
              return (
                <PlanDisplayCard
                  key={plan.id}
                  plan={plan}
                  highlighted={isHighlighted}
                  colorScheme="amber"
                  onSelect={handleSelectPlan}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Planos Admin */}
      {showAdmPlans && admPlans.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Planos Admin</h2>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
              <Shield className="h-3 w-3 mr-1" />
              ADM
            </Badge>
          </div>
          <p className="text-muted-foreground mb-6">
            Planos para administradoras com recursos completos de gestão
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {admPlans.map((plan, index) => {
              const isHighlighted = index === 1 || plan.name.toLowerCase().includes('enterprise');
              return (
                <PlanDisplayCard
                  key={plan.id}
                  plan={plan}
                  highlighted={isHighlighted}
                  colorScheme="blue"
                  onSelect={handleSelectPlan}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Info adicional */}
      <Card className="bg-muted/30">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Precisa de ajuda para escolher?</p>
                <p className="text-sm text-muted-foreground">
                  Nossa equipe está pronta para ajudar você a encontrar o plano ideal.
                </p>
              </div>
            </div>
            <Button variant="outline" className="gap-2">
              <Headphones className="h-4 w-4" />
              Falar com Suporte
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para exibir um card de plano
interface PlanDisplayCardProps {
  plan: PlanWithPrice;
  highlighted?: boolean;
  colorScheme: 'amber' | 'blue';
  onSelect: (plan: PlanWithPrice) => void;
}

function PlanDisplayCard({ plan, highlighted, colorScheme, onSelect }: PlanDisplayCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const colorClasses = {
    amber: {
      badge: 'text-amber-600 border-amber-500/30 bg-amber-50 dark:bg-amber-950/30',
      icon: 'text-amber-500',
      price: 'text-amber-500',
      priceBox: 'from-amber-500/10 to-orange-500/10 border-amber-500/20',
      ring: 'ring-amber-500/20 border-amber-500',
    },
    blue: {
      badge: 'text-blue-600 border-blue-500/30 bg-blue-50 dark:bg-blue-950/30',
      icon: 'text-blue-500',
      price: 'text-blue-500',
      priceBox: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20',
      ring: 'ring-blue-500/20 border-blue-500',
    },
  };

  const colors = colorClasses[colorScheme];
  const features = plan.features?.map(f => f.feature_name) || [];

  return (
    <Card 
      className={`relative transition-all duration-300 hover:shadow-lg ${
        highlighted 
          ? `border-2 ${colors.ring} ring-2 bg-gradient-to-br from-background to-muted/30` 
          : 'hover:border-primary/50'
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge className="bg-primary shadow-lg">
            <Star className="h-3 w-3 mr-1" />
            Mais Popular
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Crown className={`h-5 w-5 ${colors.icon}`} />
            {plan.name}
          </CardTitle>
          <Badge variant="outline" className={colors.badge}>
            {plan.plan_type === 'revenda' ? 'Revenda' : 'Admin'}
          </Badge>
        </div>
        <CardDescription className="text-sm line-clamp-2">
          {plan.max_users > 0 ? `Até ${plan.max_users} usuários` : 'Usuários ilimitados'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Preço */}
        <div className={`text-center p-4 rounded-lg bg-gradient-to-br ${colors.priceBox} border`}>
          <p className={`text-3xl font-bold ${colors.price}`}>
            {formatCurrency(plan.effective_price || plan.base_price)}
          </p>
          <p className="text-sm text-muted-foreground">por 1 mês</p>
        </div>

        {/* Preço por usuário */}
        {plan.per_active_revenda_price > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>+ {formatCurrency(plan.per_active_revenda_price)} por usuário ativo</span>
          </div>
        )}

        {/* Features */}
        {features.length > 0 && (
          <ul className="space-y-3">
            {features.slice(0, 6).map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
            {features.length > 6 && (
              <li className="text-sm text-muted-foreground">
                + {features.length - 6} recursos adicionais
              </li>
            )}
          </ul>
        )}

        {/* CTA */}
        <Button 
          className={`w-full ${highlighted ? 'btn-gradient-primary' : ''}`}
          variant={highlighted ? 'default' : 'outline'}
          onClick={() => onSelect(plan)}
        >
          Assinar {plan.name}
        </Button>
      </CardContent>
    </Card>
  );
}
