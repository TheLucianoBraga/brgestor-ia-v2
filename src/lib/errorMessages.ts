/**
 * Mapeamento de mensagens de erro técnicas para mensagens amigáveis ao usuário
 */

const ERROR_MAPPINGS: Record<string, string> = {
  // Erros de banco de dados
  'function gen_salt(unknown) does not exist': 'Não foi possível concluir o cadastro no momento. Tente novamente.',
  'function crypt(unknown) does not exist': 'Não foi possível concluir o cadastro no momento. Tente novamente.',
  'duplicate key value violates unique constraint': 'Este registro já existe no sistema.',
  'violates foreign key constraint': 'Este registro está vinculado a outros dados e não pode ser alterado.',
  'null value in column': 'Por favor, preencha todos os campos obrigatórios.',
  'invalid input syntax': 'Formato de dados inválido. Verifique os campos preenchidos.',
  
  // Erros de autenticação
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Por favor, confirme seu e-mail antes de fazer login.',
  'User already registered': 'Este e-mail já está cadastrado.',
  'Password should be at least': 'A senha deve ter pelo menos 6 caracteres.',
  'Invalid email': 'Por favor, insira um e-mail válido.',
  
  // Erros de rede
  'Failed to fetch': 'Erro de conexão. Verifique sua internet e tente novamente.',
  'Network Error': 'Erro de conexão. Verifique sua internet e tente novamente.',
  'timeout': 'A operação demorou muito. Tente novamente.',
  'CORS': 'Erro de comunicação com o servidor.',
  
  // Erros genéricos
  'Internal Server Error': 'Erro interno do servidor. Tente novamente mais tarde.',
  '500': 'Erro interno do servidor. Tente novamente mais tarde.',
  '502': 'Servidor temporariamente indisponível. Tente novamente.',
  '503': 'Serviço temporariamente indisponível. Tente novamente.',
  '504': 'O servidor demorou muito para responder. Tente novamente.',
};

/**
 * Converte uma mensagem de erro técnica para uma mensagem amigável ao usuário
 */
export function getFriendlyErrorMessage(error: unknown): string {
  if (!error) {
    return 'Ocorreu um erro inesperado. Tente novamente.';
  }

  // Extrair mensagem do erro
  let errorMessage = '';
  
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    errorMessage = (errorObj.message as string) || (errorObj.error as string) || JSON.stringify(error);
  }

  // Se já é uma mensagem amigável do backend (não contém termos técnicos)
  if (isUserFriendlyMessage(errorMessage)) {
    return errorMessage;
  }

  // Verificar mapeamentos conhecidos
  for (const [pattern, friendlyMessage] of Object.entries(ERROR_MAPPINGS)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return friendlyMessage;
    }
  }

  // Se não encontrou mapeamento, retornar mensagem genérica
  // Log do erro original para debugging (apenas em desenvolvimento)
  if (import.meta.env.DEV) {
    console.error('Erro original:', errorMessage);
  }

  return 'Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.';
}

/**
 * Verifica se a mensagem já é amigável ao usuário (não contém termos técnicos)
 */
function isUserFriendlyMessage(message: string): boolean {
  const technicalTerms = [
    'function',
    'constraint',
    'column',
    'table',
    'syntax',
    'null value',
    'uuid',
    'schema',
    'relation',
    'query',
    'sql',
    'postgres',
    'supabase',
    'rpc',
    'fkey',
    'pkey',
    'idx_',
    'SQLERRM',
    'ERROR:',
    'HINT:',
  ];

  const lowerMessage = message.toLowerCase();
  return !technicalTerms.some(term => lowerMessage.includes(term.toLowerCase()));
}

/**
 * Formata erro para exibição em toast
 */
export function formatErrorForToast(error: unknown): { title: string; description?: string } {
  const message = getFriendlyErrorMessage(error);
  
  // Se a mensagem for longa, dividir em título e descrição
  if (message.length > 50) {
    const parts = message.split('. ');
    if (parts.length > 1) {
      return {
        title: parts[0],
        description: parts.slice(1).join('. '),
      };
    }
  }

  return { title: message };
}
