import React from 'react';
import { Search, LogOut, Settings, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { TenantSwitcher } from './TenantSwitcher';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useTenant } from '@/contexts/TenantContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export const Topbar: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { currentTenant } = useTenant();
  const { isPreviewMode, enterPreviewMode, exitPreviewMode } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const canViewPortal = ['master', 'adm', 'revenda'].includes(currentTenant?.type || '');
  const isInPortal = location.pathname.startsWith('/portal');

  const handleLogout = async () => {
    await signOut();
    toast.success('Você saiu da sua conta');
    navigate('/auth/login');
  };

  const handleToggleView = () => {
    if (isInPortal || isPreviewMode) {
      // Exit preview mode and go back to app
      exitPreviewMode();
      navigate('/app/dashboard');
      toast.success('Voltou ao modo Gestor');
    } else {
      // Enter preview mode and go to portal
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
  const displayEmail = user?.email || '';

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Tenant Switcher */}
          <TenantSwitcher />
          
          <div className="hidden md:flex relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canViewPortal && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isPreviewMode ? "default" : "ghost"}
                  size="icon"
                  onClick={handleToggleView}
                  className={isPreviewMode ? "bg-primary text-primary-foreground" : ""}
                >
                  {isPreviewMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isPreviewMode ? 'Sair do Modo Preview' : 'Ver Portal do Cliente'}
              </TooltipContent>
            </Tooltip>
          )}
          
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-auto py-1.5 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{displayEmail}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/app/config')}>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/config')}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
