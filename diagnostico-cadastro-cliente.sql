-- 🔧 DIAGNÓSTICO: Erro ao cadastrar cliente

-- 1. Verificar se as tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('customers', 'customer_auth', 'customer_addresses', 'customer_vehicles', 'customer_items', 'customer_referral_links')
ORDER BY table_name;

-- 2. Verificar estrutura da tabela customers
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'customers'
ORDER BY ordinal_position;

-- 3. Verificar se a função create_customer_with_auth existe
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname LIKE '%customer%auth%'
ORDER BY p.proname;

-- 4. Verificar se existe extensão pgcrypto
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- 5. Testar criação de cliente SEM senha (modo normal)
-- TESTE 1: Criar cliente simples
DO $$
DECLARE
  v_test_customer_id UUID;
  v_test_tenant_id UUID;
BEGIN
  -- Pegar primeiro tenant disponível
  SELECT id INTO v_test_tenant_id FROM tenants LIMIT 1;
  
  -- Tentar inserir cliente teste
  INSERT INTO customers (
    tenant_id,
    full_name,
    whatsapp,
    email,
    status
  ) VALUES (
    v_test_tenant_id,
    'TESTE - Cliente Diagnóstico',
    '+5511999999999',
    'teste@diagnost ico.com',
    'active'
  )
  RETURNING id INTO v_test_customer_id;
  
  RAISE NOTICE 'Cliente teste criado com sucesso: %', v_test_customer_id;
  
  -- Deletar imediatamente
  DELETE FROM customers WHERE id = v_test_customer_id;
  RAISE NOTICE 'Cliente teste removido';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERRO ao criar cliente: %', SQLERRM;
END;
$$;

-- 6. Verificar constraints que podem estar bloqueando
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('customers', 'customer_auth', 'customer_addresses')
  AND tc.constraint_type IN ('FOREIGN KEY', 'UNIQUE', 'CHECK')
ORDER BY tc.table_name, tc.constraint_type;

-- 7. Verificar triggers na tabela customers
SELECT 
  event_object_table AS table_name,
  trigger_name,
  event_manipulation AS event,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('customers', 'customer_auth')
ORDER BY event_object_table, trigger_name;

-- 8. Verificar RLS (Row Level Security) policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('customers', 'customer_auth', 'customer_addresses', 'customer_vehicles', 'customer_items')
ORDER BY tablename, policyname;

-- 9. Verificar se há dados órfãos
SELECT 
  'customer_addresses' as tabela,
  COUNT(*) as registros_orfaos
FROM customer_addresses ca
LEFT JOIN customers c ON c.id = ca.customer_id
WHERE c.id IS NULL
UNION ALL
SELECT 
  'customer_vehicles',
  COUNT(*)
FROM customer_vehicles cv
LEFT JOIN customers c ON c.id = cv.customer_id
WHERE c.id IS NULL
UNION ALL
SELECT 
  'customer_items',
  COUNT(*)
FROM customer_items ci
LEFT JOIN customers c ON c.id = ci.customer_id
WHERE c.id IS NULL;

-- 10. Verificar últimos erros na tabela (se existir log)
-- Se você tiver uma tabela de logs, adapte esta query
SELECT 
  c.id,
  c.full_name,
  c.email,
  c.created_at
FROM customers c
ORDER BY c.created_at DESC
LIMIT 5;

-- ====================================
-- CORREÇÕES COMUNS
-- ====================================

-- Se a função create_customer_with_auth não existir, rode:
-- (Já existe na migration 20260108164543, mas se sumir...)
/*
CREATE OR REPLACE FUNCTION public.create_customer_with_auth(
  p_tenant_id uuid,
  p_full_name text,
  p_email text,
  p_whatsapp text,
  p_password text,
  p_cpf_cnpj text DEFAULT NULL,
  p_birth_date text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_pix_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id UUID;
  v_password_hash TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM customer_auth WHERE email = LOWER(p_email)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este e-mail já está cadastrado.');
  END IF;
  
  IF EXISTS (SELECT 1 FROM customers WHERE whatsapp = p_whatsapp AND tenant_id = p_tenant_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'WhatsApp já cadastrado.');
  END IF;
  
  v_password_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));
  
  INSERT INTO customers (tenant_id, full_name, email, whatsapp, cpf_cnpj, birth_date, notes, pix_key, status)
  VALUES (p_tenant_id, p_full_name, LOWER(p_email), p_whatsapp, NULLIF(p_cpf_cnpj, ''), 
          CASE WHEN p_birth_date IS NOT NULL AND p_birth_date != '' THEN p_birth_date::date ELSE NULL END,
          p_notes, p_pix_key, 'active')
  RETURNING id INTO v_customer_id;
  
  INSERT INTO customer_auth (customer_id, email, password_hash, plain_password, is_active)
  VALUES (v_customer_id, LOWER(p_email), v_password_hash, p_password, true);
  
  INSERT INTO customer_referral_links (customer_id, tenant_id)
  VALUES (v_customer_id, p_tenant_id);
  
  RETURN jsonb_build_object('success', true, 'customer_id', v_customer_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Erro ao criar cliente: ' || SQLERRM);
END;
$function$;
*/
