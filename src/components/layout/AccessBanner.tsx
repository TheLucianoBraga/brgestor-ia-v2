import React from 'react';
import { AlertTriangle, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AccessBannerProps {
  show: boolean;
}

export const AccessBanner: React.FC<AccessBannerProps> = ({ show }) => {
  const navigate = useNavigate();

  if (!show) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <span className="font-medium">Acesso limitado:</span>{' '}
            Assine um serviço para desbloquear todas as funcionalidades.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate('/app/servicos')}
          className="btn-gradient-primary flex-shrink-0"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Ver Serviços
        </Button>
      </div>
    </div>
  );
};
