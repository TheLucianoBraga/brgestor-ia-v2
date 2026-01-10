import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Global error handler for react-query
const onQueryError = (error: Error) => {
  console.error('Query error:', error);
  
  // Show user-friendly error message without page reload
  toast.error('Erro ao carregar dados', {
    description: 'Não foi possível carregar os dados. Tente novamente.',
  });
};

const onMutationError = (error: Error) => {
  console.error('Mutation error:', error);
  
  // Show user-friendly error message
  toast.error('Erro ao processar ação', {
    description: error.message || 'Ocorreu um erro. Tente novamente.',
  });
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes - keep data in cache longer
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: true, // Ensure data loads on component mount
    },
    mutations: {
      retry: false,
      onError: onMutationError,
    },
  },
});
