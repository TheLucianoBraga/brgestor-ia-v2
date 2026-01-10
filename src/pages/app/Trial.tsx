import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { usePlans } from '@/hooks/usePlans';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Crown, Check, AlertTriangle, Zap } from 'lucide-react';
import { differenceInDays, differenceInHours, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Trial: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { plans, isLoading: plansLoading } = usePlans();

  // Calculate trial remaining
  const trialEndsAt = currentTenant?.trial_ends_at 
    ? new Date(currentTenant.trial_ends_at) 
    : null;
  
  const now = new Date();
  const daysRemaining = trialEndsAt ? differenceInDays(trialEndsAt, now) : 0;
  const hoursRemaining = trialEndsAt ? differenceInHours(trialEndsAt, now) % 24 : 0;
  const isExpired = trialEndsAt ? trialEndsAt <= now : false;
  const isLastDay = daysRemaining === 0 && !isExpired;

  // Filter relevant plans
  const relevantPlans = plans.filter(p => 
    p.plan_type === 'revenda' && p.active
  );

  const handleUpgrade = (planId: string) => {
    // Navigate to checkout or plan selection
    navigate(`/app/planos?upgrade=${planId}`);
  };

  if (plansLoading) {
    return (
      <div className="page-container space-y-6">
        <Skeleton className="h-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-5xl mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto flex items-center justify-center mb-4">
            <Zap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">
            {isExpired ? 'Seu período de teste expirou' : 'Período de Teste'}
          </h1>
          <p className="text-muted-foreground">
            {isExpired 
              ? 'Escolha um plano para continuar usando a plataforma'
              : 'Aproveite ao máximo seu tempo de teste'}
          </p>
        </div>

        {/* Trial Status Card */}
        <Card className={`border-2 ${isExpired ? 'border-destructive/50 bg-destructive/5' : isLastDay ? 'border-amber-500/50 bg-amber-500/5' : 'border-primary/30 bg-primary/5'}`}>
          <CardContent className="py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isExpired ? 'bg-destructive/20' : isLastDay ? 'bg-amber-500/20' : 'bg-primary/20'}`}>
                  {isExpired ? (
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                  ) : (
                    <Clock className={`w-8 h-8 ${isLastDay ? 'text-amber-500' : 'text-primary'}`} />
                  )}
                </div>
                <div>
                  {isExpired ? (
                    <>
                      <p className="text-2xl font-bold text-destructive">Teste Expirado</p>
                      <p className="text-muted-foreground">
                        Expirou em {trialEndsAt && format(trialEndsAt, "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                    </>
                  ) : isLastDay ? (
                    <>
                      <p className="text-2xl font-bold text-amber-600">Último dia!</p>
                      <p className="text-muted-foreground">
                        Restam apenas {hoursRemaining} horas
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold">
                        {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'} restantes
                      </p>
                      <p className="text-muted-foreground">
                        Expira em {trialEndsAt && format(trialEndsAt, "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                    </>
                  )}
                </div>
              </div>
              
              {!isExpired && (
                <div className="text-center md:text-right">
                  <p className="text-sm text-muted-foreground mb-2">Não perca seu progresso!</p>
                  <Button onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })} className="gap-2">
                    <Crown className="w-4 h-4" />
                    Fazer Upgrade Agora
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plans Section */}
        <div id="plans" className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Escolha seu plano</h2>
            <p className="text-muted-foreground">Continue usando todas as funcionalidades</p>
          </div>

          {relevantPlans.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {relevantPlans.map((plan, index) => (
                <Card 
                  key={plan.id} 
                  className={`relative overflow-hidden transition-all hover:shadow-lg ${index === 1 ? 'border-primary md:scale-105' : ''}`}
                >
                  {index === 1 && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                      Popular
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>
                      Até {plan.max_users} usuários
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <span className="text-4xl font-bold">
                        R$ {(plan.effective_price || 0).toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>

                    <ul className="space-y-3">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Até {plan.max_users} usuários</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Gestão de clientes</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Cobrança automática</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm">WhatsApp integrado</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Suporte prioritário</span>
                      </li>
                    </ul>

                    <Button 
                      className={`w-full ${index === 1 ? 'btn-gradient-primary' : ''}`}
                      variant={index === 1 ? 'default' : 'outline'}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      Assinar Plano
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Crown className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Nenhum plano disponível no momento.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Entre em contato com o suporte para mais informações.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Contact Section */}
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Precisa de ajuda?</h3>
            <p className="text-muted-foreground mb-4">
              Nossa equipe está pronta para ajudar você a escolher o melhor plano.
            </p>
            <Button variant="outline" onClick={() => navigate('/app/suporte')}>
              Falar com Suporte
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Trial;