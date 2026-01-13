import React from 'react';
import { Bell, Search, Eye, EyeOff, LogOut, Settings, User, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown_menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { TenantSwitcher } from './TenantSwitcher';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useTenant } from '@/contexts/TenantContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { ThemeToggle } from '@/components/ui/theme_toggle';
import { cn } from '@/lib/utils';

export const DesktopHeader: React.FC = () => {
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

  const displayName = profile?.full_name || 'Luciano Braga';
  const displayEmail = user?.email || '';

  return (
    <header className="sticky top-0 z-30 w-full px-6 py-4">
      <div className="mx-auto flex h-16 items-center justify-between rounded-2xl border border-white/20 bg-white/70 px-6 shadow-lg backdrop-blur-xl dark:bg-black/40">
        
        {/* Left side - Tenant info */}
        <div className="flex items-center gap-4">
          <div className="p-1 bg-secondary/50 rounded-xl border border-border/50">
            <TenantSwitcher />
          </div>
        </div>

        {/* Center - Search (Modern Minimalist) */}
        <div className="flex-1 max-w-md mx-12 hidden lg:block">
          <div className="group relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Pesquisar em BRGestor..." 
              className="h-11 pl-11 bg-secondary/30 border-transparent focus:bg-background focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all rounded-xl"
            />
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <div className="p-1 bg-secondary/30 rounded-xl border border-transparent hover:border-border/50 transition-all">
            <ThemeToggle />
          </div>

          {/* Preview Mode */}
          {canViewPortal && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleToggleView}
                  className={cn(
                    "h-10 w-10 rounded-xl transition-all",
                    isPreviewMode 
                      ? "bg-primary/10 text-primary hover:bg-primary/20" 
                      : "text-muted-foreground hover:bg-secondary/50"
                  )}
                >
                  {isPreviewMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={10}>
                {isPreviewMode ? 'Sair do Modo Preview' : 'Ver Portal do Cliente'}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Notifications */}
          <div className="relative">
            <NotificationBell />
          </div>

          <div className="h-8 w-px bg-border/50 mx-1" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-12 flex items-center gap-3 px-2 hover:bg-secondary/50 rounded-xl transition-all group">
                <div className="relative">
                  <Avatar className="h-9 w-9 border-2 border-background shadow-sm group-hover:scale-105 transition-transform">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border-2 border-white rounded-full" />
                </div>
                <div className="text-left hidden xl:block">
                  <p className="text-sm font-bold text-foreground leading-none mb-1">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Administrador
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={15} className="w-64 p-2 bg-popover/95 backdrop-blur-xl border-border/50 rounded-2xl shadow-2xl animate-scale-in">
              <div className="px-3 py-4 mb-2 bg-secondary/30 rounded-xl">
                <p className="text-sm font-bold truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
              </div>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem onClick={() => navigate('/app/config')} className="h-11 rounded-lg cursor-pointer">
                <User className="mr-3 h-4 w-4 text-primary" />
                <span className="font-medium">Meu Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/config')} className="h-11 rounded-lg cursor-pointer">
                <Settings className="mr-3 h-4 w-4 text-primary" />
                <span className="font-medium">Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem onClick={handleLogout} className="h-11 rounded-lg cursor-pointer text-destructive focus:bg-destructive/5 focus:text-destructive">
                <LogOut className="mr-3 h-4 w-4" />
                <span className="font-bold">Sair da Conta</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DesktopHeader;
