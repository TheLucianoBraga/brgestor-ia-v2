import React from 'react';
import { ChatWidget } from '@/components/chatbot/ChatWidget';

const ChatPage: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 bg-background pt-14 pb-16 lg:hidden">
      <ChatWidget isOpen={true} fullScreen />
    </div>
  );
};

export default ChatPage;
