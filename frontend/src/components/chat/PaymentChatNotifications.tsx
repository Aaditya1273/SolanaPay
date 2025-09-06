import React, { useEffect, useState } from 'react';
import { useRealTimeChat } from '../../contexts/RealTimeChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Receipt, 
  Bell,
  X,
  ExternalLink
} from 'lucide-react';

interface PaymentNotification {
  id: string;
  type: 'payment-success' | 'payment-failed' | 'receipt-ready' | 'refund-processed';
  title: string;
  message: string;
  amount?: number;
  transactionId?: string;
  timestamp: string;
  isRead: boolean;
}

const PaymentChatNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { messages, notifyPaymentEvent } = useRealTimeChat();
  const { user } = useAuth();

  // Listen for payment-related messages and convert to notifications
  useEffect(() => {
    const paymentMessages = messages.filter(msg => 
      msg.type === 'automated' && 
      (msg.message.includes('Payment') || msg.message.includes('receipt'))
    );

    const newNotifications = paymentMessages.map(msg => ({
      id: `notification-${msg.id}`,
      type: msg.message.includes('successfully') ? 'payment-success' as const : 'payment-failed' as const,
      title: msg.message.includes('successfully') ? 'Payment Successful' : 'Payment Failed',
      message: msg.message,
      timestamp: msg.timestamp,
      isRead: false
    }));

    setNotifications(prev => {
      const existingIds = prev.map(n => n.id);
      const filtered = newNotifications.filter(n => !existingIds.includes(n.id));
      return [...prev, ...filtered];
    });
  }, [messages]);

  // Auto-show notifications for new payment events
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    if (unreadCount > 0) {
      setShowNotifications(true);
    }
  }, [notifications]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment-success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'payment-failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'receipt-ready':
        return <Receipt className="h-5 w-5 text-blue-500" />;
      case 'refund-processed':
        return <DollarSign className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'payment-success':
        return 'border-l-green-500 bg-green-50';
      case 'payment-failed':
        return 'border-l-red-500 bg-red-50';
      case 'receipt-ready':
        return 'border-l-blue-500 bg-blue-50';
      case 'refund-processed':
        return 'border-l-purple-500 bg-purple-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Simulate payment events for testing
  const simulatePaymentEvent = (type: 'success' | 'failed') => {
    const amount = Math.floor(Math.random() * 1000) + 10;
    const transactionId = `tx_${Date.now()}`;
    
    notifyPaymentEvent('send', amount, type, transactionId);
  };

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 text-gray-600 hover:text-purple-600 transition-colors"
        >
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Payment Notifications</h3>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-purple-600 hover:text-purple-700"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No payment notifications</p>
                  <div className="mt-4 space-x-2">
                    <button
                      onClick={() => simulatePaymentEvent('success')}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                    >
                      Test Success
                    </button>
                    <button
                      onClick={() => simulatePaymentEvent('failed')}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                    >
                      Test Failed
                    </button>
                  </div>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 ${getNotificationColor(notification.type)} ${
                      !notification.isRead ? 'bg-opacity-100' : 'bg-opacity-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm font-medium ${
                              !notification.isRead ? 'text-gray-900' : 'text-gray-600'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-purple-500 rounded-full" />
                            )}
                          </div>
                          <p className={`text-sm mt-1 ${
                            !notification.isRead ? 'text-gray-700' : 'text-gray-500'
                          }`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {new Date(notification.timestamp).toLocaleString()}
                            </span>
                            <div className="flex items-center space-x-2">
                              {notification.message.includes('receipt') && (
                                <button className="text-xs text-purple-600 hover:text-purple-700 flex items-center">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Receipt
                                </button>
                              )}
                              {!notification.isRead && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="text-gray-400 hover:text-gray-600 ml-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button className="w-full text-center text-sm text-purple-600 hover:text-purple-700">
                  View All Payment History
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default PaymentChatNotifications;
