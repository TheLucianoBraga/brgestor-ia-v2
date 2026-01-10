
-- Adicionar policy para permitir leitura pública de configurações de gateway de pagamento
-- Necessário para que a página pública de fatura possa buscar as chaves do Stripe/MP/etc

CREATE POLICY "Public can read payment gateway settings"
ON public.tenant_settings
FOR SELECT
USING (
  key IN (
    'stripe_publishable_key',
    'stripe_payment_card',
    'stripe_payment_pix',
    'mp_public_key',
    'mp_payment_card',
    'mp_payment_pix',
    'mp_payment_boleto',
    'asaas_payment_card',
    'asaas_payment_pix',
    'asaas_payment_boleto',
    'pagseguro_payment_card',
    'pagseguro_payment_pix',
    'pagseguro_payment_boleto',
    'logo_url'
  )
);

-- Nota: Chaves secretas (stripe_secret_key, mp_access_token, asaas_api_key, pagseguro_token)
-- NÃO são expostas - apenas as configurações públicas de métodos habilitados
