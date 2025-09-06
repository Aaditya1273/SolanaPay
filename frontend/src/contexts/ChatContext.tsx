import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatContextType {
  messages: Message[];
  isOpen: boolean;
  isLoading: boolean;
  unreadCount: number;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  toggleChat: () => void;
  closeChat: () => void;
  openChat: () => void;
  setLoading: (loading: boolean) => void;
  markAsRead: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  // Load messages from localStorage
  const loadMessages = (): Message[] => {
    try {
      const saved = localStorage.getItem('vpay-chat-messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
    
    return [{
      id: '1',
      content: 'Hello! I\'m your VeryChat assistant. How can I help you with VPay today?',
      sender: 'assistant',
      timestamp: new Date(),
    }];
  };

  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('vpay-chat-messages', JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving chat messages:', error);
    }
  }, [messages]);

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const id = Date.now().toString();
    const newMessage: Message = {
      ...message,
      id,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Increment unread count if chat is closed and message is from assistant
    if (!isOpen && message.sender === 'assistant') {
      setUnreadCount(prev => prev + 1);
    }
    
    return id;
  }, [isOpen]);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) {
        setUnreadCount(0); // Mark as read when opening
      }
      return !prev;
    });
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setUnreadCount(0);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const value: ChatContextType = {
    messages,
    isOpen,
    isLoading,
    unreadCount,
    addMessage,
    updateMessage,
    toggleChat,
    closeChat,
    openChat,
    setLoading,
    markAsRead,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
