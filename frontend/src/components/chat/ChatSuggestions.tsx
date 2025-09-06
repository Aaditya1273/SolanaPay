import React from 'react';
import { MessageCircle, Wallet, Briefcase, Gift, Shield, HelpCircle } from 'lucide-react';

interface ChatSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void;
  className?: string;
}

export const ChatSuggestions: React.FC<ChatSuggestionsProps> = ({ 
  onSuggestionClick, 
  className = '' 
}) => {
  const suggestions = [
    {
      icon: Wallet,
      text: "How do I connect my MetaMask wallet?",
      category: "Wallet"
    },
    {
      icon: MessageCircle,
      text: "How do I send a payment?",
      category: "Payments"
    },
    {
      icon: Briefcase,
      text: "What tasks are available?",
      category: "Tasks"
    },
    {
      icon: Gift,
      text: "How do I earn rewards?",
      category: "Rewards"
    },
    {
      icon: Shield,
      text: "Is my wallet secure?",
      category: "Security"
    },
    {
      icon: HelpCircle,
      text: "What are SolanaPay tokens?",
      category: "General"
    }
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-sm font-medium text-gray-600 mb-3">Quick questions:</h4>
      <div className="grid grid-cols-1 gap-2">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={index}
              onClick={() => onSuggestionClick(suggestion.text)}
              className="flex items-center space-x-3 p-3 text-left bg-gray-50 hover:bg-purple-50 rounded-lg transition-colors group"
            >
              <Icon className="w-4 h-4 text-purple-600 group-hover:text-purple-700" />
              <div>
                <p className="text-sm text-gray-800 group-hover:text-purple-800">
                  {suggestion.text}
                </p>
                <p className="text-xs text-gray-500">{suggestion.category}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
