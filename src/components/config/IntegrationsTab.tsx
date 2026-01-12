import React, { useState, useEffect } from 'react';
import { MessageCircle, CreditCard, Wallet, Save, Eye, EyeOff, Copy, Check, Loader2, ExternalLink, Sparkles, Bot, DollarSign, Globe, ChevronDown, QrCode, Banknote } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const IntegrationsTab: React.FC = () => {
  const { settings = {}, updateMultipleSettings, isLoading } = useTenantSettings();
  const { currentTenant } = useTenant();
  
  // Early return if still loading to prevent undefined access
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-pulse flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-full" />
              <div className="h-4 w-48 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Only Master tenant can configure WAHA
  const isMaster = currentTenant?.type === 'master';

  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // WhatsApp API Provider - API 1 ou API 2
  const [selectedApiProvider, setSelectedApiProvider] = useState<'api1' | 'api2'>('api1');
  
  // WhatsApp API 1 state
  const [wahaUrl, setWahaUrl] = useState('');
  const [wahaApiKey, setWahaApiKey] = useState('');
  const [showWahaKey, setShowWahaKey] = useState(false);
  const [isSavingWaha, setIsSavingWaha] = useState(false);
  
  // WhatsApp API 2 state
  const [api2Url, setApi2Url] = useState('');
  const [api2ApiKey, setApi2ApiKey] = useState('');
  const [showApi2Key, setShowApi2Key] = useState(false);
  const [isSavingApi2, setIsSavingApi2] = useState(false);
  
  // PIX and Owner state
  const [waPixKey, setWaPixKey] = useState('');
  const [pixHolderName, setPixHolderName] = useState('');
  const [pixKeyType, setPixKeyType] = useState('');
  const [waOwnerPhone, setWaOwnerPhone] = useState('');
  const [isSavingOwner, setIsSavingOwner] = useState(false);

  // MercadoPago state
  const [mpPaymentCard, setMpPaymentCard] = useState(true);
  const [mpPaymentPix, setMpPaymentPix] = useState(false);
  const [mpPaymentBoleto, setMpPaymentBoleto] = useState(false);
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [mpPublicKey, setMpPublicKey] = useState('');
  const [mpEnvironment, setMpEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [showMpToken, setShowMpToken] = useState(false);
  const [isSavingMp, setIsSavingMp] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Asaas state
  const [asaasPaymentCard, setAsaasPaymentCard] = useState(false);
  const [asaasPaymentPix, setAsaasPaymentPix] = useState(false);
  const [asaasPaymentBoleto, setAsaasPaymentBoleto] = useState(true);
  const [asaasApiKey, setAsaasApiKey] = useState('');
  const [asaasEnvironment, setAsaasEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [showAsaasKey, setShowAsaasKey] = useState(false);
  const [isSavingAsaas, setIsSavingAsaas] = useState(false);
  const [copiedAsaasWebhook, setCopiedAsaasWebhook] = useState(false);
  const [isTestingAsaas, setIsTestingAsaas] = useState(false);

  // Stripe state
  const [stripePaymentCard, setStripePaymentCard] = useState(false);
  const [stripePaymentPix, setStripePaymentPix] = useState(true);
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeEnvironment, setStripeEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [showStripeKey, setShowStripeKey] = useState(false);
  const [isSavingStripe, setIsSavingStripe] = useState(false);
  const [copiedStripeWebhook, setCopiedStripeWebhook] = useState(false);
  const [isTestingStripe, setIsTestingStripe] = useState(false);

  // PagSeguro state
  const [pagseguroPaymentCard, setPagseguroPaymentCard] = useState(false);
  const [pagseguroPaymentPix, setPagseguroPaymentPix] = useState(true);
  const [pagseguroPaymentBoleto, setPagseguroPaymentBoleto] = useState(false);
  const [pagseguroToken, setPagseguroToken] = useState('');
  const [pagseguroEnvironment, setPagseguroEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [showPagseguroKey, setShowPagseguroKey] = useState(false);
  const [isSavingPagseguro, setIsSavingPagseguro] = useState(false);
  const [copiedPagseguroWebhook, setCopiedPagseguroWebhook] = useState(false);
  const [isTestingPagseguro, setIsTestingPagseguro] = useState(false);

  // AI state
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isSavingOpenAI, setIsSavingOpenAI] = useState(false);
  const [isSavingGemini, setIsSavingGemini] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [selectedAiProvider, setSelectedAiProvider] = useState<'openai' | 'gemini'>('gemini');

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-webhook`;
  const asaasWebhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-webhook`;
  const stripeWebhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`;
  const pagseguroWebhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pagseguro-webhook`;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const isConfigured = (keys: string[]) => {
    return keys.some(key => settings?.[key]);
  };

  useEffect(() => {
    if (settings) {
      // WhatsApp API Provider
      setSelectedApiProvider((settings['whatsapp_api_provider'] as 'api1' | 'api2') || 'api1');
      // API 1
      setWahaUrl(settings['waha_api_url'] || '');
      setWahaApiKey(settings['waha_api_key'] || '');
      // API 2
      setApi2Url(settings['api2_url'] || '');
      setApi2ApiKey(settings['api2_api_key'] || '');
      // PIX e Owner
      setWaPixKey(settings['wa_pix_key'] || settings['default_pix_key'] || '');
      setPixHolderName(settings['pix_holder_name'] || '');
      setPixKeyType(settings['pix_key_type'] || '');
      setWaOwnerPhone(settings['wa_owner_phone'] || '');
      // MercadoPago
      setMpAccessToken(settings['mp_access_token'] || '');
      setMpPublicKey(settings['mp_public_key'] || '');
      setMpEnvironment((settings['mp_environment'] as 'sandbox' | 'production') || 'sandbox');
      setMpPaymentCard(settings['mp_payment_card'] !== 'false');
      setMpPaymentPix(settings['mp_payment_pix'] === 'true');
      setMpPaymentBoleto(settings['mp_payment_boleto'] === 'true');
      // Asaas
      setAsaasApiKey(settings['asaas_api_key'] || '');
      setAsaasEnvironment((settings['asaas_environment'] as 'sandbox' | 'production') || 'sandbox');
      setAsaasPaymentCard(settings['asaas_payment_card'] === 'true');
      setAsaasPaymentPix(settings['asaas_payment_pix'] === 'true');
      setAsaasPaymentBoleto(settings['asaas_payment_boleto'] !== 'false');
      // Stripe
      setStripeSecretKey(settings['stripe_secret_key'] || '');
      setStripePublishableKey(settings['stripe_publishable_key'] || '');
      setStripeEnvironment((settings['stripe_environment'] as 'sandbox' | 'production') || 'sandbox');
      setStripePaymentCard(settings['stripe_payment_card'] === 'true');
      setStripePaymentPix(settings['stripe_payment_pix'] !== 'false');
      // PagSeguro
      setPagseguroToken(settings['pagseguro_token'] || '');
      setPagseguroEnvironment((settings['pagseguro_environment'] as 'sandbox' | 'production') || 'sandbox');
      setPagseguroPaymentCard(settings['pagseguro_payment_card'] === 'true');
      setPagseguroPaymentPix(settings['pagseguro_payment_pix'] !== 'false');
      setPagseguroPaymentBoleto(settings['pagseguro_payment_boleto'] === 'true');
      // AI
      setOpenaiApiKey(settings['openai_api_key'] || '');
      setGeminiApiKey(settings['gemini_api_key'] || '');
      setAiEnabled(settings['ai_enabled'] === 'true');
      setSelectedAiProvider((settings['ai_provider'] as 'openai' | 'gemini') || 'gemini');
    }
  }, [settings]);

  const handleSaveOwner = async () => {
    setIsSavingOwner(true);
    try {
      await updateMultipleSettings.mutateAsync({
        wa_pix_key: waPixKey,
        wa_owner_phone: waOwnerPhone.replace(/\D/g, ''),
      });
      toast.success('Configurações salvas com sucesso');
    } catch (err) {
      // errors handled in hook
    } finally {
      setIsSavingOwner(false);
    }
  };

  // Master-only: save API 1 configuration
  const handleSaveWaha = async () => {
    if (!isMaster) {
      toast.error('Somente o tenant Master pode configurar a API');
      return;
    }

    setIsSavingWaha(true);
    try {
      await updateMultipleSettings.mutateAsync({
        waha_api_url: wahaUrl,
        waha_api_key: wahaApiKey,
        whatsapp_api_provider: selectedApiProvider,
      });
      toast.success('API 1 salva com sucesso');
    } finally {
      setIsSavingWaha(false);
    }
  };

  // Master-only: save API 2 configuration
  const handleSaveApi2 = async () => {
    if (!isMaster) {
      toast.error('Somente o tenant Master pode configurar a API');
      return;
    }

    setIsSavingApi2(true);
    try {
      await updateMultipleSettings.mutateAsync({
        api2_url: api2Url,
        api2_api_key: api2ApiKey,
        whatsapp_api_provider: selectedApiProvider,
      });
      toast.success('API 2 salva com sucesso');
    } finally {
      setIsSavingApi2(false);
    }
  };

  // Save selected API provider
  const handleSaveApiProvider = async (provider: 'api1' | 'api2') => {
    setSelectedApiProvider(provider);
    try {
      await updateMultipleSettings.mutateAsync({
        whatsapp_api_provider: provider,
      });
      toast.success(`${provider === 'api1' ? 'API 1' : 'API 2'} selecionada como padrão`);
    } catch (err) {
      console.error('Error saving API provider:', err);
    }
  };

  // Tenant-level: allow Admin and Revenda (and Master) to set their PIX key
  const canConfigurePayments = (currentTenant?.type === 'master') || (currentTenant?.type === 'adm') || (currentTenant?.type === 'revenda');
  const [isSavingTenantPix, setIsSavingTenantPix] = useState(false);

  const handleSaveTenantPix = async () => {
    if (!canConfigurePayments) {
      toast.error('Permissão negada');
      return;
    }

    setIsSavingTenantPix(true);
    try {
      await updateMultipleSettings.mutateAsync({
        wa_pix_key: waPixKey,
        default_pix_key: waPixKey,
        pix_holder_name: pixHolderName,
        pix_key_type: pixKeyType,
      });
      toast.success('Configurações PIX salvas com sucesso');
    } finally {
      setIsSavingTenantPix(false);
    }
  };

  const handleSaveMercadoPago = async () => {
    setIsSavingMp(true);
    try {
      await updateMultipleSettings.mutateAsync({
        mp_access_token: mpAccessToken,
        mp_public_key: mpPublicKey,
        mp_environment: mpEnvironment,
        mp_payment_card: mpPaymentCard ? 'true' : 'false',
        mp_payment_pix: mpPaymentPix ? 'true' : 'false',
        mp_payment_boleto: mpPaymentBoleto ? 'true' : 'false',
        mp_enabled: mpAccessToken ? 'true' : 'false',
      });
    } finally {
      setIsSavingMp(false);
    }
  };

  const handleSaveAsaas = async () => {
    setIsSavingAsaas(true);
    try {
      await updateMultipleSettings.mutateAsync({
        asaas_api_key: asaasApiKey,
        asaas_environment: asaasEnvironment,
        asaas_payment_card: asaasPaymentCard ? 'true' : 'false',
        asaas_payment_pix: asaasPaymentPix ? 'true' : 'false',
        asaas_payment_boleto: asaasPaymentBoleto ? 'true' : 'false',
        asaas_enabled: asaasApiKey ? 'true' : 'false',
      });
    } finally {
      setIsSavingAsaas(false);
    }
  };

  const handleSaveStripe = async () => {
    setIsSavingStripe(true);
    try {
      await updateMultipleSettings.mutateAsync({
        stripe_secret_key: stripeSecretKey,
        stripe_publishable_key: stripePublishableKey,
        stripe_environment: stripeEnvironment,
        stripe_payment_card: stripePaymentCard ? 'true' : 'false',
        stripe_payment_pix: stripePaymentPix ? 'true' : 'false',
        stripe_enabled: stripeSecretKey && stripePublishableKey ? 'true' : 'false',
      });
    } finally {
      setIsSavingStripe(false);
    }
  };

  const handleSaveOpenAI = async () => {
    setIsSavingOpenAI(true);
    try {
      await updateMultipleSettings.mutateAsync({
        openai_api_key: openaiApiKey,
      });
      toast.success('Chave OpenAI salva com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar chave OpenAI');
    } finally {
      setIsSavingOpenAI(false);
    }
  };

  const handleSaveGemini = async () => {
    setIsSavingGemini(true);
    try {
      await updateMultipleSettings.mutateAsync({
        gemini_api_key: geminiApiKey,
      });
      toast.success('Chave Gemini salva com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar chave Gemini');
    } finally {
      setIsSavingGemini(false);
    }
  };

  const handleSavePagseguro = async () => {
    setIsSavingPagseguro(true);
    try {
      await updateMultipleSettings.mutateAsync({
        pagseguro_token: pagseguroToken,
        pagseguro_environment: pagseguroEnvironment,
        pagseguro_payment_card: pagseguroPaymentCard ? 'true' : 'false',
        pagseguro_payment_pix: pagseguroPaymentPix ? 'true' : 'false',
        pagseguro_payment_boleto: pagseguroPaymentBoleto ? 'true' : 'false',
        pagseguro_enabled: pagseguroToken ? 'true' : 'false',
      });
    } finally {
      setIsSavingPagseguro(false);
    }
  };

  const handleSaveAi = async () => {
    setIsSavingAi(true);
    try {
      await updateMultipleSettings.mutateAsync({
        openai_api_key: openaiApiKey,
        gemini_api_key: geminiApiKey,
        ai_enabled: aiEnabled ? 'true' : 'false',
        ai_provider: selectedAiProvider,
      });
    } finally {
      setIsSavingAi(false);
    }
  };

  const handleTestMercadoPago = async () => {
    if (!mpAccessToken) {
      toast.error('Preencha o Access Token primeiro');
      return;
    }

    // Save first to ensure the token is in the database
    await handleSaveMercadoPago();

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('mp-test-connection', {
        body: { tenant_id: currentTenant?.id },
      });

      if (error) {
        toast.error('Erro ao testar conexão');
        return;
      }

      if (data?.success) {
        toast.success(`Conexão OK! Conta: ${data.account}`);
      } else {
        toast.error(data?.error || 'Token inválido ou sem permissão');
      }
    } catch {
      toast.error('Erro ao testar conexão');
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast.success('URL copiada!');
    setTimeout(() => setCopiedWebhook(false), 3000);
  };

  const handleCopyAsaasWebhook = () => {
    navigator.clipboard.writeText(asaasWebhookUrl);
    setCopiedAsaasWebhook(true);
    toast.success('URL do webhook Asaas copiada!');
    setTimeout(() => setCopiedAsaasWebhook(false), 3000);
  };

  const handleCopyStripeWebhook = () => {
    navigator.clipboard.writeText(stripeWebhookUrl);
    setCopiedStripeWebhook(true);
    toast.success('URL do webhook Stripe copiada!');
    setTimeout(() => setCopiedStripeWebhook(false), 3000);
  };

  const handleCopyPagseguroWebhook = () => {
    navigator.clipboard.writeText(pagseguroWebhookUrl);
    setCopiedPagseguroWebhook(true);
    toast.success('URL do webhook PagSeguro copiada!');
    setTimeout(() => setCopiedPagseguroWebhook(false), 3000);
  };

  const handleTestAsaas = async () => {
    if (!asaasApiKey) {
      toast.error('Preencha a API Key primeiro');
      return;
    }

    setIsTestingAsaas(true);
    try {
      const baseUrl = asaasEnvironment === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://sandbox.asaas.com/api/v3';

      const response = await fetch(`${baseUrl}/myAccount/commercialInfo`, {
        headers: { 'access_token': asaasApiKey },
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Conexão OK! Conta: ${data.tradingName || data.companyName || 'Verificada'}`);
      } else {
        toast.error('API Key inválida ou sem permissão');
      }
    } catch {
      toast.error('Erro ao testar conexão');
    } finally {
      setIsTestingAsaas(false);
    }
  };

  const handleTestStripe = async () => {
    if (!stripeSecretKey) {
      toast.error('Preencha a Secret Key primeiro');
      return;
    }

    setIsTestingStripe(true);
    try {
      const response = await fetch('https://api.stripe.com/v1/account', {
        headers: { 'Authorization': `Bearer ${stripeSecretKey}` },
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Conexão OK! Conta: ${data.email || data.business_profile?.name || 'Verificada'}`);
      } else {
        toast.error('Secret Key inválida ou sem permissão');
      }
    } catch {
      toast.error('Erro ao testar conexão');
    } finally {
      setIsTestingStripe(false);
    }
  };

  const handleTestPagseguro = async () => {
    if (!pagseguroToken) {
      toast.error('Preencha o Token primeiro');
      return;
    }

    setIsTestingPagseguro(true);
    try {
      const baseUrl = pagseguroEnvironment === 'production'
        ? 'https://api.pagseguro.com'
        : 'https://sandbox.api.pagseguro.com';

      const response = await fetch(`${baseUrl}/public-keys/card`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${pagseguroToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: 'card' })
      });

      if (response.ok || response.status === 200 || response.status === 201) {
        toast.success('Conexão OK! Token verificado');
      } else {
        toast.error('Token inválido ou sem permissão');
      }
    } catch {
      toast.error('Erro ao testar conexão');
    } finally {
      setIsTestingPagseguro(false);
    }
  };

  // Collapsible Header Component
  const IntegrationHeader = ({ 
    id, 
    icon: Icon, 
    iconColor, 
    title, 
    badge, 
    isOpen,
    configured 
  }: { 
    id: string;
    icon: React.ElementType; 
    iconColor: string; 
    title: string; 
    badge?: React.ReactNode;
    isOpen: boolean;
    configured: boolean;
  }) => (
    <CollapsibleTrigger asChild>
      <div className="flex items-center justify-between w-full p-4 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg">
        <div className="flex items-center gap-3">
          <Icon className={cn("w-5 h-5", iconColor)} />
          <span className="font-medium">{title}</span>
          {badge}
          {configured && (
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
              Configurado
            </Badge>
          )}
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </div>
    </CollapsibleTrigger>
  );

  return (
    <div className="space-y-3">
      {/* Owner Phone and PIX Key - Apenas Master */}
      {isMaster && (
        <Collapsible open={expandedSections['owner']} onOpenChange={() => toggleSection('owner')}>
          <Card>
            <IntegrationHeader
              id="owner"
              icon={Bot}
              iconColor="text-primary"
              title="IA - Configurações do Administrador"
              isOpen={expandedSections['owner']}
              configured={isConfigured(['wa_owner_phone', 'wa_pix_key'])}
            />
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <CardDescription>
                  Configure o número de WhatsApp do administrador e a chave PIX padrão
                </CardDescription>
                
                <div className="space-y-2">
                  <Label htmlFor="wa-owner-phone">Número do Administrador</Label>
                  <Input
                    id="wa-owner-phone"
                    placeholder="Ex: 5511999999999"
                    value={waOwnerPhone}
                    onChange={(e) => setWaOwnerPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Apenas este número terá acesso a dados sensíveis via IA: métricas, clientes, despesas, cobranças, etc.
                    Use o formato internacional sem espaços ou caracteres especiais.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveOwner} disabled={isSavingOwner}>
                    {isSavingOwner ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {isSavingOwner ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* WhatsApp - Only for Master */}
      {isMaster && (
        <Collapsible open={expandedSections['waha']} onOpenChange={() => toggleSection('waha')}>
          <Card>
            <IntegrationHeader
              id="waha"
              icon={MessageCircle}
              iconColor="text-green-600"
              title="WhatsApp - Conexão API"
              badge={<Badge variant="outline" className="text-xs">Apenas Master</Badge>}
              isOpen={expandedSections['waha']}
              configured={isConfigured(['waha_api_url', 'waha_api_key', 'api2_url', 'api2_api_key'])}
            />
            <CollapsibleContent>
              <CardContent className="space-y-6 pt-0">
                <CardDescription>
                  Configure a conexão com o servidor de mensagens WhatsApp
                </CardDescription>
                
                {/* Seletor de API */}
                <div className="space-y-3">
                  <Label>Selecione a API de WhatsApp</Label>
                  <div className="flex gap-3">
                    <Button
                      variant={selectedApiProvider === 'api1' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => handleSaveApiProvider('api1')}
                    >
                      API 1 {selectedApiProvider === 'api1' && '✓'}
                    </Button>
                    <Button
                      variant={selectedApiProvider === 'api2' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => handleSaveApiProvider('api2')}
                    >
                      API 2 {selectedApiProvider === 'api2' && '✓'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    API selecionada será usada para envio e recebimento de mensagens
                  </p>
                </div>

                <Separator />

                {/* API 1 Config */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">Configuração API 1</h4>
                    {selectedApiProvider === 'api1' && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Ativa</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="waha-url">URL da API 1</Label>
                    <Input
                      id="waha-url"
                      placeholder="https://seu-servidor.com"
                      value={wahaUrl}
                      onChange={(e) => setWahaUrl(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="waha-key">Token de Autenticação</Label>
                    <div className="relative">
                      <Input
                        id="waha-key"
                        type={showWahaKey ? 'text' : 'password'}
                        placeholder="Seu token de API"
                        value={wahaApiKey}
                        onChange={(e) => setWahaApiKey(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowWahaKey(!showWahaKey)}
                      >
                        {showWahaKey ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveWaha} disabled={isSavingWaha}>
                      {isSavingWaha ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {isSavingWaha ? 'Salvando...' : 'Salvar API 1'}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* API 2 Config */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">Configuração API 2</h4>
                    {selectedApiProvider === 'api2' && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Ativa</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="api2-url">URL da API 2</Label>
                    <Input
                      id="api2-url"
                      placeholder="https://seu-servidor.com"
                      value={api2Url}
                      onChange={(e) => setApi2Url(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api2-key">Token de Autenticação</Label>
                    <div className="relative">
                      <Input
                        id="api2-key"
                        type={showApi2Key ? 'text' : 'password'}
                        placeholder="Seu token de API"
                        value={api2ApiKey}
                        onChange={(e) => setApi2ApiKey(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowApi2Key(!showApi2Key)}
                      >
                        {showApi2Key ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveApi2} disabled={isSavingApi2}>
                      {isSavingApi2 ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {isSavingApi2 ? 'Salvando...' : 'Salvar API 2'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Tenant-level: PIX key (Admin, Revenda, Master) */}
      {canConfigurePayments && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Chave PIX</CardTitle>
            <CardDescription>Configure a chave PIX usada como padrão para pagamentos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pix-holder-name">👤 Nome do Titular</Label>
                <Input
                  id="pix-holder-name"
                  placeholder="Ex: BRGestor, Empresa LTDA"
                  value={pixHolderName}
                  onChange={(e) => setPixHolderName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pix-key-type">📋 Tipo da Chave</Label>
                <Select value={pixKeyType} onValueChange={setPixKeyType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CPF">CPF</SelectItem>
                    <SelectItem value="CNPJ">CNPJ</SelectItem>
                    <SelectItem value="Telefone">Telefone</SelectItem>
                    <SelectItem value="E-mail">E-mail</SelectItem>
                    <SelectItem value="Chave Aleatória">Chave Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wa-pix-key">🔑 Chave PIX</Label>
                <Input
                  id="wa-pix-key"
                  placeholder="Digite a chave"
                  value={waPixKey}
                  onChange={(e) => setWaPixKey(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSaveTenantPix} disabled={isSavingTenantPix}>
                {isSavingTenantPix ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isSavingTenantPix ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MercadoPago */}
      <Collapsible open={expandedSections['mp']} onOpenChange={() => toggleSection('mp')}>
        <Card>
          <IntegrationHeader
            id="mp"
            icon={CreditCard}
            iconColor="text-blue-600"
            title="MercadoPago"
            isOpen={expandedSections['mp']}
            configured={isConfigured(['mp_access_token'])}
          />
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <CardDescription>
                Configure sua conta MercadoPago para receber pagamentos
              </CardDescription>
              
              <div className="space-y-2">
                <Label htmlFor="mp-public-key">Public Key</Label>
                <Input
                  id="mp-public-key"
                  placeholder="APP_USR-xxxx..."
                  value={mpPublicKey}
                  onChange={(e) => setMpPublicKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Chave pública usada para pagamentos com cartão no frontend
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mp-token">Access Token</Label>
                <div className="relative">
                  <Input
                    id="mp-token"
                    type={showMpToken ? 'text' : 'password'}
                    placeholder="APP_USR-xxxx..."
                    value={mpAccessToken}
                    onChange={(e) => setMpAccessToken(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowMpToken(!showMpToken)}
                  >
                    {showMpToken ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mp-env">Ambiente</Label>
                <Select value={mpEnvironment} onValueChange={(v) => setMpEnvironment(v as 'sandbox' | 'production')}>
                  <SelectTrigger id="mp-env">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Sandbox</Badge>
                        <span>Testes</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="production">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Produção</Badge>
                        <span>Pagamentos reais</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Métodos de Pagamento Habilitados</Label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Cartão de Crédito</span>
                  </div>
                  <Switch checked={mpPaymentCard} onCheckedChange={setMpPaymentCard} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">PIX</span>
                  </div>
                  <Switch checked={mpPaymentPix} onCheckedChange={setMpPaymentPix} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Boleto</span>
                  </div>
                  <Switch checked={mpPaymentBoleto} onCheckedChange={setMpPaymentBoleto} />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={webhookUrl}
                    className="bg-muted font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyWebhook}>
                    {copiedWebhook ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleTestMercadoPago} disabled={isTesting}>
                  {isTesting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  {isTesting ? 'Testando...' : 'Testar Conexão'}
                </Button>
                <Button onClick={handleSaveMercadoPago} disabled={isSavingMp}>
                  {isSavingMp ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isSavingMp ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Asaas */}
      <Collapsible open={expandedSections['asaas']} onOpenChange={() => toggleSection('asaas')}>
        <Card>
          <IntegrationHeader
            id="asaas"
            icon={Wallet}
            iconColor="text-purple-600"
            title="Asaas"
            isOpen={expandedSections['asaas']}
            configured={isConfigured(['asaas_api_key'])}
          />
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <CardDescription>
                Configure sua conta Asaas para cobranças e boletos
              </CardDescription>
              
              <div className="space-y-2">
                <Label htmlFor="asaas-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="asaas-key"
                    type={showAsaasKey ? 'text' : 'password'}
                    placeholder="$aact_xxxx..."
                    value={asaasApiKey}
                    onChange={(e) => setAsaasApiKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowAsaasKey(!showAsaasKey)}
                  >
                    {showAsaasKey ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="asaas-env">Ambiente</Label>
                <Select value={asaasEnvironment} onValueChange={(v) => setAsaasEnvironment(v as 'sandbox' | 'production')}>
                  <SelectTrigger id="asaas-env">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Sandbox</Badge>
                        <span>Testes</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="production">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Produção</Badge>
                        <span>Cobranças reais</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Métodos de Pagamento Habilitados</Label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Cartão de Crédito</span>
                  </div>
                  <Switch checked={asaasPaymentCard} onCheckedChange={setAsaasPaymentCard} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">PIX</span>
                  </div>
                  <Switch checked={asaasPaymentPix} onCheckedChange={setAsaasPaymentPix} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Boleto</span>
                  </div>
                  <Switch checked={asaasPaymentBoleto} onCheckedChange={setAsaasPaymentBoleto} />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={asaasWebhookUrl}
                    className="bg-muted font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyAsaasWebhook}>
                    {copiedAsaasWebhook ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure este webhook no painel do Asaas: Minha conta → Integrações → Webhooks
                </p>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleTestAsaas} disabled={isTestingAsaas}>
                  {isTestingAsaas ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  {isTestingAsaas ? 'Testando...' : 'Testar Conexão'}
                </Button>
                <Button onClick={handleSaveAsaas} disabled={isSavingAsaas}>
                  {isSavingAsaas ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isSavingAsaas ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>

              <Separator />

              <div className="pt-2">
                <h4 className="font-medium mb-2">Como configurar o Asaas</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Acesse sua conta Asaas</li>
                  <li>Vá em "Minha conta" → "Integrações" → "API"</li>
                  <li>Copie sua API Key e cole acima</li>
                  <li>Configure o Webhook acima em "Integrações" → "Webhooks"</li>
                  <li>Marque os eventos: PAYMENT_CONFIRMED, PAYMENT_RECEIVED</li>
                </ol>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Stripe */}
      <Collapsible open={expandedSections['stripe']} onOpenChange={() => toggleSection('stripe')}>
        <Card>
          <IntegrationHeader
            id="stripe"
            icon={DollarSign}
            iconColor="text-indigo-600"
            title="Stripe"
            badge={
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Multi-moeda
              </Badge>
            }
            isOpen={expandedSections['stripe']}
            configured={isConfigured(['stripe_secret_key'])}
          />
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <CardDescription>
                Receba pagamentos internacionais em BRL, USD, EUR e mais
              </CardDescription>
              
              <div className="space-y-2">
                <Label htmlFor="stripe-key">Secret Key</Label>
                <div className="relative">
                  <Input
                    id="stripe-key"
                    type={showStripeKey ? 'text' : 'password'}
                    placeholder="sk_live_... ou sk_test_..."
                    value={stripeSecretKey}
                    onChange={(e) => setStripeSecretKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowStripeKey(!showStripeKey)}
                  >
                    {showStripeKey ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripe-publishable-key">Publishable Key (Chave Pública)</Label>
                <Input
                  id="stripe-publishable-key"
                  type="text"
                  placeholder="pk_live_... ou pk_test_..."
                  value={stripePublishableKey}
                  onChange={(e) => setStripePublishableKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Chave pública usada no frontend para pagamentos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripe-env">Ambiente</Label>
                <Select value={stripeEnvironment} onValueChange={(v) => setStripeEnvironment(v as 'sandbox' | 'production')}>
                  <SelectTrigger id="stripe-env">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Test</Badge>
                        <span>Modo Teste</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="production">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Live</Badge>
                        <span>Produção</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Moedas Suportadas</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">🇧🇷 BRL</Badge>
                  <Badge variant="secondary">🇺🇸 USD</Badge>
                  <Badge variant="secondary">🇪🇺 EUR</Badge>
                  <Badge variant="secondary">🇬🇧 GBP</Badge>
                  <Badge variant="secondary">🇨🇦 CAD</Badge>
                  <Badge variant="secondary">🇦🇺 AUD</Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Métodos de Pagamento Habilitados</Label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Cartão de Crédito</span>
                  </div>
                  <Switch checked={stripePaymentCard} onCheckedChange={setStripePaymentCard} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">PIX</span>
                  </div>
                  <Switch checked={stripePaymentPix} onCheckedChange={setStripePaymentPix} />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={stripeWebhookUrl}
                    className="bg-muted font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyStripeWebhook}>
                    {copiedStripeWebhook ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure no painel Stripe: Developers → Webhooks → Add endpoint
                </p>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleTestStripe} disabled={isTestingStripe}>
                  {isTestingStripe ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  {isTestingStripe ? 'Testando...' : 'Testar Conexão'}
                </Button>
                <Button onClick={handleSaveStripe} disabled={isSavingStripe}>
                  {isSavingStripe ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isSavingStripe ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>

              <Separator />

              <div className="pt-2">
                <h4 className="font-medium mb-2">Como configurar o Stripe</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Acesse dashboard.stripe.com</li>
                  <li>Vá em Developers → API Keys</li>
                  <li>Copie a Secret Key e cole acima</li>
                  <li>Vá em Developers → Webhooks → Add endpoint</li>
                  <li>Cole a URL do webhook e selecione os eventos: checkout.session.completed, payment_intent.succeeded, invoice.paid</li>
                </ol>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* PagSeguro */}
      <Collapsible open={expandedSections['pagseguro']} onOpenChange={() => toggleSection('pagseguro')}>
        <Card>
          <IntegrationHeader
            id="pagseguro"
            icon={CreditCard}
            iconColor="text-green-500"
            title="PagSeguro"
            isOpen={expandedSections['pagseguro']}
            configured={isConfigured(['pagseguro_token'])}
          />
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <CardDescription>
                Configure o PagSeguro para PIX, Boleto e Cartão de Crédito
              </CardDescription>
              
              <div className="space-y-2">
                <Label htmlFor="pagseguro-token">Token de Acesso</Label>
                <div className="relative">
                  <Input
                    id="pagseguro-token"
                    type={showPagseguroKey ? 'text' : 'password'}
                    placeholder="Seu token do PagSeguro"
                    value={pagseguroToken}
                    onChange={(e) => setPagseguroToken(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPagseguroKey(!showPagseguroKey)}
                  >
                    {showPagseguroKey ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pagseguro-env">Ambiente</Label>
                <Select value={pagseguroEnvironment} onValueChange={(v) => setPagseguroEnvironment(v as 'sandbox' | 'production')}>
                  <SelectTrigger id="pagseguro-env">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Sandbox</Badge>
                        <span>Testes</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="production">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Produção</Badge>
                        <span>Pagamentos reais</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Métodos de Pagamento Habilitados</Label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Cartão de Crédito</span>
                  </div>
                  <Switch checked={pagseguroPaymentCard} onCheckedChange={setPagseguroPaymentCard} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">PIX</span>
                  </div>
                  <Switch checked={pagseguroPaymentPix} onCheckedChange={setPagseguroPaymentPix} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Boleto</span>
                  </div>
                  <Switch checked={pagseguroPaymentBoleto} onCheckedChange={setPagseguroPaymentBoleto} />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={pagseguroWebhookUrl}
                    className="bg-muted font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyPagseguroWebhook}>
                    {copiedPagseguroWebhook ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure no painel PagSeguro: Minha Conta → Integrações → Notificações
                </p>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleTestPagseguro} disabled={isTestingPagseguro}>
                  {isTestingPagseguro ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  {isTestingPagseguro ? 'Testando...' : 'Testar Conexão'}
                </Button>
                <Button onClick={handleSavePagseguro} disabled={isSavingPagseguro}>
                  {isSavingPagseguro ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isSavingPagseguro ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>

              <Separator />

              <div className="pt-2">
                <h4 className="font-medium mb-2">Como configurar o PagSeguro</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Acesse pagseguro.uol.com.br</li>
                  <li>Vá em Minha Conta → Integrações → Autorizações</li>
                  <li>Gere um token de acesso e cole acima</li>
                  <li>Configure notificações em Integrações → Notificações</li>
                </ol>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* OpenAI - Only for Master */}
      {isMaster && (
        <Collapsible open={expandedSections['openai']} onOpenChange={() => toggleSection('openai')}>
          <Card>
            <IntegrationHeader
              id="openai"
              icon={Sparkles}
              iconColor="text-emerald-500"
              title="OpenAI"
              badge={<Badge variant="outline" className="text-xs">Apenas Master</Badge>}
              isOpen={expandedSections['openai']}
              configured={isConfigured(['openai_api_key'])}
            />
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <CardDescription>
                  Configure a API da OpenAI para funcionalidades com IA (GPT-4, ChatGPT)
                </CardDescription>
                
                <div className="space-y-2">
                  <Label htmlFor="openai-key">API Key</Label>
                  <div className="relative">
                    <Input
                      id="openai-key"
                      type={showOpenaiKey ? 'text' : 'password'}
                      placeholder="sk-..."
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                    >
                      {showOpenaiKey ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button onClick={handleSaveOpenAI} disabled={isSavingOpenAI} className="w-full">
                  {isSavingOpenAI ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Configurações OpenAI
                    </>
                  )}
                </Button>

                <Separator />

                <div className="pt-2">
                  <h4 className="font-medium mb-2">Como obter sua API Key</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Acesse platform.openai.com</li>
                    <li>Faça login ou crie uma conta</li>
                    <li>Vá em "API Keys" → "Create new secret key"</li>
                    <li>Copie a chave e cole acima</li>
                  </ol>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveOpenAI} disabled={isSavingOpenAI}>
                    {isSavingOpenAI ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar OpenAI
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Gemini - Only for Master */}
      {isMaster && (
        <Collapsible open={expandedSections['gemini']} onOpenChange={() => toggleSection('gemini')}>
          <Card>
            <IntegrationHeader
              id="gemini"
              icon={Bot}
              iconColor="text-blue-500"
              title="Google Gemini"
              badge={<Badge variant="outline" className="text-xs">Apenas Master</Badge>}
              isOpen={expandedSections['gemini']}
              configured={isConfigured(['gemini_api_key'])}
            />
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <CardDescription>
                  Configure a API do Google Gemini para funcionalidades com IA
                </CardDescription>
                
                <div className="space-y-2">
                  <Label htmlFor="gemini-key">API Key</Label>
                  <div className="relative">
                    <Input
                      id="gemini-key"
                      type={showGeminiKey ? 'text' : 'password'}
                      placeholder="AIza..."
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                    >
                      {showGeminiKey ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button onClick={handleSaveGemini} disabled={isSavingGemini} className="w-full">
                  {isSavingGemini ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Configurações Gemini
                    </>
                  )}
                </Button>

                <Separator />

                <div className="pt-2">
                  <h4 className="font-medium mb-2">Como obter sua API Key</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Acesse ai.google.dev</li>
                    <li>Clique em "Get API Key"</li>
                    <li>Crie ou selecione um projeto</li>
                    <li>Copie a chave e cole acima</li>
                  </ol>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* AI Configuration - Only for Master */}
      {isMaster && (
        <Collapsible open={expandedSections['ai-config']} onOpenChange={() => toggleSection('ai-config')}>
          <Card>
            <IntegrationHeader
              id="ai-config"
              icon={Sparkles}
              iconColor="text-gradient-to-r from-purple-500 to-pink-500"
              title="Configuração de IA"
              badge={<Badge variant="outline" className="text-xs">Apenas Master</Badge>}
              isOpen={expandedSections['ai-config']}
              configured={aiEnabled}
            />
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <CardDescription>
                  Escolha qual provedor de IA será usado nas funcionalidades do sistema
                </CardDescription>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="ai-enabled">Habilitar IA</Label>
                    <p className="text-xs text-muted-foreground">
                      Ativa funcionalidades com inteligência artificial
                    </p>
                  </div>
                  <Switch
                    id="ai-enabled"
                    checked={aiEnabled}
                    onCheckedChange={setAiEnabled}
                  />
                </div>

                {aiEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="ai-provider">Provedor de IA</Label>
                    <Select value={selectedAiProvider} onValueChange={(v) => setSelectedAiProvider(v as 'openai' | 'gemini')}>
                      <SelectTrigger id="ai-provider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-blue-500" />
                            <span>Google Gemini</span>
                            <Badge variant="secondary" className="ml-2 text-xs">Recomendado</Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="openai">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-500" />
                            <span>OpenAI (GPT-4)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Certifique-se de configurar a API Key do provedor selecionado acima
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={handleSaveAi} disabled={isSavingAi}>
                    {isSavingAi ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {isSavingAi ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
};
