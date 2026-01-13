import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export const useTrialNotifications = () => {
  const { currentTenant } = useTenant();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentTenant?.trial_ends_at) return;

    const trialEnds = new Date(currentTenant.trial_ends_at);
    const now = new Date();
    const daysRemaining = differenceInDays(trialEnds, now);

    // Show toast notification for trial warnings
    const notificationKey = `trial_warning_${currentTenant.id}_${daysRemaining}`;
    const hasShown = sessionStorage.getItem(notificationKey);

    if (hasShown) return;

    if (daysRemaining <= 0) {
      toast.error('Seu período de trial expirou!', {
        description: 'Faça upgrade para continuar usando todas as funcionalidades.',
        duration: 10000,
        action: {
          label: 'Ver Planos',
          onClick: () => navigate('/app/meu_plano'),
        },
      });
      sessionStorage.setItem(notificationKey, 'true');
    } else if (daysRemaining === 1) {
      toast.warning('Seu trial expira amanhã!', {
        description: 'Aproveite para fazer upgrade e não perder acesso.',
        duration: 8000,
        action: {
          label: 'Ver Planos',
          onClick: () => navigate('/app/meu_plano'),
        },
      });
      sessionStorage.setItem(notificationKey, 'true');
    } else if (daysRemaining <= 3) {
      toast.info(`Seu trial expira em ${daysRemaining} dias`, {
        description: 'Considere fazer upgrade para manter todos os recursos.',
        duration: 6000,
        action: {
          label: 'Ver Planos',
          onClick: () => navigate('/app/meu_plano'),
        },
      });
      sessionStorage.setItem(notificationKey, 'true');
    }
  }, [currentTenant, navigate]);
};
