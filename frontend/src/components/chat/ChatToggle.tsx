import React from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '../ui/button';

interface ChatToggleProps {
  isOpen: boolean;
  onClick: () => void;
  unreadCount?: number;
}

export const ChatToggle: React.FC<ChatToggleProps> = ({ 
  isOpen, 
  onClick, 
  unreadCount = 0 
}) => {
  return (
    <Button
      onClick={onClick}
      className={`fixed bottom-4 right-4 z-40 h-14 w-14 rounded-full shadow-lg transition-all duration-300 ${
        isOpen 
          ? 'bg-gray-600 hover:bg-gray-700' 
          : 'bg-purple-600 hover:bg-purple-700'
      }`}
      size="sm"
    >
      {isOpen ? (
        <X className="w-6 h-6 text-white" />
      ) : (
        <div className="relative">
          <MessageCircle className="w-6 h-6 text-white" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      )}
    </Button>
  );
};
