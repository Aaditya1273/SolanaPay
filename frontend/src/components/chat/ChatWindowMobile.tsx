import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle, Loader2, ChevronDown } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatWindowMobileProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatWindowMobile: React.FC<ChatWindowMobileProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your VeryChat assistant. How can I help you with VPay today?',
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      content: '',
      sender: 'assistant',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      const { chatWithVeryChat } = await import('../../services/verychatService');
      
      await chatWithVeryChat(
        userMessage.content,
        true,
        {
          onMessage: (chunk: string) => {
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: msg.content + chunk }
                : msg
            ));
          },
          onComplete: (fullMessage: string) => {
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: fullMessage, isStreaming: false }
                : msg
            ));
            setIsLoading(false);
          },
          onError: (error: string) => {
            console.error('VeryChat streaming error:', error);
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: `Error: ${error}`, isStreaming: false }
                : msg
            ));
            setIsLoading(false);
          }
        }
      );
    } catch (error) {
      console.error('VeryChat API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to VeryChat API';
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: `Error: ${errorMessage}`, isStreaming: false }
          : msg
      ));
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      
      {/* Mobile Chat Window */}
      <div className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 md:hidden ${
        isMinimized ? 'translate-y-[calc(100%-4rem)]' : 'translate-y-0'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-2xl">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <h3 className="font-semibold">VeryChat Assistant</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded flex items-center justify-center transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className={`transition-all duration-300 ${isMinimized ? 'h-0 overflow-hidden' : 'h-96'}`}>
          <div className="h-full p-4 overflow-auto">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.isStreaming && (
                      <div className="flex items-center mt-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                      </div>
                    )}
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-purple-200' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 p-3 rounded-lg flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input */}
        <div className={`p-4 border-t border-gray-200 bg-white transition-all duration-300 ${
          isMinimized ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}>
          <div className="flex space-x-2">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about VPay..."
              className="flex-1 h-12 px-4 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="h-12 w-12 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full transition-colors flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
