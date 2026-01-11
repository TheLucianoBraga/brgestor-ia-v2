import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { motion, AnimatePresence } from 'framer-motion';
import logoImage from '@/assets/logo.png';

interface AuthGuardProps {
  children: React.ReactNode;
  requireTenant?: boolean;
}

// Loading screen with smooth fade
const AuthLoadingScreen: React.FC<{ show: boolean }> = ({ show }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background"
        >
          <div className="flex flex-col items-center gap-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <img 
                src={logoImage} 
                alt="Logo" 
                className="h-16 w-auto"
              />
              <motion.div
                className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary/20 rounded-full overflow-hidden"
              >
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  style={{ width: '50%' }}
                />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requireTenant = true }) => {
  const { isAuthenticated, isLoading: authLoading, needsTenantSelection } = useAuth();
  const { currentTenant, isLoading: tenantLoading } = useTenant();
  const location = useLocation();
  
  // Combined loading state - NO ARTIFICIAL DELAYS
  const isLoading = authLoading || tenantLoading;

  // While loading, show loading screen - NO redirects
  if (isLoading) {
    return <AuthLoadingScreen show={true} />;
  }

  // Loading complete - now make auth decisions
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Redirect to tenant selection only if:
  // 1. requireTenant is true
  // 2. User needs to select a tenant (has no current_tenant_id)
  // 3. We're not already on the select-tenant page
  if (requireTenant && needsTenantSelection && location.pathname !== '/app/select-tenant') {
    return <Navigate to="/app/select-tenant" replace />;
  }

  // Redirect cliente type tenants from /app/* to portal
  if (currentTenant && currentTenant.type === 'cliente' && location.pathname.startsWith('/app')) {
    return <Navigate to="/portal/dashboard" replace />;
  }

  return <>{children}</>;
};
