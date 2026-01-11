import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const ProgressBar: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Start progress on route change
    setVisible(true);
    setProgress(30);

    const timer1 = setTimeout(() => setProgress(60), 100);
    const timer2 = setTimeout(() => setProgress(80), 200);
    const timer3 = setTimeout(() => setProgress(100), 300);
    const timer4 = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent">
      <div
        className={cn(
          "h-full bg-gradient-to-r from-primary via-primary to-primary/50 transition-all duration-200 ease-out",
          "shadow-[0_0_10px_hsl(var(--primary)),0_0_5px_hsl(var(--primary))]"
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
