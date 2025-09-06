import React, { useState, useEffect } from 'react';
import { useRealTimeChat } from '../../contexts/RealTimeChatContext';
import { useAuth } from '../../contexts/AuthContext';
import RealTimeChatWindow from './RealTimeChatWindow';
import { 
  MessageSquare, 
  Users, 
  Clock, 
  Star,
  Search,
  Filter,
  Plus
} from 'lucide-react';

interface ChatSession {
  id: string;
  customerName: string;
  customerEmail: string;
  merchantName: string;
  status: 'active' | 'waiting' | 'closed';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  rating?: number;
  transactionId?: string;
}

const MerchantCustomerChat: React.FC = () => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'waiting' | 'closed'>('all');
  const { createChatRoom } = useRealTimeChat();
  const { user } = useAuth();

  // Fetch real chat sessions from API
  useEffect(() => {
    fetchChatSessions();
  }, []);

  const fetchChatSessions = async () => {
    try {
      const token = localStorage.getItem('SolanaPay-token');
      if (!token) {
        setChatSessions([]);
        return;
      }

      const response = await fetch('/api/chat/merchant/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChatSessions(data.sessions || []);
      } else {
        throw new Error('Failed to fetch chat sessions');
      }
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      setChatSessions([]);
    }
  };

  const filteredSessions = chatSessions.filter(session => {
    const matchesSearch = session.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const startNewChat = () => {
    const newChatId = createChatRoom('merchant-customer', [user?.id || '', 'customer-new']);
    setSelectedChat(newChatId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400';
      case 'waiting':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400';
      case 'closed':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
      {/* Chat Sessions List */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-purple-600" />
              Customer Support
            </h2>
            <button
              onClick={startNewChat}
              className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Search and Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="waiting">Waiting</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Chat Sessions */}
        <div className="flex-1 overflow-y-auto">
          {filteredSessions.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No chat sessions found</p>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedChat(session.id)}
                className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  selectedChat === session.id ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {session.customerName}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {session.unreadCount > 0 && (
                          <span className="bg-purple-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {session.unreadCount}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{session.customerEmail}</p>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate mb-2">
                      {session.lastMessage}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(session.lastMessageTime)}
                      </div>
                      
                      {session.rating && (
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < session.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {session.transactionId && (
                      <p className="text-xs text-purple-600 mt-1 font-mono">
                        {session.transactionId}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <div className="h-full">
            <RealTimeChatWindow
              roomId={selectedChat}
              roomType="merchant-customer"
              isOpen={true}
              onClose={() => setSelectedChat(null)}
              title={`Chat with ${filteredSessions.find(s => s.id === selectedChat)?.customerName || 'Customer'}`}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Select a chat to start
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Choose a customer conversation from the list to begin chatting
              </p>
              <button
                onClick={startNewChat}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantCustomerChat;
