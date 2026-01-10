import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';
import { MessageCircle } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { mobileNavItems } = useTenantNavigation();

  const isActive = (href: string) => {
    if (href === '/app/dashboard') {
      return location.pathname === href || location.pathname === '/app';
    }
    return location.pathname === href;
  };

  const isChatActive = location.pathname === '/app/chat';

  // Get first 4 items from navigation
  const navItems = mobileNavItems.slice(0, 4);

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 px-4 pointer-events-none">
      <nav className="mx-auto max-w-md h-20 bg-white/80 dark:bg-black/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center justify-around px-4 pointer-events-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 relative group",
                active 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "w-6 h-6 transition-transform duration-300",
                active ? "scale-110 stroke-[2.5]" : "group-hover:scale-110"
              )} />
              
              {active && (
                <span className="absolute -bottom-1 text-[9px] font-bold uppercase tracking-tighter animate-fade-in">
                  {item.title}
                </span>
              )}
              
              {active && (
                <div className="absolute -top-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              )}
            </NavLink>
          );
        })}
        
        {/* Chat Button - Special Highlight */}
        <NavLink
          to="/app/chat"
          className={cn(
            "flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 relative group",
            isChatActive 
              ? "text-primary bg-primary/10" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className={cn(
            "p-2 rounded-xl transition-all duration-300",
            isChatActive ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-secondary/50"
          )}>
            <MessageCircle className={cn(
              "w-6 h-6",
              isChatActive && "stroke-[2.5]"
            )} />
          </div>
          
          {isChatActive && (
            <div className="absolute -top-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
          )}
        </NavLink>
      </nav>
    </div>
  );
};

export default MobileBottomNav;
