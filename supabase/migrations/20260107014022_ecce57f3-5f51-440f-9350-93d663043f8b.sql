
-- Gerar customer_auth para clientes existentes que vieram de link cliente
DO $$
DECLARE
  rec RECORD;
  v_password TEXT;
  v_password_hash TEXT;
BEGIN
  FOR rec IN 
    SELECT c.id, c.email, c.full_name
    FROM customers c
    LEFT JOIN customer_auth ca ON ca.customer_id = c.id
    WHERE ca.id IS NULL
    AND c.email IS NOT NULL AND c.email != ''
    AND (c.notes ILIKE '%link%cliente%' OR c.notes ILIKE '%cadastro via link%')
  LOOP
    -- Gerar senha aleatória de 8 caracteres
    v_password := substring(md5(random()::text) from 1 for 8);
    v_password_hash := crypt(v_password, gen_salt('bf'));
    
    INSERT INTO customer_auth (
      customer_id,
      email,
      password_hash,
      plain_password,
      is_active
    ) VALUES (
      rec.id,
      LOWER(rec.email),
      v_password_hash,
      v_password,
      true
    );
    
    RAISE NOTICE 'Criado acesso para: % (%) - Senha: %', rec.full_name, rec.email, v_password;
  END LOOP;
END $$;

-- Atualizar status dos clientes que vieram de link cliente para 'active'
UPDATE customers 
SET status = 'active'
WHERE status = 'pending'
AND (notes ILIKE '%link%cliente%' OR notes ILIKE '%cadastro via link%')
AND EXISTS (SELECT 1 FROM customer_auth ca WHERE ca.customer_id = customers.id);
