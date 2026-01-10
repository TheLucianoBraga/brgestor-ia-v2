import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  LogOut, 
  User, 
  MessageCircle,
  ChevronRight,
  Eye,
  EyeOff,
  Bell,
  Building2,
  ChevronDown,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTenantNavigation, NavGroup } from '@/hooks/useTenantNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useNotifications } from '@/hooks/useNotifications';
import defaultLogo from '@/assets/logo.png';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const MobileNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { mobileNavItems } = useTenantNavigation();
  
  const isChatActive = location.pathname === '/app/chat';

  return (
    <>
      {/* Bottom Navigation - 5 items including chat */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-1">
          {mobileNavItems.slice(0, 4).map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-all touch-manipulation relative',
                  'min-h-[48px] min-w-[48px]',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -top-0.5 w-8 h-1 bg-primary rounded-full"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </AnimatePresence>
                
                <motion.div
                  animate={{ 
                    scale: isActive ? 1.1 : 1,
                    y: isActive ? -2 : 0 
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <item.icon className="w-5 h-5" />
                </motion.div>
                
                <span className={cn(
                  "text-[10px] font-medium transition-all",
                  isActive && "font-semibold"
                )}>
                  {item.title}
                </span>
              </NavLink>
            );
          })}
          
          {/* Chat Button - navigates to full page chat */}
          <button
            onClick={() => navigate('/app/chat')}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-all touch-manipulation relative',
              'min-h-[48px] min-w-[48px]',
              isChatActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            )}
          >
            <AnimatePresence>
              {isChatActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-0.5 w-8 h-1 bg-primary rounded-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </AnimatePresence>
            <MessageCircle className="w-5 h-5" />
            <span className={cn(
              "text-[10px] font-medium",
              isChatActive && "font-semibold"
            )}>Chat</span>
          </button>
        </div>
      </nav>
    </>
  );
};

// Mobile Header Component with Menu
interface MobileHeaderProps {
  onRefresh?: () => Promise<void>;
}

export const MobileHeader: React.FC<MobileHeaderProps> = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { currentTenant, userTenants, switchTenant } = useTenant();
  const { isPreviewMode, enterPreviewMode, exitPreviewMode } = useCustomerAuth();
  const { settings } = useTenantSettings();
  const { navigation } = useTenantNavigation();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  
  // Get tenant logo or use default
  const tenantLogo = settings?.['logo_url'] || defaultLogo;

  // Check if user can view portal
  const canViewPortal = ['master', 'adm', 'revenda'].includes(currentTenant?.type || '');
  const isInPortal = location.pathname.startsWith('/portal');

  const handleLogout = async () => {
    await signOut();
    toast.success('Você saiu da sua conta');
    navigate('/auth/login');
  };

  const handleToggleView = () => {
    setMenuOpen(false);
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

  const handleSwitchTenant = async (tenantId: string) => {
    const result = await switchTenant(tenantId);
    if (result.success) {
      const tenant = userTenants.find(t => t.id === tenantId);
      toast.success(`Trocou para ${tenant?.name || 'conta'}`);
    } else {
      toast.error('Erro ao trocar conta');
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

  const getTenantTypeLabel = (type?: string) => {
    switch (type) {
      case 'master': return 'Master';
      case 'adm': return 'Administrador';
      case 'revenda': return 'Revenda';
      case 'cliente': return 'Cliente';
      default: return '';
    }
  };

  return (
    <>
      {/* Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-card/95 backdrop-blur-md border-b border-border flex items-center justify-between px-3 pt-[env(safe-area-inset-top)]">
        {/* Menu Button */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          
          <SheetContent side="left" className="w-80 p-0 flex flex-col">
            {/* Menu Header with User Info */}
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{getTenantTypeLabel(currentTenant?.type)}</p>
                  {currentTenant?.name && (
                    <p className="text-xs text-primary truncate">{currentTenant.name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tenant Switcher - if more than 1 tenant */}
            {userTenants.length > 1 && (
              <div className="p-3 border-b border-border">
                <p className="px-1 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Trocar Conta
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span className="truncate">{currentTenant?.name}</span>
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64">
                    {userTenants.map((tenant) => (
                      <DropdownMenuItem
                        key={tenant.id}
                        onClick={() => handleSwitchTenant(tenant.id)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <div>
                            <p className="text-sm font-medium">{tenant.name}</p>
                            <p className="text-xs text-muted-foreground">{getTenantTypeLabel(tenant.type)}</p>
                          </div>
                        </div>
                        {tenant.id === currentTenant?.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            
            {/* Navigation Items */}
            <div className="flex-1 overflow-y-auto py-2">
              {navigation.map((group: NavGroup) => (
                <div key={group.label} className="mb-2">
                  <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </p>
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <NavLink
                        key={item.href}
                        to={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors',
                          isActive 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-muted'
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="flex-1">{item.title}</span>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </NavLink>
                    );
                  })}
                </div>
              ))}
            </div>
            
            {/* Menu Footer with Actions */}
            <div className="border-t border-border p-4 space-y-2">
              {/* Preview Portal Button */}
              {canViewPortal && (
                <Button 
                  variant={isPreviewMode ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    isPreviewMode && "bg-primary text-primary-foreground"
                  )}
                  onClick={handleToggleView}
                >
                  {isPreviewMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  {isPreviewMode ? 'Sair do Preview' : 'Ver Portal Cliente'}
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/app/config');
                }}
              >
                <User className="w-5 h-5" />
                Meu Perfil
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
                Sair
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo - from tenant settings or default */}
        <motion.img 
          src={tenantLogo} 
          alt={currentTenant?.name || 'BRGestor'} 
          className="h-8 w-auto max-w-[100px] object-contain"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        />
        
        {/* Right side actions */}
        <div className="flex items-center gap-1">
          {/* Preview Button */}
          {canViewPortal && (
            <Button
              variant={isPreviewMode ? "default" : "ghost"}
              size="icon"
              onClick={handleToggleView}
              className={cn(
                "h-9 w-9",
                isPreviewMode && "bg-primary text-primary-foreground"
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
            className="h-9 w-9 relative"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
          
          {/* User Avatar */}
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>
    </>
  );
};

// Swipe gesture hook for navigation
export const useSwipeNavigation = (onSwipeLeft?: () => void, onSwipeRight?: () => void) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
};
