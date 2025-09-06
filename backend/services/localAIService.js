const fetch = require('node-fetch');

// Local AI Service Configuration
const LOCAL_AI_API_URL = process.env.LOCAL_AI_API_URL || 'http://localhost:11434';
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const USE_OLLAMA = process.env.USE_OLLAMA === 'true';

// SolanaPay Knowledge Base
const SOLANAPAY_KNOWLEDGE_BASE = {
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
function detectIntent(message) {
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
}

// Local response generation
function generateLocalResponse(intent, entities) {
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
}

// Ollama integration for local LLM
async function queryOllama(message, model = 'llama2') {
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
}

// Hugging Face integration for cloud inference
async function queryHuggingFace(message) {
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
}

// Main AI processing function (replaces VeryChat)
async function processAIQuery(query, context) {
  // First, try local intent detection and knowledge base
  const { intent, entities, confidence } = detectIntent(query);
  
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
      const ollamaResponse = await queryOllama(query);
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
      const hfResponse = await queryHuggingFace(query);
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
}

// Enhanced response with context-specific information
function enhanceResponseWithContext(response, context) {
  if (context && context.userWallet) {
    if (response.includes('balance')) {
      return response + `\n\n💡 Your current wallet: ${context.userWallet.slice(0, 6)}...${context.userWallet.slice(-4)}`;
    }
  }
  
  if (context && context.kycStatus) {
    if (response.includes('KYC') || response.includes('verification')) {
      return response + `\n\n📋 Your KYC status: ${context.kycStatus}`;
    }
  }
  
  return response;
}

// Generate automated payment messages
function generatePaymentMessage(type, status, amount, transactionId) {
  const messages = {
    'payment_sent': {
      'success': `✅ Payment sent successfully! ${amount} VRC has been transferred. Transaction ID: ${transactionId}`,
      'pending': `⏳ Payment is being processed. ${amount} VRC transfer is pending confirmation. Transaction ID: ${transactionId}`,
      'failed': `❌ Payment failed. Unable to transfer ${amount} VRC. Please check your balance and try again. Transaction ID: ${transactionId}`
    },
    'payment_received': {
      'success': `💰 Payment received! You've received ${amount} VRC. Transaction ID: ${transactionId}`,
      'pending': `⏳ Incoming payment detected. ${amount} VRC is being confirmed. Transaction ID: ${transactionId}`
    },
    'task_payment': {
      'success': `🎉 Task completed! You've earned ${amount} VRC for your work. Transaction ID: ${transactionId}`,
      'pending': `⏳ Task payment processing. ${amount} VRC will be released upon approval. Transaction ID: ${transactionId}`
    }
  };
  
  return messages[type]?.[status] || `Transaction update: ${type} - ${status} - ${amount} VRC - ${transactionId}`;
}

module.exports = {
  processAIQuery,
  generatePaymentMessage,
  enhanceResponseWithContext,
  detectIntent,
  generateLocalResponse
};
