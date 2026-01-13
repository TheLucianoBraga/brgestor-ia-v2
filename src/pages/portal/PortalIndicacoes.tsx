import React, { useState } from 'react';
import { usePortalCustomerId } from '@/hooks/usePortalCustomerId';
import { useReferral } from '@/hooks/useReferral';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PayoutModal } from '@/components/portal/PayoutModal';
import { QRCodeDisplay } from '@/components/portal/QRCodeDisplay';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import { 
  Users, 
  Gift, 
  Copy, 
  Share2,
  CheckCircle2,
  Clock,
  TrendingUp,
  Wallet,
  CreditCard,
  QrCode
} from 'lucide-react';

export default function PortalIndicacoes() {
  const { customerId, tenantId, isLoading: customerLoading } = usePortalCustomerId();
  
  // Hook unificado com context='portal' para URL correta
  const {
    referralLink,
    referralUrl,
    referredUsers,
    stats,
    isLoading: referralLoading,
    requestPayout,
    isRequestingPayout,
    useAsCredit,
    isUsingCredit
  } = useReferral(customerId, { 
    context: 'portal',
    tenantId 
  });

  // Garantir que a URL de indicação do portal sempre aponte para cadastro de cliente
  const fixedReferralUrl = referralUrl?.includes('?') 
    ? referralUrl.split('?')[0] 
    : referralUrl;

  const isLoading = customerLoading || referralLoading;

  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  const handleCopy = () => {
    if (fixedReferralUrl) {
      navigator.clipboard.writeText(fixedReferralUrl);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  const handleShare = async () => {
    if (!fixedReferralUrl) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Indique e Ganhe',
          text: 'Use meu link de indicação e ganhe desconto!',
          url: fixedReferralUrl
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  // formatCurrency importado de @/lib/formatters

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Indique e Ganhe</h1>
        <p className="text-muted-foreground">
          Indique amigos e ganhe comissões a cada contratação
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Card principal com link */}
        <Card className="lg:col-span-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Seu Link de Indicação
            </CardTitle>
            <CardDescription>
              Compartilhe este link. Quando seus indicados contratarem um serviço, você ganha!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fixedReferralUrl ? (
              <>
                <div className="flex gap-2">
                  <Input 
                    value={fixedReferralUrl} 
                    readOnly 
                    className="font-mono text-sm bg-muted" 
                  />
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setShowQRCode(!showQRCode)}>
                    <QrCode className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar
                  </Button>
                </div>

                {showQRCode && (
                  <div className="flex justify-center py-4">
                    <QRCodeDisplay value={fixedReferralUrl} size={180} />
                  </div>
                )}

                {referralLink && (
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Regras:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Você ganha comissão a cada indicação que contratar</li>
                      <li>• Saldo pode ser sacado via PIX (mínimo R$ 50)</li>
                      <li>• Qualquer valor pode ser usado como desconto</li>
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Programa de indicações não disponível para sua conta.</p>
                <p className="text-sm">Entre em contato com o suporte para mais informações.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Saldo */}
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-600" />
              Saldo Disponível
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(stats.availableBalance)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                de {formatCurrency(stats.totalEarned)} ganhos
              </p>
            </div>

            <div className="space-y-2">
              <Button 
                className="w-full" 
                onClick={() => setShowPayoutModal(true)}
                disabled={stats.availableBalance < 50}
              >
                <Wallet className="h-4 w-4 mr-2" />
                Solicitar Saque via PIX
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => useAsCredit()}
                disabled={stats.availableBalance <= 0 || isUsingCredit}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Usar como Crédito
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Mínimo para saque: R$ 50,00
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Total Indicados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Aguardando
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingReferrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Confirmados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.confirmedReferrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Total Ganho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats.totalEarned)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Indicados */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Indicações</CardTitle>
          <CardDescription>
            Acompanhe o status de cada indicação e suas comissões
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                Você ainda não tem indicações
              </p>
              <p className="text-sm text-muted-foreground">
                Compartilhe seu link e comece a ganhar!
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicado</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.referred_name}
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.status === 'paid' ? 'default' : 'secondary'}
                          className={user.status === 'paid' 
                            ? 'bg-green-100 text-green-800 hover:bg-green_100' 
                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow_100'
                          }
                        >
                          {user.status === 'paid' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {user.status === 'paid' ? (
                          <span className="text-green-600">
                            +{formatCurrency(user.commission_amount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {formatCurrency(user.commission_amount)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Como Funciona */}
      <Card>
        <CardHeader>
          <CardTitle>Como Funciona</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium">Compartilhe seu link</p>
                <p className="text-sm text-muted-foreground">
                  Envie para amigos, familiares e conhecidos
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium">Eles contratam um serviço</p>
                <p className="text-sm text-muted-foreground">
                  Quando seu indicado contratar e pagar
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium">Você recebe sua comissão</p>
                <p className="text-sm text-muted-foreground">
                  Saque via PIX ou use como crédito
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PayoutModal
        open={showPayoutModal}
        onOpenChange={setShowPayoutModal}
        availableBalance={stats.availableBalance}
        onRequestPayout={requestPayout}
        isLoading={isRequestingPayout}
      />
    </div>
  );
}
