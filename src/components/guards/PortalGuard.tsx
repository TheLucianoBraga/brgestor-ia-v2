import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { Loader2 } from 'lucide-react';

interface PortalGuardProps {
  children: React.ReactNode;
  requireActiveService?: boolean;
}

export const PortalGuard: React.FC<PortalGuardProps> = ({ 
  children, 
  requireActiveService = false 
}) => {
  const { isAuthenticated: isCustomerAuthenticated, isLoading: isCustomerLoading, hasActiveService, isPreviewMode } = useCustomerAuth();
  const { isAuthenticated: isSupabaseAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { currentTenant, isLoading: isTenantLoading } = useTenant();
  const location = useLocation();

  // Check if user is authenticated via Supabase Auth with cliente tenant type
  const isClienteTenantUser = isSupabaseAuthenticated && currentTenant?.type === 'cliente';
  
  // Combined loading state - strictly check loading before any redirect
  const [isHardLoading, setIsHardLoading] = React.useState(true);
  const isLoading = isCustomerLoading || isAuthLoading || isTenantLoading;

  React.useEffect(() => {
    if (!isLoading) {
      // Add a small delay to ensure state is fully propagated
      const timer = setTimeout(() => {
        setIsHardLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setIsHardLoading(true);
    }
  }, [isLoading]);

  if (isHardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-primary/10 animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col items-center">
            <p className="text-sm font-black animate-pulse text-primary uppercase tracking-[0.2em]">BrGestor AI</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Preparando seu ambiente seguro...</p>
          </div>
        </div>
      </div>
    );
  }

  // In preview mode, always allow access
  if (isPreviewMode) {
    return <>{children}</>;
  }

  // Allow access if authenticated via CustomerAuth OR Supabase Auth with cliente tenant
  const isAuthenticated = isCustomerAuthenticated || isClienteTenantUser;

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Se não tem serviço ativo, restringe o acesso apenas à página de serviços e faturas
  const isPublicPortalPath = location.pathname === '/portal/servicos' || 
                            location.pathname === '/portal/meus-servicos' ||
                            location.pathname === '/portal/perfil';

  if (!hasActiveService && !isClienteTenantUser && !isPublicPortalPath) {
    return <Navigate to="/portal/servicos" replace />;
  }

  return <>{children}</>;
};
