import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface Message {
  id: number;
  message: string;
  sender: string;
  type: 'user' | 'ai-response' | 'automated' | 'support';
  timestamp: string;
  roomId?: string;
}

interface ChatRoom {
  id: string;
  type: 'merchant-customer' | 'support' | 'ai-assistant';
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
}

interface RealTimeChatContextType {
  socket: Socket | null;
  messages: Message[];
  chatRooms: ChatRoom[];
  isConnected: boolean;
  sendMessage: (roomId: string, message: string, type?: string) => void;
  sendAIQuery: (query: string, context?: any) => void;
  joinChatRoom: (roomId: string) => void;
  leaveChatRoom: (roomId: string) => void;
  createChatRoom: (type: string, participants: string[]) => string;
  notifyPaymentEvent: (type: string, amount: number, status: string, transactionId: string) => void;
  clearMessages: () => void;
  markRoomAsRead: (roomId: string) => void;
}

const RealTimeChatContext = createContext<RealTimeChatContextType | undefined>(undefined);

export const useRealTimeChat = () => {
  const context = useContext(RealTimeChatContext);
  if (!context) {
    throw new Error('useRealTimeChat must be used within a RealTimeChatProvider');
  }
  return context;
};

interface RealTimeChatProviderProps {
  children: React.ReactNode;
}

export const RealTimeChatProvider: React.FC<RealTimeChatProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  // Initialize WebSocket connection
  useEffect(() => {
    if (user) {
      const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001', {
        transports: ['websocket'],
        upgrade: true
      });

      newSocket.on('connect', () => {
        console.log('Connected to VeryChat WebSocket');
        setIsConnected(true);
        
        // Join user's personal room for notifications
        newSocket.emit('join-user-room', user.id);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from VeryChat WebSocket');
        setIsConnected(false);
      });

      newSocket.on('receive-message', (message: Message) => {
        setMessages(prev => [...prev, message]);
        
        // Update chat room with new message
        if (message.roomId) {
          setChatRooms(prev => prev.map(room => 
            room.id === message.roomId 
              ? { ...room, lastMessage: message, unreadCount: room.unreadCount + 1 }
              : room
          ));
        }
      });

      newSocket.on('ai-error', (error) => {
        console.error('AI Query Error:', error);
        const errorMessage: Message = {
          id: Date.now(),
          message: 'Sorry, I encountered an error processing your request. Please try again.',
          sender: 'VeryChat AI',
          type: 'ai-response',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  // Send message to a chat room
  const sendMessage = useCallback((roomId: string, message: string, type: string = 'user') => {
    if (socket && user) {
      const messageData = {
        roomId,
        message,
        sender: user.username || user.email,
        type
      };
      
      socket.emit('send-message', messageData);
    }
  }, [socket, user]);

  // Send AI query
  const sendAIQuery = useCallback((query: string, context?: any) => {
    if (socket && user) {
      socket.emit('ai-query', {
        userId: user.id,
        query,
        context
      });
    }
  }, [socket, user]);

  // Join a chat room
  const joinChatRoom = useCallback((roomId: string) => {
    if (socket) {
      socket.emit('join-chat-room', roomId);
    }
  }, [socket]);

  // Leave a chat room
  const leaveChatRoom = useCallback((roomId: string) => {
    if (socket) {
      socket.emit('leave-chat-room', roomId);
    }
  }, [socket]);

  // Create a new chat room
  const createChatRoom = useCallback((type: string, participants: string[]): string => {
    const roomId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newRoom: ChatRoom = {
      id: roomId,
      type: type as any,
      participants,
      unreadCount: 0
    };
    
    setChatRooms(prev => [...prev, newRoom]);
    joinChatRoom(roomId);
    
    return roomId;
  }, [joinChatRoom]);

  // Notify payment event
  const notifyPaymentEvent = useCallback((type: string, amount: number, status: string, transactionId: string) => {
    if (socket && user) {
      socket.emit('payment-event', {
        userId: user.id,
        type,
        amount,
        status,
        transactionId
      });
    }
  }, [socket, user]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Mark room as read
  const markRoomAsRead = useCallback((roomId: string) => {
    setChatRooms(prev => prev.map(room => 
      room.id === roomId 
        ? { ...room, unreadCount: 0 }
        : room
    ));
  }, []);

  const value: RealTimeChatContextType = {
    socket,
    messages,
    chatRooms,
    isConnected,
    sendMessage,
    sendAIQuery,
    joinChatRoom,
    leaveChatRoom,
    createChatRoom,
    notifyPaymentEvent,
    clearMessages,
    markRoomAsRead
  };

  return (
    <RealTimeChatContext.Provider value={value}>
      {children}
    </RealTimeChatContext.Provider>
  );
};

export default RealTimeChatProvider;
