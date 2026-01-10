-- Fix Function Search Path Mutable warnings

-- 1. authenticate_customer - add SET search_path
CREATE OR REPLACE FUNCTION public.authenticate_customer(_email text, _password_hash text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  _auth RECORD;
BEGIN
  SELECT ca.*, c.full_name, c.tenant_id, c.status as customer_status
  INTO _auth
  FROM public.customer_auth ca
  JOIN public.customers c ON c.id = ca.customer_id
  WHERE ca.email = _email 
    AND (ca.password_hash = _password_hash OR ca.plain_password = _password_hash)
    AND ca.is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Email ou senha inválidos');
  END IF;

  IF _auth.customer_status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Conta inativa');
  END IF;

  -- Update last login
  UPDATE public.customer_auth SET last_login = now() WHERE id = _auth.id;

  RETURN json_build_object(
    'success', true,
    'customer_id', _auth.customer_id,
    'customer_name', _auth.full_name,
    'tenant_id', _auth.tenant_id,
    'email', _auth.email
  );
END;
$function$;

-- 2. log_expense_changes - add SET search_path
CREATE OR REPLACE FUNCTION public.log_expense_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log mudanças de status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.expense_history (expense_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'status_change', 'status', OLD.status, NEW.status, auth.uid());
    END IF;
    
    -- Log mudanças de valor
    IF OLD.amount IS DISTINCT FROM NEW.amount THEN
      INSERT INTO public.expense_history (expense_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'amount_change', 'amount', OLD.amount::text, NEW.amount::text, auth.uid());
    END IF;
    
    -- Log pagamento
    IF OLD.paid_at IS NULL AND NEW.paid_at IS NOT NULL THEN
      INSERT INTO public.expense_history (expense_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'marked_paid', 'paid_at', NULL, NEW.paid_at::text, auth.uid());
    END IF;
    
    -- Log mudança de vencimento
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      INSERT INTO public.expense_history (expense_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'due_date_change', 'due_date', OLD.due_date::text, NEW.due_date::text, auth.uid());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. update_expense_status - add SET search_path
CREATE OR REPLACE FUNCTION public.update_expense_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- Só atualiza se não estiver pago ou cancelado
  IF NEW.status NOT IN ('paid', 'cancelled') THEN
    IF NEW.paid_at IS NOT NULL THEN
      NEW.status = 'paid';
    ELSIF NEW.due_date = CURRENT_DATE THEN
      NEW.status = 'due_today';
    ELSIF NEW.due_date < CURRENT_DATE THEN
      NEW.status = 'overdue';
    ELSIF NEW.is_recurring AND NEW.due_date > CURRENT_DATE THEN
      NEW.status = 'scheduled';
    ELSE
      NEW.status = 'pending';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4. update_expense_updated_at - add SET search_path
CREATE OR REPLACE FUNCTION public.update_expense_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;