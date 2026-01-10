import React, { useEffect } from 'react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

const NotificacoesCenter: React.FC = () => {
  useEffect(() => {
    document.title = 'Notificações | Sistema';
  }, []);

  return (
    <div className="container max-w-4xl py-6">
      <NotificationCenter />
    </div>
  );
};

export default NotificacoesCenter;
