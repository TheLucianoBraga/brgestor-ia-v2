import React from 'react';
import { Link } from 'react-router-dom';
import { usePortalCustomerId } from '@/hooks/usePortalCustomerId';
import { useCustomerServices } from '@/hooks/useCustomerServices';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, 
  CreditCard, 
  Calendar, 
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isActiveStatus } from '@/utils/statusUtils';
import { cn } from '@/lib/utils';

export default function PortalDashboard() {
  const { customerId, customerName, isLoading: customerLoading } = usePortalCustomerId();
  const { customerItems, payments, isLoading: servicesLoading } = useCustomerServices(customerId);

  const isLoading = customerLoading || servicesLoading;

  const activeItems = customerItems.filter(item => isActiveStatus(item.status));
  const pendingPayments = payments.filter(p => p.status === 'pending');
  
  // Use expires_at as the primary source for expiration date, calculating it if necessary
  const itemsWithDates = activeItems.map(item => {
    let finalExpiry = item.expires_at || item.due_date;
    
    // Se não tiver data mas tiver starts_at + duração, calculamos
    if (!finalExpiry && item.starts_at) {
      // Use starts_at as a fallback expiry reference
      finalExpiry = item.starts_at;
    }
    
    return { ...item, finalExpiry };
  }).filter(item => item.finalExpiry);

  const nextDueItem = itemsWithDates.sort((a, b) => {
    const dateA = new Date(a.finalExpiry!).getTime();
    const dateB = new Date(b.finalExpiry!).getTime();
    return dateA - dateB;
  })[0];

  const nextDueDate = nextDueItem?.finalExpiry;
  const daysUntilDue = nextDueDate 
    ? differenceInDays(new Date(nextDueDate), new Date())
    : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Olá, <span className="text-primary">{customerName?.split(' ')[0] || 'Cliente'}</span>!
          </h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo ao seu espaço exclusivo. Tudo pronto para hoje?
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status da Conta</span>
            <span className="text-sm font-semibold flex items-center gap-1.5 text-emerald-500">
              <ShieldCheck className="h-4 w-4" />
              Verificada & Segura
            </span>
          </div>
        </div>
      </motion.div>

      {/* Premium Summary Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
        {[
          { 
            title: 'Serviços Ativos', 
            value: activeItems.length, 
            subtitle: activeItems.length === 1 ? 'serviço' : 'serviços',
            icon: Package,
            color: 'bg-blue_500',
            delay: 0.1
          },
          { 
            title: 'Pagamentos', 
            value: pendingPayments.length, 
            subtitle: pendingPayments.length === 0 ? 'Tudo em dia!' : 'aguardando',
            icon: CreditCard,
            color: 'bg-amber_500',
            delay: 0.2
          },
          { 
            title: 'Próximo Vencimento', 
            value: nextDueDate ? format(new Date(nextDueDate), 'dd/MM', { locale: ptBR }) : '-', 
            subtitle: nextDueDate ? (daysUntilDue === 0 ? 'vence hoje' : `em ${daysUntilDue} dias`) : 'Sem vencimentos',
            icon: Calendar,
            color: 'bg-emerald_500',
            delay: 0.3
          }
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: card.delay }}
          >
            <Card className="relative overflow-hidden border-none shadow-xl shadow-black/5 group hover:shadow-2xl transition-all duration-300">
              <div className={cn("absolute top-0 right-0 w-24 h-24 opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-150", card.color)} />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{card.title}</CardTitle>
                <card.icon className="h-5 w-5 text-muted-foreground/50" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tracking-tighter">{card.value}</div>
                <p className="text-xs font-medium text-muted-foreground mt-1 flex items-center gap-1">
                  {card.subtitle}
                  {card.title === 'Pagamentos' && pendingPayments.length === 0 && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Grid: Services & Alerts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Alertas Premium */}
          {pendingPayments.length > 0 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="border-none bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20">
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg">Pagamentos Pendentes</p>
                    <p className="text-sm text-white/80">
                      Você tem {pendingPayments.length} fatura(s) aguardando. Regularize para evitar interrupções.
                    </p>
                  </div>
                  <Button asChild variant="secondary" className="hidden sm:flex rounded-xl font-bold">
                    <Link to="/portal/meus-servicos">Pagar Agora</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Meus serviços Premium List */}
          <Card className="border-none shadow-xl shadow-black/5 rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-6 py-5">
              <div>
                <CardTitle className="text-lg font-bold">Meus Serviços</CardTitle>
                <CardDescription>Gestão de assinaturas ativas</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="rounded-xl font-bold text-primary hover:bg-primary/10">
                <Link to="/portal/meus-servicos">Ver todos</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {activeItems.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                  <p className="font-bold text-lg">Nenhum serviço ativo</p>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-2">
                    Explore nosso catálogo e encontre a solução perfeita para você.
                  </p>
                  <Button asChild className="mt-6 rounded-2xl px-8 shadow-lg shadow-primary/20">
                    <Link to="/portal/servicos">Explorar Serviços</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {activeItems.slice(0, 4).map((item, i) => (
                    <motion.div 
                      key={item.id} 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between p-5 hover:bg-muted/20 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Package className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-sm sm:text-base">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground font-medium">{item.plan_name || 'Plano Padrão'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="hidden sm:flex bg-emerald-500/10 text-emerald-600 border-emerald-500/20 rounded-lg px-2 py-1 font-bold text-[10px] uppercase tracking-wider">
                          <CheckCircle2 className="h-3 w-3 mr-1.5" />
                          Ativo
                        </Badge>
                        <Button asChild variant="ghost" size="icon" className="rounded-xl h-10 w-10 hover:bg-primary/10 hover:text-primary">
                          <Link to="/portal/meus-servicos">
                            <ArrowRight className="h-5 w-5" />
                          </Link>
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <Card className="border-none bg-primary text-primary-foreground shadow-xl shadow-primary/20 rounded-3xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            <CardContent className="p-6 relative z-10">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 fill-current" />
              </div>
              <h3 className="text-xl font-black leading-tight">Impulsione seu Negócio</h3>
              <p className="text-primary-foreground/80 text-sm mt-2 mb-6">
                Descubra novas ferramentas e serviços premium para escalar seus resultados.
              </p>
              <Button asChild variant="secondary" className="w-full rounded-2xl font-bold shadow-lg group-hover:translate-y-[-2px] transition-transform">
                <Link to="/portal/servicos">Ver Catálogo</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-black/5 rounded-3xl overflow-hidden group cursor-pointer">
            <Link to="/portal/indicacoes">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                  <TrendingUp className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-black text-lg leading-tight">Indique & Ganhe</p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    Ganhe créditos exclusivos indicando novos parceiros.
                  </p>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
