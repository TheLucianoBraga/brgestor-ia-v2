import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useClientAccess } from '@/hooks/useClientAccess';
import { toast } from 'sonner';

interface AccessGuardProps {
  children: React.ReactNode;
}

export const AccessGuard: React.FC<AccessGuardProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { requiresSubscription, isRouteAllowed, isLoading } = useClientAccess();

  useEffect(() => {
    if (isLoading) return;

    if (requiresSubscription && !isRouteAllowed(location.pathname)) {
      toast.warning('Assine um serviço para desbloquear esta funcionalidade', {
        id: 'access_required',
      });
      navigate('/app/servicos', { replace: true });
    }
  }, [requiresSubscription, location.pathname, isRouteAllowed, navigate, isLoading]);

  return <>{children}</>;
};
