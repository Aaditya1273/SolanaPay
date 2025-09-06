import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { body, validationResult } from 'express-validator'
import crypto from 'crypto'
import axios from 'axios'
import { authenticateToken } from '../middleware/authMiddleware'

interface AuthRequest extends Request {
  user?: {
    id: string
    walletAddress: string
    kycLevel?: string
  }
}

const router = Router()
const prisma = new PrismaClient()

// Settlement configuration
const SETTLEMENT_CONFIG = {
  fiatProviders: {
    stripe: {
      apiKey: process.env.STRIPE_SECRET_KEY,
      baseUrl: 'https://api.stripe.com/v1'
    },
    wise: {
      apiKey: process.env.WISE_API_KEY,
      baseUrl: 'https://api.transferwise.com/v1'
    }
  },
  cryptoProviders: {
    circle: {
      apiKey: process.env.CIRCLE_API_KEY,
      baseUrl: 'https://api.circle.com/v1'
    }
  },
  fees: {
    fiat: 0.025, // 2.5% for fiat settlements
    crypto: 0.01 // 1% for crypto settlements
  }
}

// @desc    Create merchant settlement request
// @route   POST /api/settlements/create
// @access  Private (Merchants only)
router.post('/create', [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').isIn(['USD', 'EUR', 'GBP']).withMessage('Invalid currency'),
  body('type').isIn(['FIAT', 'STABLECOIN']).withMessage('Invalid settlement type'),
  body('provider').optional().isString(),
  body('destination').isString().withMessage('Destination is required')
], authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      })
    }

    const {
      amount,
      currency,
      type,
      provider,
      destination
    } = req.body

    // Verify user is a merchant
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { 
        kycStatus: true,
        totalEarnings: true,
        totalSpent: true
      }
    })

    if (!user || user.kycStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: 'KYC verification required for settlements'
      })
    }

    // Check available balance
    const availableBalance = user.totalEarnings - user.totalSpent
    if (availableBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance for settlement'
      })
    }

    // Check settlement limits
    const maxAmount = 10000
    if (amount > maxAmount) {
      return res.status(400).json({ 
        error: `Settlement amount exceeds limit. Max: $${maxAmount}` 
      })
    }

    // Calculate fees
    const feeRate = type === 'FIAT' 
      ? SETTLEMENT_CONFIG.fees.fiat 
      : SETTLEMENT_CONFIG.fees.crypto
    const fees = amount * feeRate
    const netAmount = amount - fees

    // Create settlement record
    const settlement = await prisma.merchantSettlement.create({
      data: {
        userId: req.user?.id!,
        settlementType: type,
        currency,
        amount,
        fees,
        netAmount,
        status: 'PENDING',
        provider
      }
    })

    // Process settlement based on type
    if (type === 'FIAT') {
      await processFiatSettlement(settlement)
    } else {
      await processStablecoinSettlement(settlement)
    }

    // Update user balance
    await prisma.user.update({
      where: { id: req.user?.id! },
      data: { totalSpent: { increment: amount } }
    })

    // Emit WebSocket notification
    const io = req.app.get('io')
    if (io) {
      io.to(`user-${req.user?.id}`).emit('settlement-created', {
        settlementId: settlement.id,
        type: 'settlement',
        message: `Settlement request created: ${netAmount} ${currency}`
      })
    }

    res.json({
      success: true,
      settlement: {
        id: settlement.id,
        settlementType: settlement.settlementType,
        currency,
        amount,
        fees,
        netAmount,
        status: settlement.status
      },
      message: 'Settlement request created successfully'
    })

  } catch (error) {
    console.error('Settlement creation error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create settlement request'
    })
  }
})

// @desc    Get merchant settlement history
// @route   GET /api/settlements/history
// @access  Private
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit

    const settlements = await prisma.merchantSettlement.findMany({
      where: { userId: req.user?.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    const total = await prisma.merchantSettlement.count({
      where: { userId: req.user?.id }
    })

    res.json({
      success: true,
      settlements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Settlement history error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settlement history'
    })
  }
})

// @desc    Get settlement status
// @route   GET /api/settlements/status/:settlementId
// @access  Private
router.get('/:settlementId/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { settlementId } = req.params

    const settlement = await prisma.merchantSettlement.findFirst({
      where: {
        id: settlementId,
        userId: req.user?.id
      }
    })

    if (!settlement) {
      return res.status(404).json({ error: 'Settlement not found' })
    }

    // Check external status if available
    if (settlement.externalId) {
      try {
        const externalStatus = await getExternalStatus(settlement)
        if (externalStatus && externalStatus !== settlement.status) {
          await prisma.merchantSettlement.update({
            where: { id: settlement.id },
            data: { 
              status: externalStatus,
              processedAt: externalStatus === 'COMPLETED' ? new Date() : null
            }
          })
          settlement.status = externalStatus
        }
      } catch (error) {
        console.error('External status check failed:', error)
      }
    }

    res.json({
      success: true,
      settlement: {
        id: settlement.id,
        settlementType: settlement.settlementType,
        currency: settlement.currency,
        amount: settlement.amount,
        fees: settlement.fees,
        netAmount: settlement.netAmount,
        status: settlement.status,
        createdAt: settlement.createdAt,
        processedAt: settlement.processedAt
      }
    })

  } catch (error) {
    console.error('Settlement status error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to check settlement status'
    })
  }
})

// @desc    Cancel settlement request
// @route   POST /api/settlements/cancel/:settlementId
// @access  Private
router.post('/cancel/:settlementId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { settlementId } = req.params

    const settlement = await prisma.merchantSettlement.findFirst({
      where: {
        id: settlementId,
        userId: req.user?.id,
        status: 'PENDING'
      }
    })

    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: 'Settlement not found or cannot be cancelled'
      })
    }

    // Update settlement status
    await prisma.merchantSettlement.update({
      where: { id: settlement.id },
      data: { status: 'CANCELLED' }
    })

    // Refund the amount to user balance
    await prisma.user.update({
      where: { id: req.user?.id! },
      data: { totalSpent: { decrement: settlement.amount } }
    })

    res.json({
      success: true,
      message: 'Settlement cancelled successfully'
    })

  } catch (error) {
    console.error('Settlement cancellation error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to cancel settlement'
    })
  }
})

// @desc    Get settlement options and fees
// @route   GET /api/settlements/options
// @access  Private
router.get('/options', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { id: true }
    })

    const options = {
      fiatProviders: ['STRIPE', 'WISE', 'PAYPAL'],
      stablecoinProviders: ['CIRCLE', 'CENTRE'],
      currencies: ['USD', 'EUR', 'GBP'],
      limits: {
        daily: 10000,
        monthly: 50000
      }
    }

    res.json({
      success: true,
      options
    })

  } catch (error) {
    console.error('Settlement options error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settlement options'
    })
  }
})

// Helper functions
async function processFiatSettlement(settlement: any) {
  try {
    // Mock Wise API integration
    const wiseResponse = await mockWiseTransfer(settlement)
    
    await prisma.merchantSettlement.update({
      where: { id: settlement.id },
      data: {
        status: 'PROCESSING',
        externalId: wiseResponse.transferId,
        provider: 'WISE'
      }
    })

    console.log(`Fiat settlement initiated: ${settlement.id}`)
  } catch (error) {
    console.error('Fiat settlement error:', error)
    await prisma.merchantSettlement.update({
      where: { id: settlement.id },
      data: { status: 'FAILED' }
    })
  }
}

async function processStablecoinSettlement(settlement: any) {
  try {
    // Mock Circle API integration
    const circleResponse = await mockCircleTransfer(settlement)
    
    await prisma.merchantSettlement.update({
      where: { id: settlement.id },
      data: {
        status: 'PROCESSING',
        externalId: circleResponse.transferId,
        provider: 'CIRCLE'
      }
    })

    console.log(`Stablecoin settlement initiated: ${settlement.id}`)
  } catch (error) {
    console.error('Stablecoin settlement error:', error)
    await prisma.merchantSettlement.update({
      where: { id: settlement.id },
      data: { status: 'FAILED' }
    })
  }
}

async function mockWiseTransfer(settlement: any) {
  // Mock Wise API response
  return {
    transferId: `wise_${settlement.id}_${Date.now()}`,
    status: 'processing',
    estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  }
}

async function mockCircleTransfer(settlement: any) {
  // Mock Circle API response
  return {
    transferId: `circle_${settlement.id}_${Date.now()}`,
    status: 'pending',
    txHash: `0x${crypto.randomBytes(32).toString('hex')}`
  }
}

async function getExternalStatus(settlement: any) {
  if (settlement.provider === 'WISE') {
    // Mock Wise status check
    return Math.random() > 0.5 ? 'COMPLETED' : 'PROCESSING'
  } else if (settlement.provider === 'CIRCLE') {
    // Mock Circle status check
    return Math.random() > 0.3 ? 'COMPLETED' : 'PROCESSING'
  }
  return settlement.status
}

export default router
