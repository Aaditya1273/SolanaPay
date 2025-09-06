import React, { useState, useEffect } from 'react';
import { useRealTimeChat } from '../../contexts/RealTimeChatContext';
import { 
  Bot, 
  HelpCircle, 
  Receipt, 
  CreditCard, 
  Wallet,
  Shield,
  Clock,
  TrendingUp,
  MessageCircle,
  Zap
} from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'payments' | 'receipts' | 'wallet' | 'security' | 'general';
  keywords: string[];
  icon: React.ReactNode;
}

const AIFAQChatbot: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(true);
  const { sendAIQuery, messages } = useRealTimeChat();

  const faqItems: FAQItem[] = [
    {
      id: 'receipt-location',
      question: 'Where is my receipt?',
      answer: 'Your receipts are automatically generated and stored in the Wallet section under "Transaction History". You can also download them as PDF.',
      category: 'receipts',
      keywords: ['receipt', 'transaction', 'history', 'download', 'pdf'],
      icon: <Receipt className="h-4 w-4" />
    },
    {
      id: 'payment-failed',
      question: 'Why did my payment fail?',
      answer: 'Payments can fail due to insufficient balance, network issues, or incorrect recipient address. Check your wallet balance and try again.',
      category: 'payments',
      keywords: ['payment', 'failed', 'error', 'balance', 'network'],
      icon: <CreditCard className="h-4 w-4" />
    },
    {
      id: 'check-balance',
      question: 'How do I check my wallet balance?',
      answer: 'Go to the Wallet section in the main navigation. Your current balance is displayed at the top, along with recent transactions.',
      category: 'wallet',
      keywords: ['balance', 'wallet', 'funds', 'money'],
      icon: <Wallet className="h-4 w-4" />
    },
    {
      id: 'transaction-time',
      question: 'How long do transactions take?',
      answer: 'Most transactions complete within 1-3 minutes. Large amounts may take up to 10 minutes for additional security verification.',
      category: 'payments',
      keywords: ['transaction', 'time', 'duration', 'speed', 'confirmation'],
      icon: <Clock className="h-4 w-4" />
    },
    {
      id: 'security-features',
      question: 'What security features does SolanaPay have?',
      answer: 'SolanaPay uses multi-signature wallets, encrypted transactions, KYC verification, and real-time fraud detection to keep your funds secure.',
      category: 'security',
      keywords: ['security', 'safe', 'protection', 'fraud', 'encryption'],
      icon: <Shield className="h-4 w-4" />
    },
    {
      id: 'refund-process',
      question: 'How do I request a refund?',
      answer: 'Go to your transaction history, find the payment, and click "Request Refund". Refunds are processed within 3-5 business days.',
      category: 'payments',
      keywords: ['refund', 'return', 'money back', 'dispute'],
      icon: <TrendingUp className="h-4 w-4" />
    }
  ];

  const categories = [
    { id: 'all', name: 'All', icon: <MessageCircle className="h-4 w-4" /> },
    { id: 'payments', name: 'Payments', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'receipts', name: 'Receipts', icon: <Receipt className="h-4 w-4" /> },
    { id: 'wallet', name: 'Wallet', icon: <Wallet className="h-4 w-4" /> },
    { id: 'security', name: 'Security', icon: <Shield className="h-4 w-4" /> },
    { id: 'general', name: 'General', icon: <HelpCircle className="h-4 w-4" /> }
  ];

  const quickActions = [
    {
      id: 'find-receipt',
      title: 'Find My Receipt',
      description: 'Locate transaction receipts',
      query: 'Where can I find my payment receipt?',
      icon: <Receipt className="h-5 w-5" />
    },
    {
      id: 'payment-issue',
      title: 'Payment Issue',
      description: 'Troubleshoot payment problems',
      query: 'My payment failed, what should I do?',
      icon: <CreditCard className="h-5 w-5" />
    },
    {
      id: 'check-balance',
      title: 'Check Balance',
      description: 'View wallet balance',
      query: 'How do I check my wallet balance?',
      icon: <Wallet className="h-5 w-5" />
    },
    {
      id: 'contact-support',
      title: 'Contact Support',
      description: 'Get human assistance',
      query: 'I need to speak with customer support',
      icon: <MessageCircle className="h-5 w-5" />
    }
  ];

  const filteredFAQs = faqItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const handleQuickAction = (query: string) => {
    // Check if user wants human support
    if (query.toLowerCase().includes('customer support') || query.toLowerCase().includes('human assistance')) {
      // Redirect to general messaging with customer support
      window.location.href = '/messages?support=true';
      return;
    }
    
    sendAIQuery(query, { source: 'faq-chatbot', timestamp: new Date().toISOString() });
    setShowQuickActions(false);
  };

  const handleFAQClick = (faq: FAQItem) => {
    sendAIQuery(faq.question, { 
      source: 'faq-direct',
      category: faq.category,
      expectedAnswer: faq.answer
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
            <Bot className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">VeryChat AI Assistant</h1>
        <p className="text-gray-600 dark:text-gray-300">Get instant answers to your SolanaPay questions</p>
      </div>

      {/* Quick Actions */}
      {showQuickActions && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-purple-600" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.query)}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-left group"
              >
                <div className="flex items-center mb-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
                    {action.icon}
                  </div>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">{action.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{action.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search and Categories */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {category.icon}
              <span className="ml-2">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Items */}
      <div className="space-y-4">
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-8">
            <HelpCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No FAQs found matching your search</p>
          </div>
        ) : (
          filteredFAQs.map((faq) => (
            <div
              key={faq.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors cursor-pointer"
              onClick={() => handleFAQClick(faq)}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  {faq.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">{faq.question}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{faq.answer}</p>
                  <div className="flex items-center mt-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      faq.category === 'payments' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
                      faq.category === 'receipts' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400' :
                      faq.category === 'wallet' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400' :
                      faq.category === 'security' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {faq.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI Chat Prompt */}
      <div className="mt-8 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
        <div className="flex items-center mb-2">
          <Bot className="h-5 w-5 text-purple-600 mr-2" />
          <h3 className="font-medium text-gray-900 dark:text-white">Need more help?</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
          Ask me anything about SolanaPay! I can help with payments, receipts, wallet issues, and more.
        </p>
        <button
          onClick={() => sendAIQuery('I need help with SolanaPay')}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
        >
          Start AI Chat
        </button>
      </div>
    </div>
  );
};

export default AIFAQChatbot;
