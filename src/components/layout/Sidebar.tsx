import React, { useState, useMemo, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ChevronDown,
  Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/contexts/TenantContext';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useChildTenants } from '@/hooks/useChildTenants';
import { differenceInDays } from 'date-fns';
import logo from '@/assets/logo.png';
import { TrialExpiredModal } from '@/components/modals/TrialExpiredModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onClose?: () => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  collapsed, 
  onToggleCollapse, 
  onClose, 
  isMobile 
}) => {
  const location = useLocation();
  const { currentTenant } = useTenant();
  const { mainNav, adminNav, hasAdminNav } = useTenantNavigation();
  const { getSetting } = useTenantSettings();
  const { children: childTenants } = useChildTenants();
  const [showTrialExpiredModal, setShowTrialExpiredModal] = useState(false);
  
  const [adminOpen, setAdminOpen] = useState(() => {
    const adminRoutes = adminNav.flatMap(g => g.items.map(i => i.href));
    return adminRoutes.some(route => location.pathname === route);
  });

  const activeRevendasCount = useMemo(() => {
    if (currentTenant?.type !== 'master' && currentTenant?.type !== 'adm') return 0;
    return childTenants.filter(t => t.type === 'revenda' && t.status === 'active').length;
  }, [childTenants, currentTenant?.type]);

  const customLogo = getSetting('company_logo');
  const displayLogo = customLogo || logo;

  const getTrialDaysRemaining = () => {
    if (!currentTenant?.trial_ends_at) return null;
    const trialEnd = new Date(currentTenant.trial_ends_at);
    const today = new Date();
    const days = differenceInDays(trialEnd, today);
    return days;
  };

  const trialDays = getTrialDaysRemaining();
  const isTrialExpired = trialDays !== null && trialDays < 0;
  const isTrialCritical = trialDays !== null && trialDays >= 0 && trialDays <= 3;

  useEffect(() => {
    if (isTrialExpired) {
      const hasShownModal = sessionStorage.getItem('trial_expired_modal_shown');
      if (!hasShownModal) {
        setShowTrialExpiredModal(true);
        sessionStorage.setItem('trial_expired_modal_shown', 'true');
      }
    }
  }, [isTrialExpired]);

  const hasActiveSubscription = currentTenant?.status === 'active' && trialDays === null;

  const getBadgeConfig = () => {
    if (hasActiveSubscription) {
      return { text: 'PRO', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
    }
    if (trialDays !== null && trialDays < 0) {
      return { text: 'EXPIRADO', className: 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' };
    }
    if (trialDays !== null && trialDays <= 3) {
      return { text: `TRIAL ${trialDays}d`, className: 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' };
    }
    if (trialDays !== null) {
      return { text: `TRIAL ${trialDays}d`, className: 'bg-amber-500/20 text-amber-400 border-amber-500/40' };
    }
    return { text: 'SEM PLANO', className: 'bg-muted text-muted-foreground border-muted' };
  };

  const badgeConfig = getBadgeConfig();
  const isActive = (href: string) => location.pathname === href;

  const renderNavItem = (item: typeof mainNav[0]['items'][0]) => {
    const active = isActive(item.href);
    const isPlanoPro = item.title === 'Plano PRO' || item.title === 'Meu Plano';
    const isRevendas = item.href === '/app/gestao-revendas';
    const showRevendasBadge = isRevendas && activeRevendasCount > 0;
    
    return (
      <NavLink
        key={item.href}
        to={item.href}
        onClick={isMobile ? onClose : undefined}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative group',
          active 
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
            : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/5',
          collapsed && !isMobile && 'justify-center px-2'
        )}
        title={collapsed && !isMobile ? item.title : undefined}
      >
        <item.icon className={cn(
          'w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110',
          active ? 'text-white' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground'
        )} />
        
        {(!collapsed || isMobile) && (
          <>
            <span className="flex-1 truncate">{item.title}</span>
            {isPlanoPro && (
              <span className={cn(
                "px-2 py-0.5 text-[10px] font-bold rounded-full border",
                badgeConfig.className
              )}>
                {badgeConfig.text}
              </span>
            )}
            {showRevendasBadge && (
              <Badge variant="secondary" className="text-xs bg-emerald-500 text-white border-none">
                {activeRevendasCount}
              </Badge>
            )}
            {item.badge && !isPlanoPro && !showRevendasBadge && (
              <Badge variant="secondary" className="text-xs bg-amber-500 text-white border-none">
                {item.badge}
              </Badge>
            )}
          </>
        )}
        
        {active && !collapsed && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-l-full" />
        )}
      </NavLink>
    );
  };

  return (
    <>
      <aside 
        className={cn(
          "bg-[#0f172a] text-sidebar-foreground flex flex-col h-full shadow-2xl",
          !isMobile && "fixed left-0 top-0 bottom-0 z-40 transition-all duration-500 ease-in-out",
          !isMobile && (collapsed ? "w-20" : "w-72"),
          isMobile && "w-full h-full"
        )}
      >
        {/* ========== LOGO ========== */}
        <div className="h-24 flex items-center justify-between px-6 flex-shrink-0">
          <Link to="/app/dashboard" className="flex items-center gap-3 group">
            <div className="p-2 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors duration-300">
              <img 
                src={displayLogo} 
                alt="Logo" 
                className="h-8 w-8 object-contain"
              />
            </div>
            {(!collapsed || isMobile) && (
              <div className="flex flex-col">
                <span className="font-bold text-xl tracking-tight text-white">BRGestor</span>
                <span className="text-[10px] text-sidebar-foreground/40 font-medium uppercase tracking-widest">Premium AI</span>
              </div>
            )}
          </Link>
          
          {isMobile && onClose && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* ========== MENU ========== */}
        <ScrollArea className="flex-1 px-4">
          <nav className="space-y-8 py-4">
            {mainNav.map((group) => (
              <div key={group.label} className="space-y-3">
                {(!collapsed || isMobile) && (
                  <p className="text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-[0.2em] px-4">
                    {group.label}
                  </p>
                )}
                <div className="space-y-1">
                  {group.items.map(renderNavItem)}
                </div>
              </div>
            ))}

            {/* Admin Navigation - Collapsible */}
            {hasAdminNav && (
              <Collapsible open={adminOpen} onOpenChange={setAdminOpen} className="space-y-2">
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300',
                      'hover:bg-white/5 text-sidebar-foreground/60 hover:text-sidebar-foreground',
                      'border border-dashed border-white/10',
                      collapsed && !isMobile && 'justify-center px-2'
                    )}
                  >
                    <Wrench className="w-5 h-5 flex-shrink-0" />
                    {(!collapsed || isMobile) && (
                      <>
                        <span className="flex-1 text-left">Administração</span>
                        <ChevronDown className={cn(
                          'w-4 h-4 transition-transform duration-300',
                          adminOpen && 'rotate-180'
                        )} />
                      </>
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-6 pt-4 animate-fade-in">
                  {adminNav.map((group) => (
                    <div key={group.label} className="space-y-3">
                      {(!collapsed || isMobile) && (
                        <p className="text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-[0.2em] px-4">
                          {group.label}
                        </p>
                      )}
                      <div className="space-y-1">
                        {group.items.map(renderNavItem)}
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </nav>
        </ScrollArea>

        {/* ========== COLLAPSE BUTTON (Desktop only) ========== */}
        {!isMobile && (
          <div className="p-6 flex-shrink-0">
            <button
              onClick={onToggleCollapse}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 text-sidebar-foreground/60 hover:text-sidebar-foreground",
                collapsed && "justify-center"
              )}
            >
              {collapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <>
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-sm font-semibold">Recolher Menu</span>
                </>
              )}
            </button>
          </div>
        )}
      </aside>

      <TrialExpiredModal 
        open={showTrialExpiredModal} 
        onOpenChange={setShowTrialExpiredModal} 
      />
    </>
  );
};

export default Sidebar;
