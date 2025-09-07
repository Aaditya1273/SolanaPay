import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/authMiddleware';
import crypto from 'crypto';

interface AuthRequest extends Request {
  user?: {
    id: string;
    walletAddress: string;
    kycLevel?: string;
  };
}

const router = Router();
const prisma = new PrismaClient();

// @desc    Register merchant
// @route   POST /api/merchant/register
// @access  Private
router.post('/register', [
  body('businessName').isString().isLength({ min: 2, max: 100 }),
  body('businessType').isIn(['RETAIL', 'RESTAURANT', 'SERVICE', 'ECOMMERCE', 'OTHER']),
  body('website').optional().isURL(),
  body('description').optional().isString().isLength({ max: 500 }),
], authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { businessName, businessType, website, description } = req.body;

    // Check if user is already a merchant
    const existingMerchant = await prisma.merchant.findUnique({
      where: { userId: req.user?.id }
    });

    if (existingMerchant) {
      return res.status(400).json({
        success: false,
        message: 'User is already registered as a merchant'
      });
    }

    // Generate API credentials
    const apiKey = `spay_${crypto.randomBytes(32).toString('hex')}`;
    const apiSecret = crypto.randomBytes(64).toString('hex');

    // Create merchant record
    const merchant = await prisma.merchant.create({
      data: {
        userId: req.user?.id!,
        businessName,
        businessType,
        website,
        description,
        apiKey,
        apiSecret,
        status: 'PENDING',
        isActive: false
      }
    });

    res.status(201).json({
      success: true,
      merchant: {
        id: merchant.id,
        businessName: merchant.businessName,
        businessType: merchant.businessType,
        status: merchant.status,
        apiKey: merchant.apiKey,
        createdAt: merchant.createdAt
      },
      message: 'Merchant registration successful. Awaiting approval.'
    });

  } catch (error) {
    console.error('Merchant registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register merchant'
    });
  }
});

// @desc    Get merchant profile
// @route   GET /api/merchant/profile
// @access  Private
router.get('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { userId: req.user?.id },
      include: {
        _count: {
          select: {
            transactions: true,
            customers: true
          }
        }
      }
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant profile not found'
      });
    }

    res.json({
      success: true,
      merchant: {
        id: merchant.id,
        businessName: merchant.businessName,
        businessType: merchant.businessType,
        website: merchant.website,
        description: merchant.description,
        status: merchant.status,
        isActive: merchant.isActive,
        apiKey: merchant.apiKey,
        totalTransactions: merchant._count.transactions,
        totalCustomers: merchant._count.customers,
        createdAt: merchant.createdAt,
        updatedAt: merchant.updatedAt
      }
    });

  } catch (error) {
    console.error('Get merchant profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch merchant profile'
    });
  }
});

// @desc    Create payment intent
// @route   POST /api/merchant/payment/create
// @access  Private (API Key)
router.post('/payment/create', [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').isIn(['SOL', 'USDC']).withMessage('Invalid currency'),
  body('description').optional().isString().isLength({ max: 200 }),
  body('customerEmail').optional().isEmail(),
  body('metadata').optional().isObject(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Verify API key
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key required'
      });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { apiKey },
      select: { id: true, isActive: true, status: true }
    });

    if (!merchant || !merchant.isActive || merchant.status !== 'APPROVED') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive API key'
      });
    }

    const { amount, currency, description, customerEmail, metadata } = req.body;

    // Create payment intent
    const paymentIntent = await prisma.paymentIntent.create({
      data: {
        merchantId: merchant.id,
        amount: parseFloat(amount),
        currency,
        description,
        customerEmail,
        metadata: metadata || {},
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      }
    });

    res.status(201).json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        description: paymentIntent.description,
        status: paymentIntent.status,
        expiresAt: paymentIntent.expiresAt,
        createdAt: paymentIntent.createdAt
      }
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent'
    });
  }
});

// @desc    Get payment intent status
// @route   GET /api/merchant/payment/:intentId
// @access  Private (API Key)
router.get('/payment/:intentId', async (req: Request, res: Response) => {
  try {
    const { intentId } = req.params;
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key required'
      });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { apiKey },
      select: { id: true }
    });

    if (!merchant) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    const paymentIntent = await prisma.paymentIntent.findFirst({
      where: {
        id: intentId,
        merchantId: merchant.id
      }
    });

    if (!paymentIntent) {
      return res.status(404).json({
        success: false,
        message: 'Payment intent not found'
      });
    }

    res.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        description: paymentIntent.description,
        status: paymentIntent.status,
        transactionHash: paymentIntent.transactionHash,
        expiresAt: paymentIntent.expiresAt,
        createdAt: paymentIntent.createdAt,
        completedAt: paymentIntent.completedAt
      }
    });

  } catch (error) {
    console.error('Get payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment intent'
    });
  }
});

// @desc    Get merchant analytics
// @route   GET /api/merchant/analytics
// @access  Private
router.get('/analytics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { userId: req.user?.id },
      select: { id: true }
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    const period = req.query.period as string || '30d';
    const startDate = getStartDate(period);

    // Get analytics data
    const [
      totalTransactions,
      totalRevenue,
      successfulPayments,
      failedPayments,
      topCustomers,
      recentTransactions
    ] = await Promise.all([
      prisma.paymentIntent.count({
        where: {
          merchantId: merchant.id,
          createdAt: { gte: startDate }
        }
      }),
      prisma.paymentIntent.aggregate({
        where: {
          merchantId: merchant.id,
          status: 'COMPLETED',
          createdAt: { gte: startDate }
        },
        _sum: { amount: true }
      }),
      prisma.paymentIntent.count({
        where: {
          merchantId: merchant.id,
          status: 'COMPLETED',
          createdAt: { gte: startDate }
        }
      }),
      prisma.paymentIntent.count({
        where: {
          merchantId: merchant.id,
          status: 'FAILED',
          createdAt: { gte: startDate }
        }
      }),
      prisma.paymentIntent.groupBy({
        by: ['customerEmail'],
        where: {
          merchantId: merchant.id,
          status: 'COMPLETED',
          customerEmail: { not: null },
          createdAt: { gte: startDate }
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10
      }),
      prisma.paymentIntent.findMany({
        where: {
          merchantId: merchant.id,
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          customerEmail: true,
          createdAt: true
        }
      })
    ]);

    const analytics = {
      period,
      totalTransactions,
      totalRevenue: totalRevenue._sum.amount || 0,
      successfulPayments,
      failedPayments,
      successRate: totalTransactions > 0 ? (successfulPayments / totalTransactions * 100).toFixed(2) : '0.00',
      topCustomers: topCustomers.map(customer => ({
        email: customer.customerEmail,
        totalSpent: customer._sum.amount,
        transactionCount: customer._count.id
      })),
      recentTransactions
    };

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Get merchant analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
});

// @desc    Get merchant customers
// @route   GET /api/merchant/customers
// @access  Private
router.get('/customers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { userId: req.user?.id },
      select: { id: true }
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const customers = await prisma.paymentIntent.groupBy({
      by: ['customerEmail'],
      where: {
        merchantId: merchant.id,
        customerEmail: { not: null }
      },
      _sum: { amount: true },
      _count: { id: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
      skip,
      take: limit
    });

    const total = await prisma.paymentIntent.groupBy({
      by: ['customerEmail'],
      where: {
        merchantId: merchant.id,
        customerEmail: { not: null }
      }
    }).then(result => result.length);

    const formattedCustomers = customers.map(customer => ({
      email: customer.customerEmail,
      totalSpent: customer._sum.amount || 0,
      transactionCount: customer._count.id,
      lastTransaction: customer._max.createdAt
    }));

    res.json({
      success: true,
      customers: formattedCustomers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get merchant customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers'
    });
  }
});

// @desc    Create loyalty reward
// @route   POST /api/merchant/loyalty/create
// @access  Private
router.post('/loyalty/create', [
  body('customerEmail').isEmail(),
  body('points').isInt({ min: 1 }),
  body('reason').isString().isLength({ max: 200 }),
], authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { userId: req.user?.id },
      select: { id: true }
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    const { customerEmail, points, reason } = req.body;

    const loyaltyReward = await prisma.loyaltyReward.create({
      data: {
        merchantId: merchant.id,
        customerEmail,
        points,
        reason,
        status: 'ACTIVE'
      }
    });

    res.status(201).json({
      success: true,
      loyaltyReward,
      message: 'Loyalty reward created successfully'
    });

  } catch (error) {
    console.error('Create loyalty reward error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create loyalty reward'
    });
  }
});

// @desc    Get loyalty rewards
// @route   GET /api/merchant/loyalty
// @access  Private
router.get('/loyalty', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { userId: req.user?.id },
      select: { id: true }
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    const customerEmail = req.query.customerEmail as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = { merchantId: merchant.id };
    if (customerEmail) {
      where.customerEmail = customerEmail;
    }

    const [rewards, total] = await Promise.all([
      prisma.loyaltyReward.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.loyaltyReward.count({ where })
    ]);

    res.json({
      success: true,
      rewards,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get loyalty rewards error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loyalty rewards'
    });
  }
});

// Helper function to get start date based on period
function getStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

export default router;
