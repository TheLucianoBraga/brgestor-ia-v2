import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

interface AccessStatus {
  has_access: boolean;
  tenant_type: string | null;
}

export const useClientAccess = () => {
  const { currentTenant } = useTenant();

  const { data: accessStatus, isLoading } = useQuery({
    queryKey: ['client-access', currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_current_tenant_access');

      if (error) throw error;
      return data as unknown as AccessStatus;
    },
    enabled: !!currentTenant,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Clientes precisam de assinatura ativa para acessar tudo
  const isClient = currentTenant?.type === 'cliente';
  const hasActiveAccess = accessStatus?.has_access ?? true;
  
  // Clientes sem acesso ativo precisam de assinatura
  const requiresSubscription = isClient && !hasActiveAccess;

  // Routes allowed for clients without active subscription
  const allowedRoutes = [
    '/app/servicos',    // Pode ver serviços disponíveis
    '/app/config',       // Pode editar perfil
    '/portal/servicos',  // Portal - ver serviços
    '/portal/perfil',    // Portal - editar perfil
  ];

  const isRouteAllowed = (pathname: string): boolean => {
    if (!requiresSubscription) return true;
    return allowedRoutes.some(route => pathname.startsWith(route));
  };

  return {
    hasActiveAccess,
    requiresSubscription,
    isLoading,
    isRouteAllowed,
    allowedRoutes,
    isClient,
  };
};