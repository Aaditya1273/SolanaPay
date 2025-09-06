const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { body, validationResult } = require('express-validator')
const crypto = require('crypto')
const axios = require('axios')
const { authMiddleware } = require('../middleware/authMiddleware')

const router = express.Router()
const prisma = new PrismaClient()

// Ramp Network configuration
const RAMP_CONFIG = {
  hostApiKey: process.env.RAMP_HOST_API_KEY,
  hostLogoUrl: process.env.RAMP_HOST_LOGO_URL || 'https://vpay.com/logo.png',
  hostAppName: 'VPay',
  webhookSecret: process.env.RAMP_WEBHOOK_SECRET,
  baseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://api.ramp.network' 
    : 'https://api-testnet.ramp.network'
}

// @desc    Initiate on-ramp transaction
// @route   POST /api/onramp/initiate
// @access  Private
router.post('/initiate',
  authMiddleware,
  [
    body('fiatCurrency').isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'JPY']),
    body('cryptoCurrency').isIn(['ETH', 'USDC', 'USDT', 'DAI']),
    body('fiatValue').isFloat({ min: 10, max: 10000 }),
    body('userAddress').isEthereumAddress(),
    body('returnUrl').optional().isURL(),
    body('webhookUrl').optional().isURL()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        })
      }

      const {
        fiatCurrency,
        cryptoCurrency,
        fiatValue,
        userAddress,
        returnUrl,
        webhookUrl
      } = req.body

      // Check user KYC status
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { 
          kycStatus: true, 
          kycLevel: true,
          email: true,
          username: true
        }
      })

      if (user.kycStatus !== 'APPROVED') {
        return res.status(403).json({
          success: false,
          message: 'KYC verification required for on-ramp transactions',
          kycStatus: user.kycStatus
        })
      }

      // Create on-ramp transaction record
      const onrampTransaction = await prisma.onrampTransaction.create({
        data: {
          userId: req.user.id,
          fiatCurrency,
          cryptoCurrency,
          fiatValue: parseFloat(fiatValue),
          userAddress,
          status: 'INITIATED',
          provider: 'RAMP',
          metadata: {
            returnUrl,
            webhookUrl,
            userEmail: user.email
          }
        }
      })

      // Generate Ramp purchase configuration
      const rampConfig = {
        hostApiKey: RAMP_CONFIG.hostApiKey,
        variant: 'auto',
        swapAsset: `${cryptoCurrency}_*`,
        fiatCurrency,
        fiatValue: fiatValue.toString(),
        userAddress,
        hostLogoUrl: RAMP_CONFIG.hostLogoUrl,
        hostAppName: RAMP_CONFIG.hostAppName,
        webhookStatusUrl: webhookUrl || `${process.env.BACKEND_URL}/api/onramp/webhook`,
        finalUrl: returnUrl || `${process.env.FRONTEND_URL}/dashboard?onramp=success`,
        userEmailAddress: user.email,
        selectedCountryCode: 'AUTO',
        defaultAsset: cryptoCurrency,
        enabledFlows: 'ONRAMP',
        // Compliance and security
        enabledPaymentMethodTypes: 'MANUAL_BANK_TRANSFER,AUTO_BANK_TRANSFER,CARD_PAYMENT',
        offrampWebhookV3Url: `${process.env.BACKEND_URL}/api/onramp/webhook`,
        // Custom styling
        primaryColor: '#8B5CF6',
        secondaryColor: '#A855F7',
        borderRadius: '8',
        fontFamily: 'Inter'
      }

      // Create Ramp purchase URL
      const rampUrl = new URL(`${RAMP_CONFIG.baseUrl}/api/host-api/purchase`)
      Object.entries(rampConfig).forEach(([key, value]) => {
        if (value) rampUrl.searchParams.append(key, value.toString())
      })

      // Update transaction with Ramp URL
      await prisma.onrampTransaction.update({
        where: { id: onrampTransaction.id },
        data: {
          rampUrl: rampUrl.toString(),
          externalId: `vpay_${onrampTransaction.id}_${Date.now()}`
        }
      })

      // Log transaction initiation
      console.log(`On-ramp initiated: ${onrampTransaction.id} for user ${req.user.id}`)

      res.json({
        success: true,
        transaction: {
          id: onrampTransaction.id,
          status: onrampTransaction.status,
          fiatCurrency,
          cryptoCurrency,
          fiatValue,
          rampUrl: rampUrl.toString(),
          externalId: onrampTransaction.externalId
        },
        message: 'On-ramp transaction initiated successfully'
      })

    } catch (error) {
      console.error('On-ramp initiation error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to initiate on-ramp transaction',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
)

// @desc    Get on-ramp transaction status
// @route   GET /api/onramp/status/:transactionId
// @access  Private
router.get('/status/:transactionId', authMiddleware, async (req, res) => {
  try {
    const { transactionId } = req.params

    const transaction = await prisma.onrampTransaction.findFirst({
      where: {
        id: transactionId,
        userId: req.user.id
      },
      include: {
        user: {
          select: { username: true, email: true }
        }
      }
    })

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      })
    }

    // Fetch latest status from Ramp if external ID exists
    if (transaction.externalId && transaction.rampPurchaseId) {
      try {
        const rampResponse = await axios.get(
          `${RAMP_CONFIG.baseUrl}/api/host-api/purchase/${transaction.rampPurchaseId}`,
          {
            headers: {
              'Authorization': `Bearer ${RAMP_CONFIG.hostApiKey}`
            }
          }
        )

        const rampStatus = rampResponse.data.status
        const mappedStatus = mapRampStatus(rampStatus)

        // Update local status if different
        if (mappedStatus !== transaction.status) {
          await prisma.onrampTransaction.update({
            where: { id: transaction.id },
            data: { 
              status: mappedStatus,
              rampData: rampResponse.data
            }
          })
          transaction.status = mappedStatus
        }
      } catch (rampError) {
        console.error('Error fetching Ramp status:', rampError.message)
      }
    }

    res.json({
      success: true,
      transaction: {
        id: transaction.id,
        status: transaction.status,
        fiatCurrency: transaction.fiatCurrency,
        cryptoCurrency: transaction.cryptoCurrency,
        fiatValue: transaction.fiatValue,
        cryptoValue: transaction.cryptoValue,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        rampPurchaseId: transaction.rampPurchaseId
      }
    })

  } catch (error) {
    console.error('Status check error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to check transaction status'
    })
  }
})

// @desc    Handle Ramp webhooks
// @route   POST /api/onramp/webhook
// @access  Public (but verified)
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-ramp-signature']
    const payload = JSON.stringify(req.body)

    // Verify webhook signature
    if (!verifyRampSignature(payload, signature)) {
      return res.status(401).json({ error: 'Invalid signature' })
    }

    const { type, purchase } = req.body

    if (type === 'PURCHASE_CREATED' || type === 'PURCHASE_UPDATED') {
      const transaction = await prisma.onrampTransaction.findFirst({
        where: {
          OR: [
            { externalId: purchase.hostApiKey },
            { rampPurchaseId: purchase.id }
          ]
        }
      })

      if (transaction) {
        const mappedStatus = mapRampStatus(purchase.status)
        
        await prisma.onrampTransaction.update({
          where: { id: transaction.id },
          data: {
            status: mappedStatus,
            rampPurchaseId: purchase.id,
            cryptoValue: purchase.cryptoAmount ? parseFloat(purchase.cryptoAmount) : null,
            rampData: purchase,
            completedAt: purchase.status === 'RELEASED' ? new Date() : null
          }
        })

        // Emit WebSocket event for real-time updates
        const io = req.app.get('io')
        if (io) {
          io.to(`user-${transaction.userId}`).emit('onramp-status-update', {
            transactionId: transaction.id,
            status: mappedStatus,
            type: 'onramp',
            message: getStatusMessage(mappedStatus)
          })
        }

        console.log(`On-ramp webhook processed: ${transaction.id} -> ${mappedStatus}`)
      }
    }

    res.json({ success: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

// @desc    Get user's on-ramp transaction history
// @route   GET /api/onramp/history
// @access  Private
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const transactions = await prisma.onrampTransaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        fiatCurrency: true,
        cryptoCurrency: true,
        fiatValue: true,
        cryptoValue: true,
        status: true,
        provider: true,
        createdAt: true,
        completedAt: true
      }
    })

    const total = await prisma.onrampTransaction.count({
      where: { userId: req.user.id }
    })

    res.json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('History fetch error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction history'
    })
  }
})

// Helper functions
function mapRampStatus(rampStatus) {
  const statusMap = {
    'INITIALIZED': 'INITIATED',
    'PAYMENT_STARTED': 'PENDING',
    'PAYMENT_IN_PROGRESS': 'PENDING',
    'PAYMENT_EXECUTED': 'PROCESSING',
    'FIAT_SENT': 'PROCESSING',
    'FIAT_RECEIVED': 'PROCESSING',
    'CRYPTO_EXCHANGE_IN_PROGRESS': 'PROCESSING',
    'RELEASING': 'PROCESSING',
    'RELEASED': 'COMPLETED',
    'CANCELLED': 'CANCELLED',
    'EXPIRED': 'EXPIRED',
    'FAILED': 'FAILED'
  }
  return statusMap[rampStatus] || 'UNKNOWN'
}

function getStatusMessage(status) {
  const messages = {
    'INITIATED': 'On-ramp transaction initiated',
    'PENDING': 'Payment in progress',
    'PROCESSING': 'Processing crypto exchange',
    'COMPLETED': 'Crypto successfully received',
    'CANCELLED': 'Transaction cancelled',
    'EXPIRED': 'Transaction expired',
    'FAILED': 'Transaction failed'
  }
  return messages[status] || 'Status unknown'
}

function verifyRampSignature(payload, signature) {
  if (!RAMP_CONFIG.webhookSecret || !signature) {
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', RAMP_CONFIG.webhookSecret)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )
}

module.exports = router
