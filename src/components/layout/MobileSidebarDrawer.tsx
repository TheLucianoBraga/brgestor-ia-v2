import * as React from 'react';
import { useState } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { LogOut, User, Eye, EyeOff, Building2, ChevronDown, Check, X, ChevronRight, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import defaultLogo from '@/assets/logo.png';

interface MobileSidebarDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const MobileSidebarDrawer: React.FC<MobileSidebarDrawerProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { currentTenant, userTenants, switchTenant } = useTenant();
  const { isPreviewMode, enterPreviewMode, exitPreviewMode } = useCustomerAuth();
  const { mainNav, adminNav, hasAdminNav } = useTenantNavigation();
  const { settings } = useTenantSettings();
  const [adminOpen, setAdminOpen] = useState(false);

  // Get custom logo from settings
  const customLogo = settings?.['company_logo'] || defaultLogo;

  // Check if user can view portal
  const canViewPortal = ['master', 'adm', 'revenda'].includes(currentTenant?.type || '');
  const isInPortal = location.pathname.startsWith('/portal');

  const handleLogout = async () => {
    await signOut();
    toast.success('Você saiu da sua conta');
    navigate('/auth/login');
  };

  const handleToggleView = () => {
    onClose();
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

  const isActive = (href: string) => location.pathname === href;

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed left-0 top-0 bottom-0 w-72 z-[70] animate-in slide-in-from-left duration-300 flex flex-col bg-sidebar text-sidebar-foreground">
        {/* Header with Logo and Close */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <img 
              src={customLogo} 
              alt="Logo" 
              className="h-9 w-9 object-contain rounded-lg"
            />
            <span className="font-bold text-lg text-sidebar-foreground">BRGestor</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-sidebar-accent rounded-lg text-sidebar-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sidebar-foreground truncate">{displayName}</p>
              <p className="text-xs text-sidebar-muted">{getTenantTypeLabel(currentTenant?.type)}</p>
              {currentTenant?.name && (
                <p className="text-xs text-blue-400 truncate">{currentTenant.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tenant Switcher - if more than 1 tenant */}
        {userTenants.length > 1 && (
          <div className="p-3 border-b border-white/10">
            <p className="px-1 mb-2 text-xs font-semibold text-sidebar-muted uppercase tracking-wider">
              Trocar Conta
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80">
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

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-3 space-y-6">
            {/* Main Navigation */}
            {mainNav.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-sidebar-muted uppercase tracking-wider mb-2 px-3">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    const isPlanoPro = item.title === 'Plano PRO' || item.title === 'Meu Plano';
                    
                    return (
                      <NavLink
                        key={item.href}
                        to={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                          'hover:bg-sidebar-accent',
                          active && 'bg-sidebar-primary text-sidebar-primary-foreground',
                          !active && !isPlanoPro && 'text-sidebar-foreground/70 hover:text-sidebar-foreground',
                          isPlanoPro && 'text-amber-400 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30'
                        )}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="flex-1 truncate">{item.title}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs bg-amber-500 text-white">
                            {item.badge}
                          </Badge>
                        )}
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Admin Navigation */}
            {hasAdminNav && (
              <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      'hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground',
                      'border border-dashed border-sidebar-border'
                    )}
                  >
                    <Wrench className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1 text-left">Administração</span>
                    <ChevronDown className={cn(
                      'w-4 h-4 transition-transform',
                      adminOpen && 'rotate-180'
                    )} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-4">
                  {adminNav.map((group) => (
                    <div key={group.label}>
                      <p className="text-xs font-semibold text-sidebar-muted uppercase tracking-wider mb-2 px-3">
                        {group.label}
                      </p>
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const active = isActive(item.href);
                          return (
                            <NavLink
                              key={item.href}
                              to={item.href}
                              onClick={onClose}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                                'hover:bg-sidebar-accent',
                                active && 'bg-sidebar-primary text-sidebar-primary-foreground',
                                !active && 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
                              )}
                            >
                              <item.icon className="w-5 h-5 flex-shrink-0" />
                              <span className="flex-1 truncate">{item.title}</span>
                              <ChevronRight className="w-4 h-4 opacity-50" />
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </nav>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="border-t border-white/10 p-4 space-y-2">
          {/* Preview Portal Button */}
          {canViewPortal && (
            <Button 
              variant={isPreviewMode ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent",
                isPreviewMode && "bg-sidebar-primary hover:bg-sidebar-primary/80"
              )}
              onClick={handleToggleView}
            >
              {isPreviewMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              {isPreviewMode ? 'Sair do Preview' : 'Ver Portal Cliente'}
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => {
              onClose();
              navigate('/app/config');
            }}
          >
            <User className="w-5 h-5" />
            Meu Perfil
          </Button>
          <Button 
            variant="secondary" 
            className="w-full justify-start gap-3 text-red-500 hover:text-red-600 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 mt-4"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold">Sair da Conta</span>
          </Button>
        </div>
      </div>
    </>
  );
};

export default MobileSidebarDrawer;
