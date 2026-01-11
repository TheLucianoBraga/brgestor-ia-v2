
-- Adicionar configurações indicando que os gateways estão habilitados (sem expor chaves)
-- Isso permite que a página pública saiba quais gateways estão disponíveis

-- Atualizar policy para incluir as flags de gateway habilitado
DROP POLICY IF EXISTS "Public can read payment gateway settings" ON public.tenant_settings;

CREATE POLICY "Public can read payment gateway settings"
ON public.tenant_settings
FOR SELECT
USING (
  key IN (
    -- Chaves públicas do Stripe (publishable key é sempre pública)
    'stripe_publishable_key',
    'stripe_payment_card',
    'stripe_payment_pix',
    'stripe_enabled',
    -- MercadoPago (public key é sempre pública)
    'mp_public_key',
    'mp_payment_card',
    'mp_payment_pix',
    'mp_payment_boleto',
    'mp_enabled',
    -- Asaas (apenas flags de métodos habilitados)
    'asaas_payment_card',
    'asaas_payment_pix',
    'asaas_payment_boleto',
    'asaas_enabled',
    -- PagSeguro (apenas flags de métodos habilitados)
    'pagseguro_payment_card',
    'pagseguro_payment_pix',
    'pagseguro_payment_boleto',
    'pagseguro_enabled',
    -- Logo
    'logo_url'
  )
);

-- Criar flags de habilitação baseadas na existência de chaves secretas
-- Para cada tenant que tem chaves configuradas, criar a flag "enabled"
INSERT INTO tenant_settings (tenant_id, key, value)
SELECT DISTINCT ts.tenant_id, 'stripe_enabled', 'true'
FROM tenant_settings ts
WHERE ts.key = 'stripe_secret_key' AND ts.value IS NOT NULL AND ts.value != ''
AND NOT EXISTS (SELECT 1 FROM tenant_settings ts2 WHERE ts2.tenant_id = ts.tenant_id AND ts2.key = 'stripe_enabled')
ON CONFLICT DO NOTHING;

INSERT INTO tenant_settings (tenant_id, key, value)
SELECT DISTINCT ts.tenant_id, 'mp_enabled', 'true'
FROM tenant_settings ts
WHERE ts.key = 'mp_access_token' AND ts.value IS NOT NULL AND ts.value != ''
AND NOT EXISTS (SELECT 1 FROM tenant_settings ts2 WHERE ts2.tenant_id = ts.tenant_id AND ts2.key = 'mp_enabled')
ON CONFLICT DO NOTHING;

INSERT INTO tenant_settings (tenant_id, key, value)
SELECT DISTINCT ts.tenant_id, 'asaas_enabled', 'true'
FROM tenant_settings ts
WHERE ts.key = 'asaas_api_key' AND ts.value IS NOT NULL AND ts.value != ''
AND NOT EXISTS (SELECT 1 FROM tenant_settings ts2 WHERE ts2.tenant_id = ts.tenant_id AND ts2.key = 'asaas_enabled')
ON CONFLICT DO NOTHING;

INSERT INTO tenant_settings (tenant_id, key, value)
SELECT DISTINCT ts.tenant_id, 'pagseguro_enabled', 'true'
FROM tenant_settings ts
WHERE ts.key = 'pagseguro_token' AND ts.value IS NOT NULL AND ts.value != ''
AND NOT EXISTS (SELECT 1 FROM tenant_settings ts2 WHERE ts2.tenant_id = ts.tenant_id AND ts2.key = 'pagseguro_enabled')
ON CONFLICT DO NOTHING;
