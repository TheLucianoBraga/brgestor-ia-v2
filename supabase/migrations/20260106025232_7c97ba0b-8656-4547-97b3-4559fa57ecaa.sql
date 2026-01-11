-- Add missing types to constraint
ALTER TABLE public.message_templates DROP CONSTRAINT IF EXISTS message_templates_type_check;

ALTER TABLE public.message_templates ADD CONSTRAINT message_templates_type_check 
CHECK (type IN (
  'cobranca',
  'lembrete', 
  'confirmacao',
  'boas_vindas',
  'vence_hoje',
  'vencimento_hoje',
  'apos_vencimento',
  'renovacao',
  'cancelamento',
  'promocional',
  'cadastro_realizado',
  'outro',
  'pagamento_confirmado',
  'cancelar_ligacao',
  'cadastro_aprovado',
  'aviso_vencimento',
  'acesso_portal',
  'personalizado'
));