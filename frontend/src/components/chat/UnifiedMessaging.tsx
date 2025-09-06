import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Send, 
  MoreVertical, 
  Users, 
  MessageSquare, 
  Headphones,
  Bot,
  User,
  Plus,
  Paperclip
} from 'lucide-react';

interface ChatContact {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  type: 'user' | 'support' | 'bot';
  role?: string;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'system';
  status: 'sent' | 'delivered' | 'read';
}

const UnifiedMessaging: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  // Check if redirected from support
  const supportMode = searchParams.get('support') === 'true';

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('SolanaPay-token');
      if (!token) {
        // If no token, show only support contact
        setContacts([{
          id: 'support-agent-1',
          name: 'SolanaPay Support Team',
          avatar: undefined,
          lastMessage: 'Hi! How can I help you today?',
          lastMessageTime: new Date().toISOString(),
          unreadCount: supportMode ? 1 : 0,
          isOnline: true,
          type: 'support',
          role: 'Customer Support Agent'
        }]);
        return;
      }

      // Fetch real contacts from API
      const response = await fetch('/api/messages/contacts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Always include support contact
        const supportContact = {
          id: 'support-agent-1',
          name: 'SolanaPay Support Team',
          avatar: undefined,
          lastMessage: 'Hi! How can I help you today?',
          lastMessageTime: new Date().toISOString(),
          unreadCount: supportMode ? 1 : 0,
          isOnline: true,
          type: 'support' as const,
          role: 'Customer Support Agent'
        };
        setContacts([supportContact, ...data.contacts]);
      } else {
        throw new Error('Failed to fetch contacts');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      // Fallback to support only
      setContacts([{
        id: 'support-agent-1',
        name: 'SolanaPay Support Team',
        avatar: undefined,
        lastMessage: 'Hi! How can I help you today?',
        lastMessageTime: new Date().toISOString(),
        unreadCount: supportMode ? 1 : 0,
        isOnline: true,
        type: 'support',
        role: 'Customer Support Agent'
      }]);
    }
  };

  useEffect(() => {
    fetchContacts();

    // Auto-select support if redirected from bot
    if (supportMode) {
      setSelectedContact('support-agent-1');
      loadSupportMessages();
    }
  }, [supportMode]);

  const loadSupportMessages = async () => {
    try {
      const token = localStorage.getItem('SolanaPay-token');
      if (!token) {
        // Fallback to initial support message
        setMessages([{
          id: 'msg-1',
          senderId: 'support-agent-1',
          content: 'Hi! I understand you need assistance. How can I help you today?',
          timestamp: new Date().toISOString(),
          type: 'text',
          status: 'delivered'
        }]);
        return;
      }

      // Fetch real support conversation history
      const response = await fetch('/api/messages/support', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        throw new Error('Failed to fetch support messages');
      }
    } catch (error) {
      console.error('Error fetching support messages:', error);
      // Fallback to initial support message
      setMessages([{
        id: 'msg-1',
        senderId: 'support-agent-1',
        content: 'Hi! I understand you need assistance. How can I help you today?',
        timestamp: new Date().toISOString(),
        type: 'text',
        status: 'delivered'
      }]);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;

    const messageContent = newMessage;
    const message: Message = {
      id: `msg-${Date.now()}`,
      senderId: user?.id || 'current-user',
      content: messageContent,
      timestamp: new Date().toISOString(),
      type: 'text',
      status: 'sent'
    };

    // Add message to UI immediately
    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Update contact's last message
    setContacts(prev => prev.map(contact => 
      contact.id === selectedContact 
        ? { ...contact, lastMessage: messageContent, lastMessageTime: message.timestamp }
        : contact
    ));

    // Send message to backend
    try {
      const token = localStorage.getItem('SolanaPay-token');
      if (token) {
        await fetch('/api/messages/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            recipientId: selectedContact,
            content: messageContent,
            type: 'text'
          })
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Message is already in UI, so no need to handle error visually
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

  const getContactIcon = (contact: ChatContact) => {
    switch (contact.type) {
      case 'support':
        return <Headphones className="h-5 w-5 text-white" />;
      case 'bot':
        return <Bot className="h-5 w-5 text-white" />;
      default:
        return <User className="h-5 w-5 text-white" />;
    }
  };

  const selectedContactData = contacts.find(c => c.id === selectedContact);

  return (
    <div className="flex h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
      {/* Contacts List */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-purple-600" />
              Messages
            </h2>
            <button className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Contacts */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No conversations found</p>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact.id)}
                className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  selectedContact === contact.id ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                        {getContactIcon(contact)}
                      </div>
                      {contact.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {contact.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {contact.unreadCount > 0 && (
                            <span className="bg-purple-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                              {contact.unreadCount}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatTime(contact.lastMessageTime)}
                          </span>
                        </div>
                      </div>
                      
                      {contact.type === 'support' && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">
                          {contact.role}
                        </p>
                      )}
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {contact.lastMessage}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedContact && selectedContactData ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                      {getContactIcon(selectedContactData)}
                    </div>
                    {selectedContactData.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{selectedContactData.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedContactData.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderId === user?.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.senderId === user?.id ? 'text-purple-200' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <Paperclip className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Choose a contact to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedMessaging;
