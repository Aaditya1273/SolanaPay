import React, { useState, useEffect } from 'react';
import { Bell, X, Gift, TrendingUp, Award, Zap } from 'lucide-react';

interface RewardNotification {
  id: string;
  type: 'NEW_RECOMMENDATION' | 'REWARD_CLAIMED' | 'ANALYTICS_UPDATE' | 'ACHIEVEMENT_UNLOCKED';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: any;
}

const NotificationIcon = ({ type }: { type: RewardNotification['type'] }) => {
  const icons = {
    NEW_RECOMMENDATION: Gift,
    REWARD_CLAIMED: Award,
    ANALYTICS_UPDATE: TrendingUp,
    ACHIEVEMENT_UNLOCKED: Zap
  };
  
  const Icon = icons[type];
  return <Icon className="h-5 w-5" />;
};

const RewardNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<RewardNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch real notifications from API
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('vpay-token');
      if (!token) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const response = await fetch('/api/rewards/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.filter((n: RewardNotification) => !n.read).length || 0);
      } else {
        throw new Error('Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  // Poll for new notifications
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
    
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  };

  const removeNotification = (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    setNotifications(prev => 
      prev.filter(notif => notif.id !== notificationId)
    );
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getNotificationColor = (type: RewardNotification['type']) => {
    const colors = {
      NEW_RECOMMENDATION: 'border-l-blue-500 bg-blue-50',
      REWARD_CLAIMED: 'border-l-green-500 bg-green-50',
      ANALYTICS_UPDATE: 'border-l-purple-500 bg-purple-50',
      ACHIEVEMENT_UNLOCKED: 'border-l-yellow-500 bg-yellow-50'
    };
    return colors[type];
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-l-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    getNotificationColor(notification.type)
                  } ${!notification.read ? 'bg-opacity-100' : 'bg-opacity-30'}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-full ${
                        notification.type === 'NEW_RECOMMENDATION' ? 'bg-blue-100 text-blue-600' :
                        notification.type === 'REWARD_CLAIMED' ? 'bg-green-100 text-green-600' :
                        notification.type === 'ANALYTICS_UPDATE' ? 'bg-purple-100 text-purple-600' :
                        'bg-yellow-100 text-yellow-600'
                      }`}>
                        <NotificationIcon type={notification.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-800 truncate">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTimeAgo(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notification.id);
                      }}
                      className="text-gray-400 hover:text-gray-600 ml-2"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RewardNotifications;
