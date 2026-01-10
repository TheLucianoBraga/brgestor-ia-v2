-- Adicionar política para permitir leitura pública de planos ativos na landing page
CREATE POLICY "Public can view active plans" 
ON public.plans 
FOR SELECT 
USING (active = true);