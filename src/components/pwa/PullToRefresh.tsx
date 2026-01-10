import React, { useState, useCallback, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  className,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const isPulling = useRef(false);

  const THRESHOLD = 80;
  const MAX_PULL = 120;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const container = containerRef.current;
    if (!container || container.scrollTop > 0 || isRefreshing) return;

    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Apply resistance to the pull
      const resistance = 0.5;
      const adjustedDiff = Math.min(diff * resistance, MAX_PULL);
      setPullDistance(adjustedDiff);

      // Prevent default scrolling while pulling
      if (adjustedDiff > 10) {
        e.preventDefault();
      }
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;

    isPulling.current = false;

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
  }, [pullDistance, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div ref={containerRef} className={cn("relative overflow-auto", className)}>
      {/* Pull indicator */}
      <AnimatePresence>
        {showIndicator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute left-0 right-0 flex justify-center pointer-events-none z-10"
            style={{ top: Math.max(pullDistance - 50, 10) }}
          >
            <motion.div
              className={cn(
                "w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center",
                progress >= 1 && "bg-primary/10 border-primary/30"
              )}
              animate={{
                rotate: isRefreshing ? 360 : progress * 180,
                scale: isRefreshing ? 1 : 0.8 + progress * 0.2,
              }}
              transition={{
                rotate: isRefreshing
                  ? { repeat: Infinity, duration: 1, ease: "linear" }
                  : { duration: 0 },
              }}
            >
              <RefreshCw
                className={cn(
                  "w-5 h-5 transition-colors",
                  progress >= 1 ? "text-primary" : "text-muted-foreground"
                )}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with pull transform */}
      <motion.div
        animate={{ y: isRefreshing ? 60 : pullDistance > 0 ? pullDistance : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
};
