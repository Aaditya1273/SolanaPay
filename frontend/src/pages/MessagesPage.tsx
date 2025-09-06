import React from 'react';
import UnifiedMessaging from '../components/chat/UnifiedMessaging';

const MessagesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Connect with other users, get support, and manage all your conversations
          </p>
        </div>
        
        <div className="h-[calc(100vh-200px)]">
          <UnifiedMessaging />
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
