// VPay-specific prompts and context for VeryChat
export const VPAY_CONTEXT = `
You are a helpful AI assistant for VPay, a Web3 micro-economy platform. VPay offers:

CORE FEATURES:
- Secure Web3 wallet integration with MetaMask
- Peer-to-peer payments with crypto and fiat
- Task marketplace for gig work and freelancing
- Rewards system with points, achievements, and tier progression
- Escrow services for secure transactions
- Multi-currency support (ETH, USDC, VPay tokens)

USER CAPABILITIES:
- Send/receive payments globally
- Browse and complete micro-tasks
- Earn rewards and unlock achievements
- Manage crypto wallet and view transaction history
- Create and post tasks for others
- Participate in the VPay economy

HELP TOPICS:
- Wallet setup and MetaMask connection
- Making payments and transfers
- Finding and completing tasks
- Understanding the rewards system
- Security best practices
- Transaction troubleshooting
- Account management

Always provide helpful, accurate information about VPay features. If asked about topics outside VPay, politely redirect to VPay-related assistance.
`;

export const QUICK_RESPONSES = {
  wallet: "I can help you with wallet setup, connecting MetaMask, checking balances, or transaction history. What specific wallet question do you have?",
  payments: "For payments, you can send money globally, receive payments, or set up recurring transfers. What payment feature interests you?",
  tasks: "The task marketplace lets you browse available gigs, complete work for rewards, or post your own tasks. What would you like to know about tasks?",
  rewards: "VPay's rewards system includes points, achievements, tier progression, and a rewards store. How can I help with rewards?",
  security: "Security is crucial in Web3. I can help with wallet security, transaction safety, or account protection. What security topic concerns you?",
  troubleshooting: "I can help troubleshoot connection issues, failed transactions, or account problems. What specific issue are you experiencing?"
};

export const SUGGESTED_QUESTIONS = [
  "How do I connect my MetaMask wallet?",
  "How do I send a payment?",
  "What tasks are available?",
  "How do I earn rewards?",
  "Is my wallet secure?",
  "How do I check my transaction history?",
  "What are VPay tokens?",
  "How do I complete KYC verification?",
  "What fees does VPay charge?",
  "How do I withdraw my earnings?"
];

export const enhanceMessageWithContext = (userMessage: string): string => {
  return `${VPAY_CONTEXT}\n\nUser question: ${userMessage}\n\nProvide a helpful response about VPay features and capabilities.`;
};

export const detectIntent = (message: string): string | null => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('wallet') || lowerMessage.includes('metamask') || lowerMessage.includes('connect')) {
    return 'wallet';
  }
  if (lowerMessage.includes('payment') || lowerMessage.includes('send') || lowerMessage.includes('transfer')) {
    return 'payments';
  }
  if (lowerMessage.includes('task') || lowerMessage.includes('gig') || lowerMessage.includes('work')) {
    return 'tasks';
  }
  if (lowerMessage.includes('reward') || lowerMessage.includes('point') || lowerMessage.includes('achievement')) {
    return 'rewards';
  }
  if (lowerMessage.includes('security') || lowerMessage.includes('safe') || lowerMessage.includes('secure')) {
    return 'security';
  }
  if (lowerMessage.includes('error') || lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
    return 'troubleshooting';
  }
  
  return null;
};
