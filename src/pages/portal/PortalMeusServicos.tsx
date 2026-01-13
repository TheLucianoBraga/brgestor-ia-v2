import React, { useState } from 'react';
import { Package, Calendar, RefreshCcw, Clock, AlertTriangle, CheckCircle, XCircle, History, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { differenceInDays, parseISO } from 'date-fns';
import { useCustomerServices } from '@/hooks/useCustomerServices';
import { usePortalCustomerId } from '@/hooks/usePortalCustomerId';
import { formatCurrency, formatDate as formatDateUtil } from '@/lib/formatters';
import { RenewalModal } from '@/components/portal/RenewalModal';
import { Link } from 'react-router-dom';
import { isActiveStatus, getStatusDisplayConfig } from '@/utils/statusUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PortalMeusServicos: React.FC = () => {
  const { customerId, isLoading: customerLoading } = usePortalCustomerId();
  const { customerItems, payments, isLoading: servicesLoading, refetch, updatePaymentStatus } = useCustomerServices(customerId);
  const [activeTab, setActiveTab] = useState('ativos');
  const [renewalItem, setRenewalItem] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);

  const isLoading = customerLoading || servicesLoading;

  const handleCancelPayment = async (paymentId: string) => {
    if (!window.confirm('Tem certeza que deseja cancelar este pagamento?')) return;
    
    setIsCancelling(paymentId);
    try {
      await updatePaymentStatus(paymentId, 'cancelled');
      toast.success('Pagamento cancelado com sucesso!');
      refetch();
    } catch (error) {
      console.error('Erro ao cancelar pagamento:', error);
      toast.error('Erro ao cancelar pagamento. Tente novamente.');
    } finally {
      setIsCancelling(null);
    }
  };

  // Formatters importados de @/lib/formatters
  const formatPrice = (price: number | null) => price !== null ? formatCurrency(price) : 'N/A';
  const formatDate = (date: string | null) => date ? formatDateUtil(date) : '-';

  const isNearExpiration = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const days = differenceInDays(parseISO(expiresAt), new Date());
    // Retorna true se faltar 7 dias ou menos para expirar
    return days <= 7;
  };

  const getExpirationDisplay = (item: any) => {
    if (item.expires_at) return formatDate(item.expires_at);
    if (item.due_date) return formatDate(item.due_date);
    
    // Se tiver duração definida e data de ativação, calcular
    if (item.duration_months && item.duration_months > 0 && item.starts_at) {
      const date = new Date(item.starts_at);
      date.setMonth(date.getMonth() + item.duration_months);
      return formatDate(date.toISOString());
    }
    
    // Fallback para nome se não tiver duration_months (compatibilidade)
    if (item.product_name?.toLowerCase().includes('mensal') && item.starts_at) {
      const date = new Date(item.starts_at);
      date.setMonth(date.getMonth() + 1);
      return formatDate(date.toISOString());
    }
    
    return "Vitalício";
  };

  const getNextCycleDisplay = (item: any) => {
    let expirationDate = item.expires_at || item.due_date;
    
    // Se não tiver data mas tiver duração, calcular para verificar proximidade
    if (!expirationDate && item.duration_months && item.duration_months > 0 && item.starts_at) {
      const date = new Date(item.starts_at);
      date.setMonth(date.getMonth() + item.duration_months);
      expirationDate = date.toISOString();
    } else if (!expirationDate && item.product_name?.toLowerCase().includes('mensal') && item.starts_at) {
      const date = new Date(item.starts_at);
      date.setMonth(date.getMonth() + 1);
      expirationDate = date.toISOString();
    }

    if (expirationDate && isNearExpiration(expirationDate)) {
      return formatDate(expirationDate);
    }

    return "N/A";
  };

  const filteredItems = customerItems.filter((item) => {
    switch (activeTab) {
      case 'ativos':
        return isActiveStatus(item.status);
      case 'expirados':
        return item.status === 'expired';
      case 'cancelados':
        return item.status === 'cancelled';
      default:
        return true;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Meus Serviços</h1>
          <p className="text-muted-foreground">Gerencie seus serviços contratados</p>
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Meus <span className="text-primary">Serviços</span></h1>
          <p className="text-muted-foreground">Acompanhe e gerencie suas assinaturas ativas.</p>
        </div>
        <Button asChild className="rounded-2xl bg-primary shadow-lg shadow-primary/20 hover:scale-105 transition-transform px-6 h-12 font-bold">
          <Link to="/portal/servicos">
            <Plus className="w-5 h-5 mr-2" />
            Novo Serviço
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-secondary/50 p-1 rounded-2xl h-14 w-full sm:w-auto flex">
          <TabsTrigger value="ativos" className="flex-1 sm:flex-none rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Ativos
            {customerItems.filter(i => isActiveStatus(i.status)).length > 0 && (
              <span className="ml-1 bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full">
                {customerItems.filter(i => isActiveStatus(i.status)).length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="expirados" className="flex-1 sm:flex-none rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold gap-2">
            <XCircle className="w-4 h-4 text-destructive" />
            Expirados
          </TabsTrigger>
          <TabsTrigger value="cancelados" className="flex-1 sm:flex-none rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            Cancelados
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredItems.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum serviço encontrado</h3>
              <p className="text-muted-foreground">
                {activeTab === 'ativos' 
                  ? 'Você ainda não possui serviços ativos. Contrate um novo serviço!'
                  : `Nenhum serviço ${activeTab === 'expirados' ? 'expirado' : 'cancelado'}.`}
              </p>
              {activeTab === 'ativos' && (
                <Button className="mt-4" asChild>
                  <Link to="/portal/servicos">Ver Serviços Disponíveis</Link>
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredItems.map((item) => {
                const statusConfig = getStatusDisplayConfig(item.status);
                const nearExpiration = isNearExpiration(item.expires_at);
                const StatusIcon = statusConfig.label === 'Ativo' ? CheckCircle : (statusConfig.label === 'Pendente' ? Clock : XCircle);

                return (
                  <Card key={item.id} className={cn("border-none shadow-xl shadow-black/5 rounded-3xl overflow-hidden group transition-all duration-300 hover:shadow-2xl", nearExpiration && "ring-2 ring-amber-500/50")}>
                    <CardHeader className="pb-4 bg-muted/30 px-6 pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Package className="h-7 w-7 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-black">{item.product_name}</CardTitle>
                            {item.plan_name && (
                              <CardDescription className="font-medium">{item.plan_name}</CardDescription>
                            )}
                          </div>
                        </div>
                        <Badge variant={statusConfig.variant} className="rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-widest">
                          <StatusIcon className={`w-3 h-3 mr-1.5 ${statusConfig.color}`} />
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Investimento</p>
                          <p className="text-lg font-bold">{formatPrice(item.price)}</p>
                          {item.discount && item.discount > 0 && (
                            <p className="text-xs font-bold text-emerald-500">-{formatPrice(item.discount)} OFF</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ativação</p>
                          <p className="text-sm font-semibold">{formatDate(item.starts_at)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expiração</p>
                          <p className={cn("text-sm font-semibold flex items-center gap-1.5", nearExpiration ? 'text-amber_500' : '')}>
                            {getExpirationDisplay(item)}
                            {nearExpiration && <AlertTriangle className="w-4 h-4" />}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Próximo Ciclo</p>
                          <p className="text-sm font-semibold">
                            {getNextCycleDisplay(item)}
                          </p>
                        </div>
                      </div>

                      {/* Renewal Action - Always show for active services */}
                      {isActiveStatus(item.status) && (
                        <div className="mt-6 pt-6 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/50">
                            {nearExpiration ? (
                              <>
                                <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                                </div>
                                <span className="text-xs font-bold text-amber-700">Atenção: Seu serviço expira em breve</span>
                              </>
                            ) : (
                              <>
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Calendar className="w-4 h-4 text-primary" />
                                </div>
                                <span className="text-xs font-bold text-muted-foreground">Serviço ativo e protegido</span>
                              </>
                            )}
                          </div>
                          <Button 
                            onClick={() => setRenewalItem(item)}
                            className={cn("rounded-2xl font-bold px-8 h-11 shadow-lg transition-all", nearExpiration ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-primary shadow-primary/20')}
                          >
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Renovar Agora
                          </Button>
                        </div>
                      )}

                      {/* Expired - show renewal option */}
                      {item.status === 'expired' && (
                        <div className="mt-4 pt-4 border-t flex items-center justify-between">
                          <div className="flex items-center gap-2 text-red-500">
                            <XCircle className="w-4 h-4" />
                            <span className="text-sm">Serviço expirado</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => setRenewalItem(item)}
                          >
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Reativar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico de Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pago em</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.slice(0, 10).map((payment) => {
                  const isExpired = payment.status === 'pending' && payment.due_date && new Date(payment.due_date) < new Date();
                  
                  return (
                    <TableRow key={payment.id} className="group">
                      <TableCell className="font-medium">{formatDate(payment.created_at)}</TableCell>
                      <TableCell className="font-bold">{formatPrice(payment.amount)}</TableCell>
                      <TableCell>
                        {isExpired ? (
                          <Badge className="bg-red-500/10 text-red-500 border-red-500/20 font-bold uppercase text-[10px]">Expirado</Badge>
                        ) : (
                          <Badge 
                            variant={payment.status === 'paid' ? 'default' : (payment.status === 'cancelled' ? 'secondary' : 'outline')} 
                            className={cn(
                              payment.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 
                              payment.status === 'cancelled' ? 'bg-gray-500/10 text-gray-500 border-gray-500/20' : ''
                            )}
                          >
                            {payment.status === 'paid' ? 'Pago' : payment.status === 'pending' ? 'Pendente' : payment.status === 'cancelled' ? 'Cancelado' : payment.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isExpired ? (
                          <span className="text-red-500 font-bold text-[10px] uppercase tracking-wider">Cancelado</span>
                        ) : (
                          payment.paid_at ? formatDate(payment.paid_at) : '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {payment.status === 'pending' && !isExpired && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => handleCancelPayment(payment.id)}
                                disabled={isCancelling === payment.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button asChild size="sm" className="rounded-xl h-8 px-4 font-bold shadow-lg shadow-primary/20">
                                <Link to={`/fatura/${payment.id}`}>Pagar</Link>
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Renewal Modal */}
      <RenewalModal
        open={!!renewalItem}
        onOpenChange={(open) => !open && setRenewalItem(null)}
        item={renewalItem}
        onSuccess={() => {
          setRenewalItem(null);
          refetch();
        }}
      />
    </div>
  );
};

export default PortalMeusServicos;
