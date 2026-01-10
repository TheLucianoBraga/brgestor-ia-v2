-- Remove remaining dangerous open policies from customer_referrals
DROP POLICY IF EXISTS "System can insert referrals" ON public.customer_referrals;
DROP POLICY IF EXISTS "System can update referrals" ON public.customer_referrals;