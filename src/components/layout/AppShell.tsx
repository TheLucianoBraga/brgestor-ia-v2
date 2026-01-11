import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileSidebarDrawer } from './MobileSidebarDrawer';
import { DesktopHeader } from './DesktopHeader';
import { ChatWidget } from '@/components/chatbot/ChatWidget';
import { AccessBanner } from './AccessBanner';
import { AccessGuard } from '@/components/guards/AccessGuard';
import { PageTransition } from '@/components/ui/PageTransition';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useClientAccess } from '@/hooks/useClientAccess';
import { useTrialNotifications } from '@/hooks/useTrialNotifications';
import { useIsMobile } from '@/hooks/useMediaQuery';

export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const { requiresSubscription } = useClientAccess();

  // Dynamic page titles
  usePageTitle();
  
  // Trial notifications
  useTrialNotifications();

  // Close sidebar mobile on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      
      {/* ========== SIDEBAR DESKTOP (FIXED) ========== */}
      {!isMobile && (
        <Sidebar 
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}

      {/* ========== MOBILE HEADER (FIXED TOP) ========== */}
      {isMobile && (
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
      )}

      {/* ========== MOBILE SIDEBAR DRAWER ========== */}
      {isMobile && (
        <MobileSidebarDrawer 
          open={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
      )}

      {/* ========== MAIN CONTENT AREA ========== */}
      <div 
        className={cn(
          "min-h-screen transition-all duration-300",
          !isMobile && (sidebarCollapsed ? "ml-16" : "ml-64")
        )}
      >
        {/* Desktop Header (STICKY) */}
        {!isMobile && <DesktopHeader />}

        {/* Access Banner */}
        <AccessBanner show={requiresSubscription} />

        {/* Page Content - no extra margin/padding top */}
        <main 
          className={cn(
            "p-4 lg:p-6",
            isMobile && "pt-16 pb-20" // Only mobile needs compensation for fixed header/nav
          )}
        >
          <AccessGuard>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </AccessGuard>
        </main>
      </div>

      {/* ========== MOBILE BOTTOM NAV (FIXED BOTTOM) ========== */}
      {isMobile && <MobileBottomNav />}

      {/* Chatbot Widget - desktop only (mobile uses full page) */}
      {!isMobile && <ChatWidget />}
    </div>
  );
};

export default AppShell;
