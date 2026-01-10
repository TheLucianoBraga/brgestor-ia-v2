import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Gift,
  Copy, 
  Share2,
  Users,
  Clock,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { QRCodeDisplay } from '@/components/portal/QRCodeDisplay';

interface RefCode {
  code: number;
  kind: string;
  active: boolean;
  created_at: string;
}

interface ReferralStats {
  testesIniciados: number;
  emPeriodoTeste: number;
  convertidos: number;
}

interface ReferralRecord {
  id: string;
  name: string;
  email: string;
  date: string;
  status: 'em_teste' | 'assinante';
}

const Links: React.FC = () => {
  const { currentTenant } = useTenant();
  const [showQRCode, setShowQRCode] = useState<string | null>(null);

  // Permissões: master e adm podem ver link de revenda
  const canSeeRevendaLink = currentTenant?.type === 'master' || currentTenant?.type === 'adm';

  // Buscar domínio customizado das configurações do tenant
  const { data: customDomain } = useQuery({
    queryKey: ['tenant-custom-domain', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('value')
        .eq('tenant_id', currentTenant.id)
        .eq('key', 'custom_domain')
        .maybeSingle();
      
      if (error) return null;
      return data?.value || null;
    },
    enabled: !!currentTenant?.id,
  });

  // Buscar ou criar código único do tenant
  const { data: refCode, isLoading: isLoadingCode } = useQuery({
    queryKey: ['tenant-ref-code', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return null;
      
      // Buscar código existente para o tenant (apenas um código por tenant)
      const { data: existing, error: fetchError } = await supabase
        .from('ref_codes')
        .select('*')
        .eq('owner_tenant_id', currentTenant.id)
        .eq('kind', 'signup_cliente')
        .maybeSingle();
      
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      
      if (existing) {
        return existing as RefCode;
      }
      
      // Criar código se não existir
      const { data: created, error: insertError } = await supabase
        .from('ref_codes')
        .insert({
          owner_tenant_id: currentTenant.id,
          kind: 'signup_cliente',
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      return created as RefCode;
    },
    enabled: !!currentTenant?.id,
  });

  // Buscar histórico de indicações
  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['referral-history-simple', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, created_at, status, type, trial_ends_at')
        .eq('owner_tenant_id', currentTenant.id)
        .in('type', ['revenda', 'cliente'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const records: ReferralRecord[] = [];
      for (const tenant of data || []) {
        const { data: member } = await supabase
          .from('tenant_members')
          .select('user_id')
          .eq('tenant_id', tenant.id)
          .single();
        
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('buyer_tenant_id', tenant.id)
          .eq('status', 'active')
          .limit(1);
        
        const hasActiveSubscription = subscription && subscription.length > 0;
        
        records.push({
          id: tenant.id,
          name: tenant.name,
          email: member?.user_id ? '...' : '-',
          date: tenant.created_at,
          status: hasActiveSubscription ? 'assinante' : 'em_teste'
        });
      }
      
      return records;
    },
    enabled: !!currentTenant?.id,
  });

  // Calcular estatísticas
  const stats: ReferralStats = {
    testesIniciados: history?.length || 0,
    emPeriodoTeste: history?.filter(h => h.status === 'em_teste').length || 0,
    convertidos: history?.filter(h => h.status === 'assinante').length || 0,
  };

  // Links baseados no código único do tenant - usando domínio customizado do sistema
  const code = refCode?.code;
  // Prioriza o domínio customizado do tenant_settings, senão usa o domínio padrão
  const baseUrl = import.meta.env.VITE_APP_URL;
  
  // Link de Cliente: /cadastro-cliente?ref={code}
  const clienteUrl = code ? `${baseUrl}/cadastro-cliente?ref=${code}` : null;
  
  // Link de Revenda: /cadastro-cliente/revenda?ref={code}
  const revendaUrl = code ? `${baseUrl}/cadastro-cliente/revenda?ref=${code}` : null;
  
  // Link principal baseado no tipo do tenant
  const mainUrl = canSeeRevendaLink ? revendaUrl : clienteUrl;

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const handleShare = async (url: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
      } catch {
        handleCopy(url);
      }
    } else {
      handleCopy(url);
    }
  };

  const isLoading = isLoadingCode || isLoadingHistory;

  if (isLoading) {
    return (
      <div className="page-container space-y-6">
        <PageHeader title="Links" description="Gerencie seus links de cadastro e indicação" />
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader 
        title="Links" 
        description="Gerencie seus links de cadastro e indicação"
        sticky
      />

      {/* Links Específicos */}
      <div className={`grid gap-4 ${canSeeRevendaLink ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
        {/* Link Cliente - Visível para todos */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Link de Cliente</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Para cadastro de clientes e comissões
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 font-mono text-xs truncate border">
                {clienteUrl || 'Gerando...'}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => clienteUrl && handleCopy(clienteUrl)}
                disabled={!clienteUrl}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Link Revenda - Visível apenas para master/adm */}
        {canSeeRevendaLink && (
          <Card className="bg-card border-amber-500/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base">Link de Revenda</CardTitle>
                <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600">7 dias grátis</Badge>
              </div>
              <CardDescription className="text-xs">
                Para novos revendedores com teste grátis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 font-mono text-xs truncate border">
                  {revendaUrl || 'Gerando...'}
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => revendaUrl && handleCopy(revendaUrl)}
                  disabled={!revendaUrl}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stats Cards - Apenas para master/adm */}
      {canSeeRevendaLink && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <div className="text-3xl font-bold">{stats.testesIniciados}</div>
              <div className="text-sm text-muted-foreground">Revendas Cadastradas</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <Clock className="h-6 w-6 mx-auto mb-2 text-amber-500" />
              <div className="text-3xl font-bold">{stats.emPeriodoTeste}</div>
              <div className="text-sm text-muted-foreground">Em Período de Teste</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <div className="text-3xl font-bold">{stats.convertidos}</div>
              <div className="text-sm text-muted-foreground">Revendas Ativas</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Histórico de Revendas - Apenas para master/adm */}
      {canSeeRevendaLink && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Revendas</CardTitle>
            <CardDescription>Acompanhe todos os revendedores que se cadastraram pelo seu link</CardDescription>
          </CardHeader>
          <CardContent>
            {history && history.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium uppercase">{record.name}</TableCell>
                      <TableCell className="text-muted-foreground">{record.email}</TableCell>
                      <TableCell>
                        {format(new Date(record.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {record.status === 'assinante' ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            Assinante
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                            Em Teste
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Nenhuma revenda cadastrada ainda</p>
                <p className="text-sm">Compartilhe seu link para começar a receber revendas</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* QR Code Dialog */}
      <Dialog open={!!showQRCode} onOpenChange={() => setShowQRCode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
          </DialogHeader>
          {showQRCode && <QRCodeDisplay value={showQRCode} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Links;