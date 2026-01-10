import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTenant, Tenant } from '@/contexts/TenantContext';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedTypes: Tenant['type'][];
  redirectTo?: string;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  allowedTypes,
  redirectTo = '/app/dashboard',
}) => {
  const { currentTenant, isLoading } = useTenant();

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentTenant || !allowedTypes.includes(currentTenant.type)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};
