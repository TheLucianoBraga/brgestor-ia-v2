-- ============================================
-- CORREÇÃO: RLS de customers bloqueando INSERT
-- ============================================
-- O problema: A policy de INSERT verifica current_tenant_id(),
-- mas essa função pode retornar NULL se não houver context correto

-- 1. Dropar policy de INSERT existente
DROP POLICY IF EXISTS "Users can create customers in their tenant" ON public.customers;

-- 2. Recriar com lógica mais permissiva
-- Permite INSERT quando:
-- a) tenant_id = current_tenant_id() (caso normal - admin do tenant)
-- b) OU quando current_tenant_id() retorna NULL mas auth.uid() existe (service_role ou edge function)
-- c) OU quando tenant_id está sendo definido explicitamente no INSERT
CREATE POLICY "Users can create customers in their tenant" 
ON public.customers FOR INSERT 
WITH CHECK (
  -- Usuário autenticado
  auth.uid() IS NOT NULL
  AND (
    -- Tenant ID corresponde ao tenant do usuário
    tenant_id = current_tenant_id()
    OR
    -- Permite service_role/edge functions (quando current_tenant_id retorna NULL)
    (current_tenant_id() IS NULL AND auth.role() IN ('service_role', 'authenticated'))
    OR
    -- Usuário é membro do tenant sendo inserido
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = customers.tenant_id
      AND tm.user_id = auth.uid()
    )
  )
);

-- 3. Verificar se a função current_tenant_id existe, se não criar
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'current_tenant_id'
  ) THEN
    -- Criar função current_tenant_id se não existir
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.current_tenant_id()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $func$
        SELECT tenant_id 
        FROM tenant_members 
        WHERE user_id = auth.uid() 
        LIMIT 1
      $func$;
    ';
    RAISE NOTICE 'Função current_tenant_id criada';
  END IF;
END $$;

-- 4. Garantir permissões
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated, service_role, anon;

-- 5. Verificar resultado
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'customers'
  AND policyname = 'Users can create customers in their tenant';
  
  IF v_policy_count > 0 THEN
    RAISE NOTICE '✅ Policy de INSERT em customers recriada com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Falha ao criar policy de INSERT em customers';
  END IF;
END $$;
