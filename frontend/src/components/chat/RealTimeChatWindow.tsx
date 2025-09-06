import React, { useState, useRef, useEffect } from 'react';
import { useRealTimeChat } from '../../contexts/RealTimeChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Send, 
  Bot, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  Minimize2,
  Maximize2,
  X,
  Phone,
  Video,
  MoreVertical
} from 'lucide-react';

interface Message {
  id: number;
  message: string;
  sender: string;
  type: 'user' | 'ai-response' | 'automated' | 'support';
  timestamp: string;
  roomId?: string;
}

interface RealTimeChatWindowProps {
  roomId?: string;
  roomType?: 'ai-assistant' | 'merchant-customer' | 'support';
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
  title?: string;
}

const RealTimeChatWindow: React.FC<RealTimeChatWindowProps> = ({
  roomId,
  roomType = 'ai-assistant',
  isOpen,
  onClose,
  onMinimize,
  isMinimized = false,
  title
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { 
    messages, 
    isConnected, 
    sendMessage, 
    sendAIQuery, 
    joinChatRoom,
    markRoomAsRead 
  } = useRealTimeChat();
  const { user } = useAuth();

  // Filter messages for current room
  const roomMessages = messages.filter(msg => 
    roomId ? msg.roomId === roomId : msg.type === 'ai-response' || msg.type === 'automated'
  );

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages]);

  // Join room on mount
  useEffect(() => {
    if (roomId && isConnected) {
      joinChatRoom(roomId);
      markRoomAsRead(roomId);
    }
  }, [roomId, isConnected, joinChatRoom, markRoomAsRead]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const message = inputMessage.trim();
    setInputMessage('');
    setIsTyping(true);

    try {
      if (roomType === 'ai-assistant') {
        // Send AI query
        sendAIQuery(message, { 
          userContext: user,
          roomType,
          timestamp: new Date().toISOString()
        });
      } else if (roomId) {
        // Send regular message to room
        sendMessage(roomId, message, 'user');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setTimeout(() => setIsTyping(false), 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageIcon = (type: string, sender: string) => {
    switch (type) {
      case 'ai-response':
        return <Bot className="h-4 w-4 text-purple-600" />;
      case 'automated':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'support':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMessageBgColor = (type: string, sender: string) => {
    if (sender === user?.username || sender === user?.email) {
      return 'bg-purple-600 text-white ml-auto';
    }
    
    switch (type) {
      case 'ai-response':
        return 'bg-purple-50 border border-purple-200 text-purple-900';
      case 'automated':
        return 'bg-green-50 border border-green-200 text-green-900';
      case 'support':
        return 'bg-blue-50 border border-blue-200 text-blue-900';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const quickReplies = [
    "Where is my receipt?",
    "Payment failed, help?",
    "Check my balance",
    "Transaction history",
    "Contact support"
  ];

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 transition-all duration-300 z-50 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-purple-600 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5" />
          <div>
            <h3 className="font-semibold text-sm">
              {title || (roomType === 'ai-assistant' ? 'VeryChat Assistant' : 'Customer Support')}
            </h3>
            <div className="flex items-center space-x-1 text-xs opacity-90">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span>{isConnected ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {roomType === 'merchant-customer' && (
            <>
              <button className="p-1 hover:bg-purple-700 rounded">
                <Phone className="h-4 w-4" />
              </button>
              <button className="p-1 hover:bg-purple-700 rounded">
                <Video className="h-4 w-4" />
              </button>
              <button className="p-1 hover:bg-purple-700 rounded">
                <MoreVertical className="h-4 w-4" />
              </button>
            </>
          )}
          
          {onMinimize && (
            <button 
              onClick={onMinimize}
              className="p-1 hover:bg-purple-700 rounded"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
          )}
          
          <button 
            onClick={onClose}
            className="p-1 hover:bg-purple-700 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 h-96">
            {roomMessages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-purple-300 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">
                  {roomType === 'ai-assistant' 
                    ? "Hi! I'm your VeryChat assistant. Ask me about payments, receipts, or any SolanaPay features."
                    : "Start a conversation..."
                  }
                </p>
                
                {roomType === 'ai-assistant' && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-gray-400 mb-2">Quick questions:</p>
                    {quickReplies.map((reply, index) => (
                      <button
                        key={index}
                        onClick={() => setInputMessage(reply)}
                        className="block w-full text-left px-3 py-2 text-xs bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-700 transition-colors"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {roomMessages.map((message) => (
              <div key={message.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  {getMessageIcon(message.type, message.sender)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {message.sender}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  
                  <div className={`inline-block px-3 py-2 rounded-lg text-sm max-w-xs ${getMessageBgColor(message.type, message.sender)}`}>
                    {message.message}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center space-x-2 text-gray-500">
                <Bot className="h-4 w-4" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-sm">Typing...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    roomType === 'ai-assistant' 
                      ? "Ask about payments, receipts, or SolanaPay features..."
                      : "Type your message..."
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  rows={1}
                  disabled={!isConnected}
                />
              </div>
              
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || !isConnected}
                className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            
            {!isConnected && (
              <p className="text-xs text-red-500 mt-2 flex items-center">
                <XCircle className="h-3 w-3 mr-1" />
                Disconnected. Trying to reconnect...
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RealTimeChatWindow;
