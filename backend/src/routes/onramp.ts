import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authMiddleware';

interface AuthRequest extends Request {
  user?: {
    id: string
    walletAddress: string
  }
}

const router = express.Router();
const prisma = new PrismaClient();

// Get onramp history
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    // Mock onramp transaction data
    const transactions = [
      {
        id: '1',
        amount: 100.00,
        currency: 'USD',
        cryptoAmount: 0.0025,
        cryptoCurrency: 'ETH',
        status: 'completed',
        provider: 'moonpay',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
        fees: 3.50,
        exchangeRate: 0.000025
      },
      {
        id: '2',
        amount: 50.00,
        currency: 'USD',
        cryptoAmount: 0.00125,
        cryptoCurrency: 'ETH',
        status: 'pending',
        provider: 'transak',
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        fees: 2.00,
        exchangeRate: 0.000025
      }
    ];

    res.json({
      success: true,
      data: transactions,
      total: transactions.length
    });
  } catch (error) {
    console.error('Error fetching onramp history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch onramp history'
    });
  }
});

// Get onramp providers and rates
router.get('/providers', authenticateToken, async (req, res) => {
  try {
    const providers = [
      {
        id: 'moonpay',
        name: 'MoonPay',
        description: 'Buy crypto with credit card or bank transfer',
        supportedCurrencies: ['USD', 'EUR', 'GBP'],
        supportedCrypto: ['ETH', 'BTC', 'USDC', 'USDT'],
        fees: {
          card: 4.5,
          bank: 1.0
        },
        processingTime: '5-10 minutes',
        enabled: true
      },
      {
        id: 'transak',
        name: 'Transak',
        description: 'Global fiat-to-crypto gateway',
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'INR'],
        supportedCrypto: ['ETH', 'BTC', 'MATIC', 'USDC'],
        fees: {
          card: 3.5,
          bank: 0.99
        },
        processingTime: '2-5 minutes',
        enabled: true
      }
    ];

    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('Error fetching onramp providers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch onramp providers'
    });
  }
});

// Get current exchange rates
router.get('/rates', authenticateToken, async (req, res) => {
  try {
    const { from, to } = req.query;
    
    // Mock exchange rates
    const rates = {
      'USD-ETH': 0.000025,
      'USD-BTC': 0.0000015,
      'USD-USDC': 1.0,
      'EUR-ETH': 0.000027,
      'EUR-BTC': 0.0000016,
      'GBP-ETH': 0.000031
    };

    const rateKey = `${from}-${to}`;
    const rate = rates[rateKey as keyof typeof rates] || 0;

    res.json({
      success: true,
      data: {
        from,
        to,
        rate,
        timestamp: new Date(),
        validFor: 30 // seconds
      }
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exchange rates'
    });
  }
});

// Create onramp transaction
router.post('/transaction', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, currency, cryptoCurrency, provider, paymentMethod } = req.body;
    const userId = req.user?.id;

    if (!amount || !currency || !cryptoCurrency || !provider) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Mock transaction creation
    const transaction = {
      id: Date.now().toString(),
      userId,
      amount,
      currency,
      cryptoCurrency,
      provider,
      paymentMethod,
      status: 'pending',
      createdAt: new Date(),
      fees: amount * 0.035, // 3.5% fee
      exchangeRate: 0.000025 // Mock rate
    };

    res.json({
      success: true,
      data: transaction,
      message: 'Onramp transaction created successfully'
    });
  } catch (error) {
    console.error('Error creating onramp transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create onramp transaction'
    });
  }
});

export default router;
