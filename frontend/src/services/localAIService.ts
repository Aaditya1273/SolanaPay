// Local AI Service - no external dependencies needed for basic functionality

// Local AI Service Configuration
const LOCAL_AI_API_URL = (import.meta.env as any).VITE_LOCAL_AI_API_URL || 'http://localhost:11434';
const HUGGINGFACE_API_KEY = (import.meta.env as any).VITE_HUGGINGFACE_API_KEY;
const USE_OLLAMA = (import.meta.env as any).VITE_USE_OLLAMA === 'true';

export interface AIResponse {
  message: string;
  confidence: number;
  source: 'local' | 'huggingface' | 'fallback';
}

interface StreamingResponse {
  onMessage: (chunk: string) => void;
  onComplete: (fullMessage: string) => void;
  onError: (error: string) => void;
}

interface WalletQuery {
  type: 'balance' | 'transactions' | 'nfts' | 'general';
  address?: string;
  tokenAddress?: string;
}

interface KYCQuery {
  type: 'status' | 'requirements' | 'verification' | 'compliance';
  userId?: string;
}

interface PaymentQuery {
  type: 'history' | 'pending' | 'failed' | 'fees';
  userId?: string;
  timeRange?: string;
}

// Local knowledge base for SolanaPay
const SOLANAPAY_KNOWLEDGE_BASE: Record<string, Record<string, string>> = {
  wallet: {
    balance: "To check your wallet balance, navigate to the Dashboard and view your VRC token balance in the top-right corner. You can also see detailed breakdowns by clicking 'View Details'.",
    transactions: "Your transaction history is available in the 'Transactions' tab. You can filter by date, amount, or transaction type (sent/received).",
    connect: "Connect your wallet by clicking 'Connect Wallet' and selecting MetaMask. Make sure you're on the correct network (Ethereum mainnet or testnet).",
    security: "Always verify transaction details before signing. Never share your private keys or seed phrase. Use hardware wallets for large amounts."
  },
  payments: {
    send: "To send payments: 1) Click 'Send' 2) Enter recipient address 3) Specify amount 4) Review gas fees 5) Confirm transaction",
    receive: "Share your wallet address or QR code to receive payments. Payments are processed instantly on confirmation.",
    fees: "Network fees vary based on congestion. SolanaPay charges a 2.5% platform fee for escrow services.",
    history: "View all payment history in the Transactions section with detailed status tracking."
  },
  kyc: {
    status: "Check your KYC status in Account Settings. Green checkmark indicates verified status.",
    requirements: "KYC requires: Valid government ID, proof of address, and selfie verification.",
    verification: "Verification typically takes 24-48 hours. You'll receive email updates on status changes.",
    compliance: "SolanaPay follows strict AML/KYC regulations to ensure platform security and legal compliance."
  },
  tasks: {
    browse: "Browse available tasks in the Marketplace. Filter by category, payment amount, or skill level.",
    complete: "Complete tasks by following instructions and submitting deliverables. Payment is held in escrow until approval.",
    create: "Post your own tasks by clicking 'Create Task' and providing clear requirements and payment terms."
  },
  rewards: {
    earn: "Earn rewards by completing tasks, referring users, and maintaining high ratings.",
    nfts: "Loyalty NFTs are awarded for milestones. View your collection in the Rewards section.",
    points: "Reward points can be redeemed for platform benefits and exclusive features."
  }
};

// Intent detection using local NLP
export const detectIntent = (message: string): { intent: string; entities: Record<string, any>; confidence: number } => {
  const lowerMessage = message.toLowerCase();
  
  // Wallet-related intents
  if (lowerMessage.includes('balance') || lowerMessage.includes('how much')) {
    return { intent: 'wallet.balance', entities: {}, confidence: 0.9 };
  }
  if (lowerMessage.includes('transaction') || lowerMessage.includes('history')) {
    return { intent: 'wallet.transactions', entities: {}, confidence: 0.9 };
  }
  if (lowerMessage.includes('connect') || lowerMessage.includes('metamask')) {
    return { intent: 'wallet.connect', entities: {}, confidence: 0.9 };
  }
  
  // Payment intents
  if (lowerMessage.includes('send') || lowerMessage.includes('transfer')) {
    return { intent: 'payments.send', entities: {}, confidence: 0.8 };
  }
  if (lowerMessage.includes('receive') || lowerMessage.includes('get paid')) {
    return { intent: 'payments.receive', entities: {}, confidence: 0.8 };
  }
  if (lowerMessage.includes('fee') || lowerMessage.includes('cost')) {
    return { intent: 'payments.fees', entities: {}, confidence: 0.8 };
  }
  
  // KYC intents
  if (lowerMessage.includes('kyc') || lowerMessage.includes('verification')) {
    return { intent: 'kyc.status', entities: {}, confidence: 0.9 };
  }
  if (lowerMessage.includes('verify') || lowerMessage.includes('document')) {
    return { intent: 'kyc.requirements', entities: {}, confidence: 0.8 };
  }
  
  // Task intents
  if (lowerMessage.includes('task') || lowerMessage.includes('job')) {
    return { intent: 'tasks.browse', entities: {}, confidence: 0.8 };
  }
  
  // Rewards intents
  if (lowerMessage.includes('reward') || lowerMessage.includes('nft') || lowerMessage.includes('point')) {
    return { intent: 'rewards.earn', entities: {}, confidence: 0.8 };
  }
  
  return { intent: 'general', entities: {}, confidence: 0.5 };
};

// Local response generation
export const generateLocalResponse = (intent: string, _entities: Record<string, any>): string => {
  const [category, action] = intent.split('.');
  
  if (SOLANAPAY_KNOWLEDGE_BASE[category] && SOLANAPAY_KNOWLEDGE_BASE[category][action]) {
    return SOLANAPAY_KNOWLEDGE_BASE[category][action];
  }
  
  // Fallback responses
  switch (category) {
    case 'wallet':
      return "I can help you with wallet management, including checking balances, viewing transactions, and connecting MetaMask. What specific wallet question do you have?";
    case 'payments':
      return "For payments, I can guide you through sending money, receiving payments, or understanding fees. What payment feature interests you?";
    case 'kyc':
      return "I can help with KYC verification status, requirements, and the verification process. What KYC question do you have?";
    case 'tasks':
      return "The task marketplace lets you browse gigs, complete work, or post tasks. What would you like to know about tasks?";
    case 'rewards':
      return "SolanaPay's rewards system includes points, NFTs, and achievements. How can I help with rewards?";
    default:
      return "I'm here to help with SolanaPay! I can assist with wallet management, payments, KYC verification, tasks, and rewards. What would you like to know?";
  }
};

// Ollama integration for local LLM
export const queryOllama = async (message: string, model: string = 'llama2'): Promise<string> => {
  try {
    const response = await fetch(`${LOCAL_AI_API_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: `You are a helpful assistant for SolanaPay, a Web3 micro-economy platform. Answer this question: ${message}`,
        stream: false
      })
    });
    
    const data = await response.json();
    return data.response || 'I apologize, but I couldn\'t process your request.';
  } catch (error) {
    console.error('Ollama API Error:', error);
    throw new Error('Local AI service unavailable');
  }
};

// Hugging Face integration for cloud inference
export const queryHuggingFace = async (message: string): Promise<string> => {
  if (!HUGGINGFACE_API_KEY) {
    throw new Error('Hugging Face API key not configured');
  }
  
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: message })
      }
    );
    
    const data = await response.json();
    return data.generated_text || data[0]?.generated_text || 'I apologize, but I couldn\'t process your request.';
  } catch (error) {
    console.error('Hugging Face API Error:', error);
    throw new Error('Cloud AI service unavailable');
  }
};

// Main AI service function
export const processAIQuery = async (message: string): Promise<AIResponse> => {
  // First, try local intent detection and knowledge base
  const { intent, entities, confidence } = detectIntent(message);
  
  if (confidence > 0.7) {
    const localResponse = generateLocalResponse(intent, entities);
    return {
      message: localResponse,
      confidence,
      source: 'local'
    };
  }
  
  // Try Ollama if configured
  if (USE_OLLAMA) {
    try {
      const ollamaResponse = await queryOllama(message);
      return {
        message: ollamaResponse,
        confidence: 0.8,
        source: 'local'
      };
    } catch (error) {
      console.warn('Ollama unavailable, trying Hugging Face');
    }
  }
  
  // Try Hugging Face as backup
  if (HUGGINGFACE_API_KEY) {
    try {
      const hfResponse = await queryHuggingFace(message);
      return {
        message: hfResponse,
        confidence: 0.7,
        source: 'huggingface'
      };
    } catch (error) {
      console.warn('Hugging Face unavailable, using fallback');
    }
  }
  
  // Fallback to local knowledge base
  return {
    message: generateLocalResponse('general', {}),
    confidence: 0.5,
    source: 'fallback'
  };
};

// Streaming support for local AI
export const processAIQueryStream = async (
  message: string,
  callbacks: StreamingResponse
): Promise<void> => {
  try {
    if (USE_OLLAMA) {
      // Ollama streaming
      const response = await fetch(`${LOCAL_AI_API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama2',
          prompt: `You are a helpful assistant for SolanaPay. Answer: ${message}`,
          stream: true
        })
      });
      
      if (!response.ok) throw new Error('Ollama streaming failed');
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Streaming not supported');
      
      const decoder = new TextDecoder();
      let fullMessage = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              fullMessage += data.response;
              callbacks.onMessage(data.response);
            }
            if (data.done) {
              callbacks.onComplete(fullMessage);
              return;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
      
      callbacks.onComplete(fullMessage);
    } else {
      // Non-streaming fallback
      const response = await processAIQuery(message);
      callbacks.onMessage(response.message);
      callbacks.onComplete(response.message);
    }
  } catch (error) {
    callbacks.onError(error instanceof Error ? error.message : 'Streaming failed');
  }
};

// Wallet-specific query handlers
export const handleWalletQuery = async (query: WalletQuery): Promise<string> => {
  switch (query.type) {
    case 'balance':
      return "To check your balance, visit the Dashboard. Your VRC token balance is displayed prominently, with detailed breakdowns available.";
    case 'transactions':
      return "View your transaction history in the Transactions tab. You can filter by date, amount, and transaction type for easy tracking.";
    case 'nfts':
      return "Your loyalty NFTs are displayed in the Rewards section. These represent achievements and milestones in the SolanaPay ecosystem.";
    default:
      return "I can help with wallet balances, transaction history, and NFT collections. What specific information do you need?";
  }
};

// KYC-specific query handlers
export const handleKYCQuery = async (query: KYCQuery): Promise<string> => {
  switch (query.type) {
    case 'status':
      return "Check your KYC status in Account Settings. A green checkmark indicates successful verification.";
    case 'requirements':
      return "KYC verification requires: 1) Valid government-issued ID, 2) Proof of address (utility bill/bank statement), 3) Selfie verification.";
    case 'verification':
      return "KYC verification typically takes 24-48 hours. You'll receive email notifications about status updates.";
    case 'compliance':
      return "SolanaPay follows strict AML/KYC regulations to ensure platform security and regulatory compliance.";
    default:
      return "I can help with KYC status, requirements, verification process, and compliance questions. What do you need to know?";
  }
};

// Payment-specific query handlers
export const handlePaymentQuery = async (query: PaymentQuery): Promise<string> => {
  switch (query.type) {
    case 'history':
      return "Your complete payment history is available in the Transactions section with detailed status tracking and filtering options.";
    case 'pending':
      return "Pending payments are shown with a clock icon in your transaction list. Most payments process within minutes.";
    case 'failed':
      return "Failed transactions are marked with a red X. Common causes include insufficient balance or network congestion.";
    case 'fees':
      return "SolanaPay charges a 2.5% platform fee for escrow services. Network gas fees vary based on blockchain congestion.";
    default:
      return "I can help with payment history, pending transactions, failed payments, and fee information. What would you like to know?";
  }
};

export default {
  processAIQuery,
  processAIQueryStream,
  handleWalletQuery,
  handleKYCQuery,
  handlePaymentQuery,
  detectIntent,
  generateLocalResponse
};
