import React from 'react';
import { Menu, Bell, Eye, EyeOff } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import defaultLogo from '@/assets/logo.png';
import { ThemeToggleSimple } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { currentTenant } = useTenant();
  const { isPreviewMode, enterPreviewMode, exitPreviewMode } = useCustomerAuth();
  const { settings } = useTenantSettings();
  const { unreadCount } = useNotifications();

  const tenantLogo = settings?.['logo_url'] || defaultLogo;
  const canViewPortal = ['master', 'adm', 'revenda'].includes(currentTenant?.type || '');
  const isInPortal = location.pathname.startsWith('/portal');

  const handleToggleView = () => {
    if (isInPortal || isPreviewMode) {
      exitPreviewMode();
      navigate('/app/dashboard');
      toast.success('Voltou ao modo Gestor');
    } else {
      if (currentTenant) {
        enterPreviewMode(currentTenant.id, currentTenant.name, user?.email || '');
        navigate('/portal/dashboard');
        toast.success('Visualizando Portal do Cliente');
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = profile?.full_name || user?.email || 'Usuário';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
      <div className="h-14 bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg flex items-center justify-between px-3">
        
        {/* Menu Button */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onMenuClick}
          className="h-10 w-10 rounded-xl hover:bg-secondary/50"
        >
          <Menu className="w-6 h-6 text-foreground" />
        </Button>

        {/* Logo */}
        <div className="flex items-center gap-2" onClick={() => navigate('/app/dashboard')}>
          <img 
            src={tenantLogo} 
            alt={currentTenant?.name || 'BRGestor'} 
            className="h-7 w-auto max-w-[80px] object-contain"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <ThemeToggleSimple />

          {/* Preview Button */}
          {canViewPortal && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleView}
              className={cn(
                "h-9 w-9 rounded-xl transition-all",
                isPreviewMode ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}
            >
              {isPreviewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}

          {/* Notifications Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app/notificacoes')}
            className="h-9 w-9 rounded-xl relative"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white dark:border-black" />
            )}
          </Button>
          
          {/* User Avatar */}
          <Avatar className="h-8 w-8 border border-white/20 shadow-sm">
            <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
