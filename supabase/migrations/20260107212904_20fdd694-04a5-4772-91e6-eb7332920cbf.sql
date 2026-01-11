-- Create RPC function for renewal payments
CREATE OR REPLACE FUNCTION public.create_renewal_payment(
  _customer_item_id uuid,
  _months integer,
  _use_referral_credit boolean DEFAULT false,
  _referral_credit_amount numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item customer_items%ROWTYPE;
  v_customer customers%ROWTYPE;
  v_price numeric;
  v_total numeric;
  v_payment_id uuid;
  v_new_expires_at timestamptz;
  v_referral_link customer_referral_links%ROWTYPE;
BEGIN
  -- Get the customer item
  SELECT * INTO v_item FROM customer_items WHERE id = _customer_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item não encontrado');
  END IF;

  -- Get the customer
  SELECT * INTO v_customer FROM customers WHERE id = v_item.customer_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cliente não encontrado');
  END IF;

  -- Calculate price
  v_price := COALESCE(v_item.price, 0) * _months;
  v_total := v_price;

  -- Handle referral credit
  IF _use_referral_credit AND _referral_credit_amount > 0 THEN
    SELECT * INTO v_referral_link 
    FROM customer_referral_links 
    WHERE customer_id = v_customer.id 
      AND tenant_id = v_customer.tenant_id
    LIMIT 1;

    IF FOUND AND v_referral_link.available_balance >= _referral_credit_amount THEN
      v_total := v_total - _referral_credit_amount;
      
      -- Deduct from available balance
      UPDATE customer_referral_links 
      SET available_balance = available_balance - _referral_credit_amount
      WHERE id = v_referral_link.id;
    END IF;
  END IF;

  -- Ensure total is not negative
  IF v_total < 0 THEN
    v_total := 0;
  END IF;

  -- Calculate new expiration date (add to current expiration if still valid, otherwise from now)
  IF v_item.expires_at IS NOT NULL AND v_item.expires_at > now() THEN
    v_new_expires_at := v_item.expires_at + (_months || ' months')::interval;
  ELSE
    v_new_expires_at := now() + (_months || ' months')::interval;
  END IF;

  -- Create payment record
  INSERT INTO payments (
    seller_tenant_id,
    buyer_tenant_id,
    amount,
    status,
    description,
    metadata
  ) VALUES (
    v_customer.tenant_id,
    v_customer.customer_tenant_id,
    v_total,
    'pending',
    'Renovação: ' || v_item.product_name || ' (' || _months || ' meses)',
    jsonb_build_object(
      'type', 'renewal',
      'customer_item_id', _customer_item_id,
      'customer_id', v_customer.id,
      'months', _months,
      'new_expires_at', v_new_expires_at,
      'referral_credit_used', CASE WHEN _use_referral_credit THEN _referral_credit_amount ELSE 0 END
    )
  )
  RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object(
    'success', true, 
    'payment_id', v_payment_id,
    'amount', v_total,
    'new_expires_at', v_new_expires_at
  );
END;
$$;

-- Function to apply renewal after payment is confirmed
CREATE OR REPLACE FUNCTION public.apply_renewal_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metadata jsonb;
  v_customer_item_id uuid;
  v_new_expires_at timestamptz;
BEGIN
  -- Only process when payment becomes 'paid'
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    v_metadata := NEW.metadata;
    
    -- Check if this is a renewal payment
    IF v_metadata->>'type' = 'renewal' THEN
      v_customer_item_id := (v_metadata->>'customer_item_id')::uuid;
      v_new_expires_at := (v_metadata->>'new_expires_at')::timestamptz;
      
      -- Update the customer item with new expiration
      UPDATE customer_items 
      SET 
        expires_at = v_new_expires_at,
        status = 'active',
        due_date = v_new_expires_at
      WHERE id = v_customer_item_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to apply renewal when payment is confirmed
DROP TRIGGER IF EXISTS trigger_apply_renewal ON payments;
CREATE TRIGGER trigger_apply_renewal
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION apply_renewal_from_payment();