import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { useChildTenants } from './useChildTenants';
import { useTenant } from '@/contexts/TenantContext';

interface CriticalTrialRevenda {
  id: string;
  name: string;
  daysRemaining: number;
  status: 'critical' | 'warning' | 'expired';
}

export const useRevendaTrialNotifications = () => {
  const { currentTenant } = useTenant();
  const { children } = useChildTenants();
  const navigate = useNavigate();

  // Filter only revendas with critical trial status
  const criticalRevendas = useMemo(() => {
    if (!children) return [];
    
    return children
      .filter(c => c.type === 'revenda' && c.trial_ends_at)
      .map(revenda => {
        const daysRemaining = differenceInDays(new Date(revenda.trial_ends_at!), new Date());
        let status: CriticalTrialRevenda['status'];
        
        if (daysRemaining < 0) {
          status = 'expired';
        } else if (daysRemaining <= 1) {
          status = 'critical';
        } else if (daysRemaining <= 3) {
          status = 'warning';
        } else {
          return null;
        }
        
        return {
          id: revenda.id,
          name: revenda.name,
          daysRemaining,
          status,
        };
      })
      .filter((r): r is CriticalTrialRevenda => r !== null);
  }, [children]);

  // Show toast notification for critical revendas
  useEffect(() => {
    if (!currentTenant || criticalRevendas.length === 0) return;
    
    // Only show for master and adm tenants
    if (currentTenant.type !== 'master' && currentTenant.type !== 'adm') return;

    const notificationKey = `revenda_trial_critical_${currentTenant.id}_${new Date().toDateString()}`;
    const hasShown = sessionStorage.getItem(notificationKey);

    if (hasShown) return;

    const expiredCount = criticalRevendas.filter(r => r.status === 'expired').length;
    const criticalCount = criticalRevendas.filter(r => r.status === 'critical').length;
    const warningCount = criticalRevendas.filter(r => r.status === 'warning').length;

    if (expiredCount > 0) {
      toast.error(`${expiredCount} revenda(s) com trial expirado!`, {
        description: 'Acesse a gestão de revendas para verificar.',
        duration: 10000,
        action: {
          label: 'Ver Revendas',
          onClick: () => navigate('/app/gestao_revendas'),
        },
      });
    } else if (criticalCount > 0) {
      toast.warning(`${criticalCount} revenda(s) com trial expirando amanhã!`, {
        description: 'Tome uma ação antes que o acesso seja perdido.',
        duration: 8000,
        action: {
          label: 'Ver Revendas',
          onClick: () => navigate('/app/gestao_revendas'),
        },
      });
    } else if (warningCount > 0) {
      toast.info(`${warningCount} revenda(s) com trial expirando em breve`, {
        description: 'Verifique as revendas em período crítico.',
        duration: 6000,
        action: {
          label: 'Ver Revendas',
          onClick: () => navigate('/app/gestao_revendas'),
        },
      });
    }

    sessionStorage.setItem(notificationKey, 'true');
  }, [currentTenant, criticalRevendas, navigate]);

  return {
    criticalRevendas,
    hasExpired: criticalRevendas.some(r => r.status === 'expired'),
    hasCritical: criticalRevendas.some(r => r.status === 'critical'),
    hasWarning: criticalRevendas.some(r => r.status === 'warning'),
    totalCritical: criticalRevendas.length,
  };
};
