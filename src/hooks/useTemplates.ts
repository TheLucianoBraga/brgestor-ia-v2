import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { logActivityDirect } from '@/hooks/useActivityLog';

export type TemplateChannel = 'whatsapp' | 'email' | 'in_app';

export interface MessageTemplate {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  content: string;
  image_url: string | null;
  audio_url: string | null;
  is_active: boolean;
  channel: TemplateChannel;
  created_at: string;
}

export interface TemplateInsert {
  name: string;
  type: string;
  content: string;
  image_url?: string | null;
  audio_url?: string | null;
  is_active?: boolean;
  channel?: TemplateChannel;
}

export const TEMPLATE_CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle' },
  { value: 'email', label: 'E-mail', icon: 'Mail' },
  { value: 'in_app', label: 'In-App', icon: 'Bell' },
] as const;

export interface TemplateUpdate extends Partial<TemplateInsert> {
  id: string;
}

export const TEMPLATE_TYPES = [
  { value: 'aviso_vencimento', label: 'Aviso de Vencimento' },
  { value: 'vence_hoje', label: 'Vencimento Hoje' },
  { value: 'apos_vencimento', label: 'Após Vencimento' },
  { value: 'cobranca', label: 'Cobrança' },
  { value: 'boas_vindas', label: 'Boas-vindas' },
  { value: 'cadastro_realizado', label: 'Cadastro Realizado' },
  { value: 'cadastro_aprovado', label: 'Cadastro Aprovado' },
  { value: 'acesso_portal', label: 'Acesso ao Portal' },
  { value: 'pagamento_confirmado', label: 'Pagamento Confirmado' },
  { value: 'renovacao', label: 'Renovação' },
  { value: 'cancelamento', label: 'Cancelamento' },
  { value: 'cancelar_ligacao', label: 'Recusa de Ligação' },
  { value: 'personalizado', label: 'Personalizado' },
] as const;

export interface TemplateVariable {
  key: string;
  label: string;
  example: string;
}

export interface TemplateVariableCategory {
  name: string;
  icon: string;
  variables: TemplateVariable[];
}

export const TEMPLATE_VARIABLE_CATEGORIES: TemplateVariableCategory[] = [
  {
    name: 'Dados Pessoais',
    icon: 'User',
    variables: [
      { key: '{primeiro_nome}', label: 'Primeiro Nome', example: 'João' },
      { key: '{nome}', label: 'Nome Completo', example: 'João Silva' },
      { key: '{whatsapp}', label: 'WhatsApp', example: '(11) 99999-9999' },
      { key: '{whatsapp_secundario}', label: 'WhatsApp 2', example: '(11) 88888-8888' },
      { key: '{email}', label: 'E-mail', example: 'cliente@email.com' },
      { key: '{cpf_cnpj}', label: 'CPF/CNPJ', example: '123.456.789-00' },
      { key: '{rg_ie}', label: 'RG/IE', example: '12.345.678-9' },
      { key: '{nascimento}', label: 'Nascimento', example: '15/03/1990' },
      { key: '{genero}', label: 'Gênero', example: 'Masculino' },
      { key: '{senha_portal}', label: 'Senha Portal', example: '******' },
      { key: '{link_portal}', label: 'Link Portal', example: 'https://portal.brgestor.com' },
    ]
  },
  {
    name: 'Produto',
    icon: 'Package',
    variables: [
      { key: '{produto}', label: 'Produto', example: 'Plano Premium' },
      { key: '{plano}', label: 'Plano', example: 'Mensal' },
    ]
  },
  {
    name: 'Serviço',
    icon: 'Wrench',
    variables: [
      { key: '{servico}', label: 'Serviço', example: 'Internet 100MB' },
      { key: '{status_servico}', label: 'Status Serviço', example: 'Ativo' },
    ]
  },
  {
    name: 'Cobrança',
    icon: 'CreditCard',
    variables: [
      { key: '{valor}', label: 'Valor', example: 'R$ 99,90' },
      { key: '{desconto}', label: 'Desconto', example: 'R$ 10,00' },
      { key: '{valor_total_desconto}', label: 'Valor c/ Desconto', example: 'R$ 89,90' },
      { key: '{vencimento}', label: 'Vencimento', example: '15/01/2026' },
      { key: '{dias}', label: 'Dias p/ Vencer', example: '3' },
      { key: '{pix}', label: 'Código PIX', example: '00020126580014br...' },
      { key: '{link_pagamento}', label: 'Link Pagamento', example: 'https://pay.example.com/abc' },
      { key: '{data_cadastro}', label: 'Data Cadastro', example: '01/01/2026' },
    ]
  },
  {
    name: 'Endereço',
    icon: 'MapPin',
    variables: [
      { key: '{cep}', label: 'CEP', example: '01310-100' },
      { key: '{rua}', label: 'Rua', example: 'Av. Paulista' },
      { key: '{numero}', label: 'Número', example: '1000' },
      { key: '{complemento}', label: 'Complemento', example: 'Sala 101' },
      { key: '{bairro}', label: 'Bairro', example: 'Bela Vista' },
      { key: '{cidade}', label: 'Cidade', example: 'São Paulo' },
      { key: '{estado}', label: 'Estado', example: 'SP' },
    ]
  },
  {
    name: 'Veículo',
    icon: 'Car',
    variables: [
      { key: '{placa}', label: 'Placa', example: 'ABC-1234' },
      { key: '{marca}', label: 'Marca', example: 'Toyota' },
      { key: '{modelo}', label: 'Modelo', example: 'Corolla' },
      { key: '{ano}', label: 'Ano', example: '2023' },
      { key: '{cor}', label: 'Cor', example: 'Prata' },
      { key: '{renavam}', label: 'Renavam', example: '12345678901' },
    ]
  },
  {
    name: 'Áudio',
    icon: 'Mic',
    variables: [
      { key: '{audio_url}', label: 'URL do Áudio', example: 'https://...' },
    ]
  },
  {
    name: 'Outros',
    icon: 'FileText',
    variables: [
      { key: '{periodo_dia}', label: 'Período do Dia', example: 'Bom dia' },
      { key: '{observacoes}', label: 'Observações', example: 'Cliente VIP' },
      { key: '{empresa}', label: 'Empresa', example: 'Minha Empresa' },
    ]
  },
];

// Flat list for backward compatibility
export const TEMPLATE_VARIABLES: TemplateVariable[] = TEMPLATE_VARIABLE_CATEGORIES.flatMap(cat => cat.variables);

// Variáveis que devem mostrar "R$ 0,00" quando vazias
const DISCOUNT_VARIABLES = ['{desconto}', '{valor_total_desconto}'];

/**
 * Processa as variáveis do template substituindo pelos valores reais
 * - Variáveis de desconto vazias são substituídas por "R$ 0,00"
 * - Outras variáveis vazias são removidas (string vazia)
 */
export const processTemplateVariables = (
  template: string,
  variables: Record<string, string | null | undefined>
): string => {
  let result = template;
  
  // Processar todas as variáveis conhecidas
  TEMPLATE_VARIABLES.forEach((v) => {
    const key = v.key;
    const variableKey = key.replace(/[{}]/g, ''); // Remove { e } para buscar no objeto
    const value = variables[variableKey] ?? variables[key] ?? null;
    
    if (value !== null && value !== undefined && value.trim() !== '') {
      // Se tem valor, substitui
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    } else {
      // Se não tem valor
      if (DISCOUNT_VARIABLES.includes(key)) {
        // Variáveis de desconto: substituir por "R$ 0,00"
        result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), 'R$ 0,00');
      } else {
        // Outras variáveis: remover (string vazia)
        result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), '');
      }
    }
  });
  
  return result;
};

export const useTemplates = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const templatesQuery = useQuery({
    queryKey: ['message-templates', currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MessageTemplate[];
    },
    enabled: !!currentTenant?.id,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: TemplateInsert) => {
      const { data, error } = await supabase
        .from('message_templates')
        .insert({
          ...template,
          tenant_id: currentTenant!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('Template criado com sucesso!');
      if (currentTenant?.id) {
        logActivityDirect(currentTenant.id, user?.id || null, 'create', 'template', {
          template_id: newTemplate.id,
          template_name: newTemplate.name,
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar template: ' + error.message);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...template }: TemplateUpdate) => {
      const { data, error } = await supabase
        .from('message_templates')
        .update(template)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('Template atualizado com sucesso!');
      if (currentTenant?.id) {
        logActivityDirect(currentTenant.id, user?.id || null, 'update', 'template', {
          template_id: updatedTemplate.id,
          template_name: updatedTemplate.name,
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar template: ' + error.message);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('Template excluído com sucesso!');
      if (currentTenant?.id) {
        logActivityDirect(currentTenant.id, user?.id || null, 'delete', 'template', {
          template_id: deletedId,
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir template: ' + error.message);
    },
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (template: MessageTemplate) => {
      const { data, error } = await supabase
        .from('message_templates')
        .insert({
          tenant_id: currentTenant!.id,
          name: `${template.name} (Cópia)`,
          type: template.type,
          content: template.content,
          image_url: template.image_url,
          audio_url: template.audio_url,
          is_active: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('Template duplicado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao duplicar template: ' + error.message);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('message_templates')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success(is_active ? 'Template ativado!' : 'Template desativado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao alterar status: ' + error.message);
    },
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    toggleActive,
  };
};
