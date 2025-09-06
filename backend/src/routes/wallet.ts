import express, { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { body, validationResult } from 'express-validator'
import { asyncHandler } from '../middleware/errorMiddleware'
import { protect } from '../middleware/authMiddleware'

const router = express.Router()
const prisma = new PrismaClient()

// @desc    Get wallet balance
// @route   GET /api/wallet/balance
// @access  Private
router.get('/balance', protect, asyncHandler(async (req: any, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      walletAddress: true,
      totalEarnings: true,
      totalSpent: true,
    }
  })

  // In a real implementation, you'd query the blockchain for actual balance
  const balance = user?.totalEarnings || 0 - (user?.totalSpent || 0)

  res.json({
    success: true,
    balance,
    walletAddress: user?.walletAddress,
    totalEarnings: user?.totalEarnings,
    totalSpent: user?.totalSpent,
  })
}))

// @desc    Get transaction history
// @route   GET /api/wallet/transactions
// @access  Private
router.get('/transactions', protect, asyncHandler(async (req: any, res: Response) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 20
  const type = req.query.type // 'sent', 'received', or undefined for all
  const skip = (page - 1) * limit

  // Build where clause based on type filter
  let whereClause: any = {
    userId: req.user.id
  }

  if (type === 'sent') {
    whereClause.amount = { lt: 0 } // Negative amounts are sent payments
  } else if (type === 'received') {
    whereClause.amount = { gt: 0 } // Positive amounts are received payments
  }

  const transactions = await prisma.transaction.findMany({
    where: whereClause,
    include: {
      user: {
        select: { username: true, avatar: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  })

  const total = await prisma.transaction.count({
    where: whereClause
  })

  // Transform transactions for frontend compatibility
  const transformedTransactions = transactions.map(tx => ({
    id: tx.id,
    recipientId: tx.amount < 0 ? 'unknown' : req.user.id,
    recipientUsername: tx.amount < 0 ? (tx.description?.split(' ').pop() || 'Unknown') : req.user.username,
    recipientName: tx.amount < 0 ? (tx.description?.split(' ').pop() || 'Unknown') : req.user.username,
    amount: Math.abs(tx.amount),
    createdAt: tx.createdAt,
    type: tx.amount < 0 ? 'sent' : 'received',
    status: tx.status,
    description: tx.description || '',
    txHash: tx.txHash
  }))

  res.json({
    success: true,
    transactions: transformedTransactions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    }
  })
}))

// @desc    Send payment
// @route   POST /api/wallet/send
// @access  Private
router.post('/send', [
  protect,
  body('recipientAddress').notEmpty().withMessage('Recipient address is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be at least 0.01'),
  body('description').optional().isLength({ max: 255 }).withMessage('Description too long')
], asyncHandler(async (req: any, res: Response) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { recipientAddress, amount, description } = req.body

    // Find recipient
    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress: recipientAddress },
          { username: recipientAddress },
          { email: recipientAddress }
        ]
      }
    })

    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' })
    }

    if (recipient.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot send payment to yourself' })
    }

    // Check sender balance (simplified - in real app, check blockchain)
    const sender = await prisma.user.findUnique({
      where: { id: req.user.id }
    })

    const senderBalance = (sender?.totalEarnings || 0) - (sender?.totalSpent || 0)
    if (senderBalance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' })
    }

    // Create transaction for sender
    const transaction = await prisma.transaction.create({
      data: {
        userId: req.user.id,
        amount: -amount, // Negative for outgoing payment
        type: 'PAYMENT',
        status: 'COMPLETED',
        description: description || `Payment to ${recipient.username}`,
        toAddress: recipient.walletAddress,
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      },
      include: {
        user: {
          select: { username: true, avatar: true }
        }
      }
    })

    // Create transaction for recipient
    await prisma.transaction.create({
      data: {
        userId: recipient.id,
        amount: amount, // Positive for incoming payment
        type: 'PAYMENT',
        status: 'COMPLETED',
        description: description || `Payment from ${req.user.username}`,
        fromAddress: req.user.walletAddress,
        txHash: transaction.txHash,
      }
    })

    // Update user balances
    await prisma.user.update({
      where: { id: req.user.id },
      data: { totalSpent: { increment: amount } }
    })

    await prisma.user.update({
      where: { id: recipient.id },
      data: { totalEarnings: { increment: amount } }
    })

    // Emit real-time notifications
    const io = req.app.get('io')
    
    // Notify recipient
    io.to(`user-${recipient.id}`).emit('payment-received', {
      transaction,
      message: `You received ${amount} VRC from ${req.user.username}`
    })
    
    // Send payment event notification to both users
    io.to(`user-${recipient.id}`).emit('payment-event', {
      type: 'success',
      message: `Payment received: ${amount} VRC from ${req.user.username}`,
      amount,
      from: req.user.username,
      timestamp: new Date().toISOString()
    })
    
    io.to(`user-${req.user.id}`).emit('payment-event', {
      type: 'success', 
      message: `Payment sent: ${amount} VRC to ${recipient.username}`,
      amount,
      to: recipient.username,
      timestamp: new Date().toISOString()
    })

    res.json({
      success: true,
      transaction,
      message: 'Payment sent successfully'
    })
  })
)

// @desc    Create payment request
// @route   POST /api/wallet/request
// @access  Private
router.post('/request',
  protect,
  [
    body('amount').isFloat({ min: 0.01 }),
    body('description').optional().isLength({ max: 500 }),
  ],
  asyncHandler(async (req: any, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { amount, description } = req.body

    // Generate payment request QR code data
    const paymentRequest = {
      id: `req_${Date.now()}`,
      userId: req.user.id,
      username: req.user.username,
      amount,
      description,
      createdAt: new Date().toISOString(),
    }

    res.json({
      success: true,
      paymentRequest,
      qrData: JSON.stringify(paymentRequest),
    })
  })
)

export default router
