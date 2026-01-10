-- Drop the existing check constraint
ALTER TABLE public.message_templates DROP CONSTRAINT IF EXISTS message_templates_type_check;

-- Add the new check constraint with more template types
ALTER TABLE public.message_templates ADD CONSTRAINT message_templates_type_check 
CHECK (type = ANY (ARRAY[
  'cobranca'::text, 
  'lembrete'::text, 
  'boas_vindas'::text, 
  'aviso'::text, 
  'personalizado'::text,
  'aviso_vencimento'::text,
  'cadastro_sucesso'::text,
  'cadastro_aprovado'::text,
  'pagamento_confirmado'::text,
  'confirmacao'::text,
  'renovacao'::text,
  'cancelamento'::text,
  'cancelar_ligacao'::text
]));