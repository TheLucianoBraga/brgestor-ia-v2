/**
 * Normaliza o status de um serviço ou item para o padrão do sistema.
 * Aceita tanto 'ativo' (PT-BR) quanto 'active' (EN) e retorna 'active'.
 */
export const normalizeStatus = (status: string | null | undefined): string => {
  if (!status) return 'pending';
  
  const s = status.toLowerCase().trim();
  if (s === 'ativo' || s === 'active') return 'active';
  return s;
};

/**
 * Verifica se um status é considerado ativo.
 */
export const isActiveStatus = (status: string | null | undefined): boolean => {
  return normalizeStatus(status) === 'active';
};

/**
 * Retorna a configuração de exibição para um status.
 */
export const getStatusDisplayConfig = (status: string | null | undefined) => {
  const normalized = normalizeStatus(status);
  
  switch (normalized) {
    case 'active':
      return { label: 'Ativo', variant: 'default' as const, color: 'text-green-500' };
    case 'expired':
      return { label: 'Expirado', variant: 'destructive' as const, color: 'text-red-500' };
    case 'cancelled':
      return { label: 'Cancelado', variant: 'secondary' as const, color: 'text-gray-500' };
    case 'pending':
      return { label: 'Pendente', variant: 'outline' as const, color: 'text-yellow-500' };
    default:
      return { label: status || 'Pendente', variant: 'outline' as const, color: 'text-gray-500' };
  }
};
