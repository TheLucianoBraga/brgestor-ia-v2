-- Criar função para atualizar senha em AMBOS os sistemas
-- Esta função atualiza customer_auth E auth.users se o cliente tiver um tenant vinculado
CREATE OR REPLACE FUNCTION public.update_customer_password_sync(
  p_customer_id uuid,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _customer record;
  _auth_record record;
  _user_id uuid;
  _password_hash text;
BEGIN
  -- Buscar cliente
  SELECT * INTO _customer FROM customers WHERE id = p_customer_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cliente não encontrado');
  END IF;
  
  -- Gerar hash da senha
  _password_hash := crypt(p_new_password, gen_salt('bf'));
  
  -- Atualizar customer_auth (portal)
  UPDATE customer_auth 
  SET password_hash = _password_hash,
      plain_password = p_new_password
  WHERE customer_id = p_customer_id;
  
  -- Se não existia, criar
  IF NOT FOUND THEN
    INSERT INTO customer_auth (customer_id, email, password_hash, plain_password, is_active)
    VALUES (p_customer_id, _customer.email, _password_hash, p_new_password, true);
  END IF;
  
  -- Verificar se cliente tem tenant vinculado (para login no app)
  IF _customer.customer_tenant_id IS NOT NULL THEN
    -- Buscar o user_id do owner desse tenant
    SELECT tm.user_id INTO _user_id
    FROM tenant_members tm
    WHERE tm.tenant_id = _customer.customer_tenant_id
    AND tm.role_in_tenant = 'owner'
    LIMIT 1;
    
    IF _user_id IS NOT NULL THEN
      -- Atualizar a senha no auth.users
      -- NOTA: Isso requer que a função tenha SECURITY DEFINER e acesso ao schema auth
      UPDATE auth.users 
      SET encrypted_password = _password_hash,
          updated_at = now()
      WHERE id = _user_id;
      
      RETURN jsonb_build_object(
        'success', true, 
        'updated_portal', true,
        'updated_app', true,
        'user_id', _user_id
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'updated_portal', true,
    'updated_app', false,
    'message', 'Cliente sem tenant vinculado - apenas portal atualizado'
  );
END;
$$;