import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { Button } from '@/components/ui/button';
import { ChatWidget } from '@/components/chatbot/ChatWidget';
import { PageTransition } from '@/components/ui/PageTransition';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { usePageTitle } from '@/hooks/usePageTitle';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Users, 
  User, 
  LogOut,
  Newspaper,
  EyeOff,
  ArrowLeft,
  Bell,
  Search,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import logoBragaDigital from '@/assets/logo-braga-digital.png';

const navItems = [
  { path: '/portal/dashboard', label: 'Início', icon: LayoutDashboard },
  { path: '/portal/servicos', label: 'Serviços', icon: ShoppingBag },
  { path: '/portal/meus-servicos', label: 'Meus Serviços', icon: Package },
  { path: '/portal/conteudo', label: 'Conteúdo', icon: Newspaper },
  { path: '/portal/indicacoes', label: 'Indicações', icon: Users },
  { path: '/portal/perfil', label: 'Perfil', icon: User },
];

export const PortalLayout: React.FC = () => {
  const { customer, logout: customerLogout, hasActiveService, isPreviewMode, previewData, exitPreviewMode, isAuthenticated: isCustomerAuth } = useCustomerAuth();
  const { signOut, profile, isAuthenticated: isSupabaseAuth } = useAuth();
  const { currentTenant } = useTenant();
  const { getSetting } = useTenantSettings();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Dynamic page titles
  usePageTitle();

  // Check if user is authenticated via Supabase Auth with cliente tenant type
  const isClienteTenantUser = isSupabaseAuth && currentTenant?.type === 'cliente';

  const handleLogout = async () => {
    if (isPreviewMode) {
      exitPreviewMode();
      navigate('/app/dashboard');
      toast.success('Voltou ao modo Gestor');
    } else if (isClienteTenantUser) {
      // Logout via Supabase Auth
      await signOut();
      navigate('/auth/login');
    } else {
      // Logout via CustomerAuth
      customerLogout();
      navigate('/auth/login');
    }
  };

  const handleExitPreview = () => {
    exitPreviewMode();
    navigate('/app/dashboard');
    toast.success('Voltou ao modo Gestor');
  };

  // Get display name based on mode and auth type
  const getDisplayName = () => {
    if (isPreviewMode) {
      return previewData?.tenantName || 'Preview';
    }
    if (isClienteTenantUser) {
      return profile?.full_name || currentTenant?.name || 'Cliente';
    }
    return customer?.customerName || 'Cliente';
  };

  const displayName = getDisplayName();
  const tenantLogo = getSetting('logo_url') || logoBragaDigital;

  const filteredNavItems = navItems.filter(item => {
    // In preview mode, show all items
    if (isPreviewMode) return true;
    // Cliente tenant users from Supabase Auth - show all items
    if (isClienteTenantUser) return true;
    // Se não tem serviço ativo, só mostra Serviços, Meus Serviços (para faturas) e Perfil
    if (!hasActiveService && 
        item.path !== '/portal/servicos' && 
        item.path !== '/portal/meus-servicos' && 
        item.path !== '/portal/perfil') {
      return false;
    }
    return true;
  });

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r sticky top-0 h-screen z-50">
        <div className="p-6">
          <Link to="/portal/dashboard" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center p-2">
              <img src={tenantLogo} alt={currentTenant?.name || "Portal"} className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-tight">Portal do Cliente</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Premium Access</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  active 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", active ? "text-primary-foreground" : "text-muted-foreground")} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t">
          <div className="bg-secondary/50 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {displayName.charAt(0)}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold truncate">{displayName}</span>
                <span className="text-xs text-muted-foreground truncate">Plano Ativo</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout} 
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Preview Mode Banner */}
        {isPreviewMode && (
          <div className="bg-primary text-primary-foreground py-2 px-4 sticky top-0 z-[60]">
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                <span className="text-xs sm:text-sm font-medium">
                  Modo Preview - Visualizando como seus clientes veem o portal
                </span>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleExitPreview}
                className="gap-2 h-8 text-xs"
              >
                <ArrowLeft className="h-3 w-3" />
                Sair do Preview
              </Button>
            </div>
          </div>
        )}

        {/* Header for Mobile & Desktop Top Bar */}
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            {/* Mobile Logo */}
            <Link to="/portal/dashboard" className="flex lg:hidden items-center gap-2">
              <img src={tenantLogo} alt={currentTenant?.name || "Portal"} className="h-8 w-auto object-contain" />
              <span className="font-bold text-sm">Portal</span>
            </Link>

            {/* Desktop Search/Breadcrumb Placeholder */}
            <div className="hidden lg:flex items-center gap-4 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Buscar no portal..." 
                  className="w-full bg-secondary/50 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground">
                <Bell className="h-5 w-5" />
              </Button>
              <div className="h-8 w-[1px] bg-border mx-1 hidden sm:block" />
              <ThemeToggle />
              <div className="lg:hidden">
                <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9 rounded-xl">
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto pb-24 lg:pb-8">
          <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-50 bg-card/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl safe-area-pb overflow-hidden">
        <div className="flex items-center justify-around h-16">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 transition-all duration-300 relative",
                  active 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10 rounded-xl -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
                <span className="text-[10px] font-bold tracking-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Chatbot Widget - only show if not in preview mode */}
      {!isPreviewMode && <ChatWidget />}
    </div>
  );
};
