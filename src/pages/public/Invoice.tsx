import { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, CreditCard, QrCode, Banknote } from 'lucide-react';

// Components
import { InvoiceHeader } from '@/components/invoice/InvoiceHeader';
import { PaymentMethodSelector } from '@/components/invoice/PaymentMethodSelector';
import { PixPayment } from '@/components/invoice/PixPayment';
import { BoletoPayment } from '@/components/invoice/BoletoPayment';
import { CardPaymentStripe } from '@/components/invoice/CardPaymentStripe';
import { CardPaymentMercadoPago } from '@/components/invoice/CardPaymentMercadoPago';
import { CardPaymentAsaas } from '@/components/invoice/CardPaymentAsaas';
import { CardPaymentPagSeguro } from '@/components/invoice/CardPaymentPagSeguro';
import { PixPaymentStripe } from '@/components/invoice/PixPaymentStripe';
import { PaymentSuccess } from '@/components/invoice/PaymentSuccess';

interface InvoiceData {
  id: string;
  amount: number;
  description: string;
  status: string;
  due_date: string;
  customer_name: string;
  customer_email: string;
  customer_cpf: string;
  customer_phone: string;
  customer_id: string;
  tenant_name: string;
  tenant_logo?: string;
  currency: string;
}

interface TenantGatewayConfig {
  stripe: { enabled: boolean; publishableKey?: string; methods: { card: boolean; pix: boolean } };
  mercadopago: { enabled: boolean; publicKey?: string; methods: { card: boolean; pix: boolean; boleto: boolean } };
  asaas: { enabled: boolean; methods: { card: boolean; pix: boolean; boleto: boolean } };
  pagseguro: { enabled: boolean; methods: { card: boolean; pix: boolean; boleto: boolean } };
}

interface PaymentMethod {
  method: string;
  gateway: string;
  label: string;
}

const Invoice = () => {
  const { id: routeId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [gatewayConfig, setGatewayConfig] = useState<TenantGatewayConfig | null>(null);
  
  // Payment state
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Stripe state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  
  // PIX state
  const [pixData, setPixData] = useState<{
    qrCode?: string;
    qrCodeBase64?: string;
    copyPaste?: string;
    paymentId?: string;
  } | null>(null);
  
  // Boleto state
  const [boletoData, setBoletoData] = useState<{
    boletoUrl?: string;
    barcode?: string;
    invoiceUrl?: string;
  } | null>(null);

  // MercadoPago public key
  const [mpPublicKey, setMpPublicKey] = useState<string | null>(null);
  
  // Resolved tenant ID
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(null);

  // Support both route param (/fatura/:id) and query param (?id=xxx)
  const chargeId = routeId || searchParams.get('id');
  const tenantIdParam = searchParams.get('tenant') || searchParams.get('t');

  // Load invoice and gateway config
  useEffect(() => {
    const loadInvoice = async () => {
      if (!chargeId) {
        setError('Link de fatura inválido');
        setLoading(false);
        return;
      }

      try {
        // Fetch charge details - support both payments table and customer_charges
        let charge: {
          id: string;
          amount: number;
          description: string;
          status: string;
          due_date: string;
          customer_id?: string;
          tenant_id: string;
          buyer_tenant_id?: string;
        } | null = null;
        
        // First try payments table (for tenant subscriptions)
        const { data: paymentMatch } = await supabase
          .from('payments')
          .select('id, amount, status, due_date, buyer_tenant_id, seller_tenant_id, subscription_id')
          .eq('id', chargeId)
          .maybeSingle();
        
        if (paymentMatch) {
          // Get subscription details for description
          let description = 'Pagamento de assinatura';
          if (paymentMatch.subscription_id) {
            const { data: sub } = await supabase
              .from('subscriptions')
              .select('plan_id, plan:plans(name)')
              .eq('id', paymentMatch.subscription_id)
              .maybeSingle();
            if (sub?.plan?.name) {
              description = `Assinatura: ${sub.plan.name}`;
            }
          }
          
          charge = {
            id: paymentMatch.id,
            amount: paymentMatch.amount,
            description,
            status: paymentMatch.status,
            due_date: paymentMatch.due_date,
            tenant_id: paymentMatch.seller_tenant_id,
            buyer_tenant_id: paymentMatch.buyer_tenant_id,
          };
        } else {
          // Try customer_charges table (for customer charges)
          const { data: fullMatch } = await supabase
            .from('customer_charges')
            .select('id, amount, description, status, due_date, customer_id, tenant_id')
            .eq('id', chargeId)
            .maybeSingle();
          
          if (fullMatch) {
            charge = fullMatch;
          } else if (chargeId.length === 8) {
            // Try short ID (prefix match)
            const { data: shortMatch } = await supabase
              .from('customer_charges')
              .select('id, amount, description, status, due_date, customer_id, tenant_id')
              .ilike('id', `${chargeId}%`)
              .maybeSingle();
            charge = shortMatch;
          }
        }

        if (!charge) {
          setError('Fatura não encontrada');
          setLoading(false);
          return;
        }

        const isAlreadyPaid = charge.status === 'paid';
        if (isAlreadyPaid) {
          setIsPaid(true);
        }

        // Use tenant_id from charge if not in URL
        const actualTenantId = tenantIdParam || charge.tenant_id;
        setResolvedTenantId(actualTenantId);

        // Get customer/buyer info
        let customerName = 'Cliente';
        let customerEmail = '';
        let customerCpf = '';
        let customerPhone = '';
        let customerId = '';

        if (charge.customer_id) {
          // Customer charge - get from customers table
          const { data: customer } = await supabase
            .from('customers')
            .select('full_name, email, whatsapp, cpf_cnpj')
            .eq('id', charge.customer_id)
            .maybeSingle();
          
          if (customer) {
            customerName = customer.full_name || 'Cliente';
            customerEmail = customer.email || '';
            customerCpf = customer.cpf_cnpj || '';
            customerPhone = customer.whatsapp || '';
            customerId = charge.customer_id;
          }
        } else if (charge.buyer_tenant_id) {
          // Tenant payment - get from tenants table
          const { data: buyerTenant } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', charge.buyer_tenant_id)
            .maybeSingle();
          
          if (buyerTenant) {
            customerName = buyerTenant.name || 'Cliente';
          }
        }

        // Get seller tenant info
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', actualTenantId)
          .maybeSingle();

        // Get tenant settings
        const settingsMap: Record<string, string> = {};
        try {
          const { data: settings } = await supabase
            .from('tenant_settings')
            .select('key, value')
            .eq('tenant_id', actualTenantId);

          settings?.forEach((s) => {
            if (s.value) settingsMap[s.key] = s.value;
          });
        } catch (err) {
          console.warn('Erro ao buscar configurações:', err);
        }

        // Set MP public key if available
        if (settingsMap['mp_public_key']) {
          setMpPublicKey(settingsMap['mp_public_key']);
        }

        // Determine gateway configuration
        // Determine gateway configuration using public _enabled flags
        // (chaves secretas não são expostas publicamente, apenas flags de habilitação)
        const config: TenantGatewayConfig = {
          mercadopago: {
            enabled: settingsMap['mp_enabled'] === 'true' || !!settingsMap['mp_public_key'],
            publicKey: settingsMap['mp_public_key'],
            methods: {
              card: settingsMap['mp_payment_card'] === 'true',
              pix: settingsMap['mp_payment_pix'] === 'true',
              boleto: settingsMap['mp_payment_boleto'] === 'true',
            },
          },
          stripe: {
            enabled: settingsMap['stripe_enabled'] === 'true' || !!settingsMap['stripe_publishable_key'],
            publishableKey: settingsMap['stripe_publishable_key'],
            methods: {
              card: settingsMap['stripe_payment_card'] === 'true',
              pix: settingsMap['stripe_payment_pix'] === 'true',
            },
          },
          asaas: {
            enabled: settingsMap['asaas_enabled'] === 'true',
            methods: {
              card: settingsMap['asaas_payment_card'] === 'true',
              pix: settingsMap['asaas_payment_pix'] === 'true',
              boleto: settingsMap['asaas_payment_boleto'] === 'true',
            },
          },
          pagseguro: {
            enabled: settingsMap['pagseguro_enabled'] === 'true',
            methods: {
              card: settingsMap['pagseguro_payment_card'] === 'true',
              pix: settingsMap['pagseguro_payment_pix'] === 'true',
              boleto: settingsMap['pagseguro_payment_boleto'] === 'true',
            },
          },
        };

        setGatewayConfig(config);

        setInvoice({
          id: charge.id,
          amount: charge.amount,
          description: charge.description || 'Cobrança',
          status: charge.status,
          due_date: charge.due_date,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_cpf: customerCpf,
          customer_phone: customerPhone,
          customer_id: customerId,
          tenant_name: tenant?.name || '',
          tenant_logo: settingsMap['logo_url'] || undefined,
          currency: 'brl',
        });

        setLoading(false);
      } catch (err) {
        console.error('Error loading invoice:', err);
        setError('Erro ao carregar fatura');
        setLoading(false);
      }
    };

    loadInvoice();
  }, [chargeId, tenantIdParam]);

  // Get available payment methods
  const getAvailablePaymentMethods = (config: TenantGatewayConfig): PaymentMethod[] => {
    const methods: PaymentMethod[] = [];

    // PIX - priority: Stripe > PagSeguro > MercadoPago > Asaas
    if (config.stripe.enabled && config.stripe.methods.pix) {
      methods.push({ method: 'pix', gateway: 'stripe', label: 'PIX' });
    } else if (config.pagseguro.enabled && config.pagseguro.methods.pix) {
      methods.push({ method: 'pix', gateway: 'pagseguro', label: 'PIX' });
    } else if (config.mercadopago.enabled && config.mercadopago.methods.pix) {
      methods.push({ method: 'pix', gateway: 'mercadopago', label: 'PIX' });
    } else if (config.asaas.enabled && config.asaas.methods.pix) {
      methods.push({ method: 'pix', gateway: 'asaas', label: 'PIX' });
    }

    // Card - priority: Stripe > MercadoPago (inline) > others
    if (config.stripe.enabled && config.stripe.methods.card) {
      methods.push({ method: 'card', gateway: 'stripe', label: 'Cartão de Crédito' });
    } else if (config.mercadopago.enabled && config.mercadopago.methods.card && config.mercadopago.publicKey) {
      methods.push({ method: 'card', gateway: 'mercadopago', label: 'Cartão de Crédito' });
    } else if (config.asaas.enabled && config.asaas.methods.card) {
      methods.push({ method: 'card', gateway: 'asaas', label: 'Cartão de Crédito' });
    } else if (config.pagseguro.enabled && config.pagseguro.methods.card) {
      methods.push({ method: 'card', gateway: 'pagseguro', label: 'Cartão de Crédito' });
    }

    // Boleto - priority: Asaas > PagSeguro > MercadoPago
    if (config.asaas.enabled && config.asaas.methods.boleto) {
      methods.push({ method: 'boleto', gateway: 'asaas', label: 'Boleto Bancário' });
    } else if (config.pagseguro.enabled && config.pagseguro.methods.boleto) {
      methods.push({ method: 'boleto', gateway: 'pagseguro', label: 'Boleto Bancário' });
    } else if (config.mercadopago.enabled && config.mercadopago.methods.boleto) {
      methods.push({ method: 'boleto', gateway: 'mercadopago', label: 'Boleto Bancário' });
    }

    return methods;
  };

  // Initialize payment
  const initializePayment = async (method: string, gateway: string) => {
    if (!invoice || !resolvedTenantId || processingPayment) return;

    setProcessingPayment(true);
    setPixData(null);
    setBoletoData(null);
    setClientSecret(null);

    try {
      if (method === 'card') {
        if (gateway === 'stripe') {
          const { data, error } = await supabase.functions.invoke('stripe-create-payment-intent', {
            body: {
              tenantId: resolvedTenantId,
              amount: invoice.amount,
              currency: 'brl',
              description: invoice.description,
              chargeId: invoice.id,
            },
          });
          if (error || !data?.success) throw new Error(data?.error || 'Erro ao iniciar Stripe');
          setClientSecret(data.clientSecret);
          setPublishableKey(data.publishableKey);
        }
        // MercadoPago card is handled inline with SDK, no need to initialize here
      } else if (method === 'pix') {
        if (gateway === 'stripe') {
          const { data, error } = await supabase.functions.invoke('stripe-create-payment-intent', {
            body: {
              tenantId: resolvedTenantId,
              amount: invoice.amount,
              currency: 'brl',
              description: invoice.description,
              chargeId: invoice.id,
              paymentMethodType: 'pix',
            },
          });
          if (error || !data?.success) throw new Error(data?.error || 'Erro ao iniciar PIX');
          setClientSecret(data.clientSecret);
          setPublishableKey(data.publishableKey);
        } else if (gateway === 'mercadopago') {
          const { data, error } = await supabase.functions.invoke('mp-create-pix', {
            body: {
              tenantId: resolvedTenantId,
              amount: invoice.amount,
              description: invoice.description,
              externalReference: invoice.id,
            },
          });
          if (error || !data?.success) throw new Error(data?.error || 'Erro ao gerar PIX');
          setPixData({
            qrCode: data.qrCode,
            qrCodeBase64: data.qrCodeBase64,
            copyPaste: data.copyPaste,
            paymentId: data.paymentId,
          });
        } else if (gateway === 'asaas') {
          const { data, error } = await supabase.functions.invoke('asaas-create-charge', {
            body: {
              tenantId: resolvedTenantId,
              customerName: invoice.customer_name,
              customerCpfCnpj: invoice.customer_cpf || '00000000000',
              customerEmail: invoice.customer_email,
              customerPhone: invoice.customer_phone,
              amount: invoice.amount,
              description: invoice.description,
              dueDate: invoice.due_date,
              billingType: 'PIX',
              externalReference: invoice.id,
            },
          });
          if (error || !data?.success) throw new Error(data?.error || 'Erro ao gerar PIX');
          setPixData({
            qrCode: data.pixQrCode,
            qrCodeBase64: data.pixQrCodeBase64,
            copyPaste: data.pixCopyPaste,
            paymentId: data.paymentId,
          });
        } else if (gateway === 'pagseguro') {
          const { data, error } = await supabase.functions.invoke('pagseguro-create-charge', {
            body: {
              tenant_id: resolvedTenantId,
              customer_id: invoice.customer_id,
              amount: Math.round(invoice.amount * 100),
              description: invoice.description,
              payment_method: 'pix',
            },
          });
          if (error || !data?.success) throw new Error(data?.error || 'Erro ao gerar PIX');
          setPixData({
            qrCode: data.pix?.qr_code,
            qrCodeBase64: data.pix?.qr_code_image,
            copyPaste: data.pix?.qr_code,
          });
        }
      } else if (method === 'boleto') {
        if (gateway === 'mercadopago') {
          // MercadoPago doesn't have inline boleto, redirect to preference
          const { data, error } = await supabase.functions.invoke('mp-create-preference', {
            body: {
              tenantId: resolvedTenantId,
              amount: invoice.amount,
              description: invoice.description,
              externalReference: invoice.id,
            },
          });
          if (error || !data?.success) throw new Error(data?.error || 'Erro ao gerar boleto');
          // Redirect to MercadoPago checkout for boleto
          if (data.initPoint) {
            window.location.href = data.initPoint;
          }
        } else if (gateway === 'asaas') {
          const { data, error } = await supabase.functions.invoke('asaas-create-charge', {
            body: {
              tenantId: resolvedTenantId,
              customerName: invoice.customer_name,
              customerCpfCnpj: invoice.customer_cpf || '00000000000',
              customerEmail: invoice.customer_email,
              customerPhone: invoice.customer_phone,
              amount: invoice.amount,
              description: invoice.description,
              dueDate: invoice.due_date,
              billingType: 'BOLETO',
              externalReference: invoice.id,
            },
          });
          if (error || !data?.success) throw new Error(data?.error || 'Erro ao gerar boleto');
          setBoletoData({
            boletoUrl: data.bankSlipUrl,
            barcode: data.barCode,
            invoiceUrl: data.invoiceUrl,
          });
        } else if (gateway === 'pagseguro') {
          const { data, error } = await supabase.functions.invoke('pagseguro-create-charge', {
            body: {
              tenant_id: resolvedTenantId,
              customer_id: invoice.customer_id,
              amount: Math.round(invoice.amount * 100),
              description: invoice.description,
              payment_method: 'boleto',
            },
          });
          if (error || !data?.success) throw new Error(data?.error || 'Erro ao gerar boleto');
          setBoletoData({
            boletoUrl: data.boleto?.pdf_url,
            barcode: data.boleto?.barcode,
            invoiceUrl: data.boleto?.pdf_url,
          });
        }
      }
    } catch (err: unknown) {
      console.error('Error initializing payment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao inicializar pagamento';
      setError(errorMessage);
      setSelectedMethod(null);
      setSelectedGateway(null);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle method selection
  const handleSelectMethod = (method: string) => {
    if (!gatewayConfig) return;
    const methods = getAvailablePaymentMethods(gatewayConfig);
    const selected = methods.find((m) => m.method === method);
    if (selected) {
      setSelectedMethod(selected.method);
      setSelectedGateway(selected.gateway);
      
      // Only initialize if not MercadoPago card (handled by SDK)
      if (!(selected.method === 'card' && selected.gateway === 'mercadopago')) {
        initializePayment(selected.method, selected.gateway);
      }
    }
  };

  // Handle back
  const handleBack = () => {
    setSelectedMethod(null);
    setSelectedGateway(null);
    setPixData(null);
    setBoletoData(null);
    setClientSecret(null);
    setError(null);
  };

  // Handle payment success
  // ⚠️ DESABILITADO POR SEGURANÇA: Endpoint público NÃO DEVE marcar como pago diretamente
  // Isso deve ser feito apenas por webhooks validados dos gateways de pagamento
  const handlePaymentSuccess = async () => {
    // ❌ REMOVIDO POR SEGURANÇA - Pagamento deve ser confirmado via webhook
    console.warn('⚠️ Marcar como pago deve ser feito apenas via webhook validado do gateway');
    
    // Apenas atualizar UI localmente (não no banco!)
    setIsPaid(true);
    toast.success('Aguardando confirmação do pagamento...');
    
    // TODO: Implementar polling ou websocket para verificar status real
  };

  // Render loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando fatura...</p>
        </div>
      </div>
    );
  }

  // Render error
  if (error && !selectedMethod) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="mt-4 text-xl font-semibold">Erro</h2>
              <p className="mt-2 text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render paid
  if (isPaid && invoice) {
    return (
      <PaymentSuccess 
        amount={invoice.amount} 
        currency={invoice.currency} 
        tenantName={invoice.tenant_name}
        tenantLogo={invoice.tenant_logo}
        serviceName={invoice.description}
      />
    );
  }

  // Render no config (but allow if already paid)
  if (!invoice || (!gatewayConfig && !isPaid)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="mt-4 text-xl font-semibold">Erro de Configuração</h2>
              <p className="mt-2 text-muted-foreground">Nenhum método de pagamento configurado.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableMethods = getAvailablePaymentMethods(gatewayConfig);

  if (availableMethods.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="mt-4 text-xl font-semibold">Pagamento Indisponível</h2>
              <p className="mt-2 text-muted-foreground">
                Nenhum método de pagamento está habilitado para este vendedor.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render payment content
  const renderPaymentContent = () => {
    if (processingPayment) {
      return (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Preparando pagamento...</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (selectedMethod === 'pix' && pixData) {
      return (
        <PixPayment
          qrCode={pixData.qrCode}
          qrCodeBase64={pixData.qrCodeBase64}
          copyPaste={pixData.copyPaste}
          paymentId={pixData.paymentId}
          tenantId={resolvedTenantId!}
          onPaid={handlePaymentSuccess}
        />
      );
    }

    if (selectedMethod === 'pix' && selectedGateway === 'stripe') {
      return (
        <PixPaymentStripe
          amount={invoice.amount}
          tenantId={resolvedTenantId!}
          customerId={invoice.customer_id}
          chargeId={invoice.id}
          description={invoice.description}
          onSuccess={handlePaymentSuccess}
        />
      );
    }

    if (selectedMethod === 'card' && selectedGateway === 'stripe' && clientSecret && publishableKey) {
      return (
        <CardPaymentStripe
          clientSecret={clientSecret}
          publishableKey={publishableKey}
          amount={invoice.amount}
          currency={invoice.currency}
          onSuccess={handlePaymentSuccess}
        />
      );
    }

    if (selectedMethod === 'card' && selectedGateway === 'mercadopago' && mpPublicKey) {
      return (
        <CardPaymentMercadoPago
          publicKey={mpPublicKey}
          amount={invoice.amount}
          tenantId={resolvedTenantId!}
          chargeId={invoice.id}
          customerEmail={invoice.customer_email}
          onSuccess={handlePaymentSuccess}
        />
      );
    }

    if (selectedMethod === 'card' && selectedGateway === 'asaas') {
      return (
        <CardPaymentAsaas
          amount={invoice.amount}
          tenantId={resolvedTenantId!}
          chargeId={invoice.id}
          customerName={invoice.customer_name}
          customerCpf={invoice.customer_cpf}
          customerEmail={invoice.customer_email}
          customerPhone={invoice.customer_phone}
          description={invoice.description}
          dueDate={invoice.due_date}
          onSuccess={handlePaymentSuccess}
        />
      );
    }

    if (selectedMethod === 'card' && selectedGateway === 'pagseguro') {
      return (
        <CardPaymentPagSeguro
          amount={invoice.amount}
          tenantId={resolvedTenantId!}
          customerId={invoice.customer_id}
          description={invoice.description}
          onSuccess={handlePaymentSuccess}
        />
      );
    }

    if (selectedMethod === 'boleto' && boletoData) {
      return (
        <BoletoPayment
          boletoUrl={boletoData.boletoUrl}
          barcode={boletoData.barcode}
          invoiceUrl={boletoData.invoiceUrl}
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Invoice Header with Logo */}
        <InvoiceHeader
          logoUrl={invoice.tenant_logo}
          tenantName={invoice.tenant_name}
          customerName={invoice.customer_name}
          description={invoice.description}
          dueDate={invoice.due_date}
          amount={invoice.amount}
          currency={invoice.currency}
        />

        {/* Payment Method Selector or Back Button */}
        <PaymentMethodSelector
          availableMethods={availableMethods}
          selectedMethod={selectedMethod}
          onSelectMethod={handleSelectMethod}
          onBack={handleBack}
          isProcessing={processingPayment}
        />

        {/* Payment Content */}
        {selectedMethod && renderPaymentContent()}

        {/* Security Badge */}
        <div className="text-center text-sm text-muted-foreground">
          <p>🔒 Pagamento seguro e criptografado</p>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
