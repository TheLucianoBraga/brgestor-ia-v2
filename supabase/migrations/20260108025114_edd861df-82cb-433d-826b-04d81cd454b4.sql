-- Create table to store plan features
CREATE TABLE public.plan_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_category TEXT NOT NULL,
  feature_subcategory TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan_id, feature_category, feature_subcategory, feature_name)
);

-- Enable RLS
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

-- Policy for viewing plan features (everyone with access to plans can view)
CREATE POLICY "Users can view plan features" 
ON public.plan_features 
FOR SELECT 
USING (true);

-- Policy for master tenants to manage plan features
CREATE POLICY "Master tenants can manage plan features" 
ON public.plan_features 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.plans p
    JOIN public.tenant_members tm ON tm.tenant_id = p.created_by_tenant_id
    JOIN public.tenants t ON t.id = tm.tenant_id
    WHERE p.id = plan_features.plan_id
    AND tm.user_id = auth.uid()
    AND t.type = 'master'
  )
);

-- Create index for faster lookups
CREATE INDEX idx_plan_features_plan_id ON public.plan_features(plan_id);