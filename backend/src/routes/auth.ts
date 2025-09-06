import express, { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { body, validationResult } from 'express-validator'
import { asyncHandler } from '../middleware/errorMiddleware'
import { protect } from '../middleware/authMiddleware'
import { authLimiter } from '../middleware/rateLimiter'
import { Keypair, PublicKey, Connection, clusterApiUrl } from '@solana/web3.js'
import { derivePath } from 'ed25519-hd-key'
import { createHash } from 'crypto'

const router = express.Router()
const prisma = new PrismaClient()

// Generate JWT token
const generateToken = (id: string): string => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not defined')
  }
  return jwt.sign({ id }, secret as jwt.Secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions)
}

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', 
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('username').isLength({ min: 3 }).isAlphanumeric(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          message: 'Validation failed',
          errors: errors.array() 
        })
      }

      const { email, password, username } = req.body

      if (!email || !password || !username) {
        return res.status(400).json({ 
          success: false,
          message: 'Email, password, and username are required' 
        })
      }

      // Check if user exists
      const userExists = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      })

      if (userExists) {
        return res.status(400).json({ 
          success: false,
          message: 'User already exists' 
        })
      }

      // Hash password
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(password, salt)

      // Create user (not verified initially)
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          isVerified: false,
        },
        select: {
          id: true,
          email: true,
          username: true,
          isVerified: true,
          kycStatus: true,
          createdAt: true,
        }
      })

      res.status(201).json({
        success: true,
        message: 'Account created successfully. Please verify your email to continue.',
        user,
        requiresVerification: true
      })
    } catch (error) {
      console.error('Registration error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error during registration'
      })
    }
  })
)

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').exists(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, password } = req.body

    // Check for user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (user && (await bcrypt.compare(password, user.password))) {
      // Check if user is verified
      if (!user.isVerified) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email before logging in',
          requiresVerification: true,
          email: user.email
        })
      }

      const token = generateToken(user.id)
      
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          walletAddress: user.walletAddress,
          isVerified: user.isVerified,
          kycStatus: user.kycStatus,
          createdAt: user.createdAt,
        },
      })
    } else {
      res.status(401).json({ message: 'Invalid credentials' })
    }
  })
)

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, asyncHandler(async (req: any, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      username: true,
      walletAddress: true,
      isVerified: true,
      kycStatus: true,
      bio: true,
      avatar: true,
      skills: true,
      totalEarnings: true,
      totalSpent: true,
      rewardPoints: true,
      tier: true,
      createdAt: true,
      updatedAt: true,
    }
  })

  res.json({
    success: true,
    user,
  })
}))

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, asyncHandler(async (req: Request, res: Response) => {
  // In a real app, you might want to blacklist the token
  res.json({
    success: true,
    message: 'Logged out successfully',
  })
}))

// @desc    Sync Web3 user with backend
// @route   POST /api/auth/web3-sync
// @access  Public
router.post('/web3-sync', 
  [
    body('walletAddress').isLength({ min: 40, max: 42 }),
    body('provider').isIn(['google', 'facebook', 'twitter', 'discord', 'github', 'metamask', 'web3auth']),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          message: 'Validation failed',
          errors: errors.array() 
        })
      }

      const { walletAddress, email, name, provider, profileImage } = req.body

      if (!walletAddress || !provider) {
        return res.status(400).json({ 
          success: false,
          message: 'Wallet address and provider are required' 
        })
      }

      // Check if user exists by wallet address
      let user = await prisma.user.findFirst({
        where: { walletAddress: walletAddress.toLowerCase() }
      })

      if (user) {
        // Update existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            email: email || user.email,
            fullName: name || user.fullName,
            avatar: profileImage || user.avatar,
            provider: provider,
            lastLoginAt: new Date(),
          },
          select: {
            id: true,
            email: true,
            username: true,
            fullName: true,
            avatar: true,
            walletAddress: true,
            solanaWalletAddress: true,
            isVerified: true,
            kycStatus: true,
            rewardPoints: true,
            tier: true,
            totalEarnings: true,
            createdAt: true,
            provider: true,
          }
        })
      } else {
        // Create new user
        const username = name ? name.replace(/\s+/g, '').toLowerCase() : `user_${walletAddress.slice(-8)}`
        
        user = await prisma.user.create({
          data: {
            email: email || `${walletAddress}@web3.local`,
            username: username,
            fullName: name,
            avatar: profileImage,
            walletAddress: walletAddress.toLowerCase(),
            isVerified: true, // Web3 users are considered verified
            kycStatus: 'pending',
            provider: provider,
            rewardPoints: 100, // Welcome bonus
            tier: 'bronze',
            totalEarnings: 0,
          },
          select: {
            id: true,
            email: true,
            username: true,
            fullName: true,
            avatar: true,
            walletAddress: true,
            solanaWalletAddress: true,
            isVerified: true,
            kycStatus: true,
            rewardPoints: true,
            tier: true,
            totalEarnings: true,
            createdAt: true,
            provider: true,
          }
        })
      }

      // Generate JWT token
      const token = generateToken(user.id)

      res.json({
        success: true,
        message: 'Web3 user synced successfully',
        user,
        token,
      })
    } catch (error) {
      console.error('Web3 sync error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error during Web3 sync'
      })
    }
  })
)

// @desc    Generate Solana wallet for EVM address
// @route   POST /api/auth/generate-solana-wallet
// @access  Private
router.post('/generate-solana-wallet',
  protect,
  [
    body('evmAddress').isLength({ min: 40, max: 42 }),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          message: 'Validation failed',
          errors: errors.array() 
        })
      }

      const { evmAddress } = req.body
      const userId = (req as any).user.id

      if (!evmAddress) {
        return res.status(400).json({ 
          success: false,
          message: 'EVM address is required' 
        })
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        })
      }

      // Check if user already has a Solana wallet
      if (user.solanaWalletAddress) {
        return res.json({
          success: true,
          message: 'Solana wallet already exists',
          solanaAddress: user.solanaWalletAddress,
        })
      }

      // Generate deterministic Solana wallet from EVM address
      const seed = createHash('sha256')
        .update(`${evmAddress.toLowerCase()}_${user.id}_solanapay`)
        .digest()

      const keypair = Keypair.fromSeed(seed.slice(0, 32))
      const solanaAddress = keypair.publicKey.toString()

      // Update user with Solana wallet address
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          solanaWalletAddress: solanaAddress,
        },
        select: {
          id: true,
          email: true,
          username: true,
          walletAddress: true,
          solanaWalletAddress: true,
        }
      })

      // TODO: Call Solana program to register cross-chain identity
      // This would involve calling the cross-chain-identity program
      // to link the EVM and Solana addresses on-chain

      res.json({
        success: true,
        message: 'Solana wallet generated successfully',
        solanaAddress,
        user: updatedUser,
      })
    } catch (error) {
      console.error('Solana wallet generation error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error during Solana wallet generation'
      })
    }
  })
)

// @desc    Link cross-chain identity on Solana
// @route   POST /api/auth/link-cross-chain
// @access  Private
router.post('/link-cross-chain',
  protect,
  [
    body('evmAddress').isLength({ min: 40, max: 42 }),
    body('signature').isLength({ min: 128, max: 132 }),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          message: 'Validation failed',
          errors: errors.array() 
        })
      }

      const { evmAddress, signature } = req.body
      const userId = (req as any).user.id

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user || !user.solanaWalletAddress) {
        return res.status(400).json({ 
          success: false,
          message: 'User must have a Solana wallet first' 
        })
      }

      // TODO: Verify EVM signature and call Solana program
      // This would involve:
      // 1. Verifying the EVM signature proves ownership of the EVM address
      // 2. Calling the cross-chain-identity Solana program
      // 3. Storing the cross-chain link on-chain

      res.json({
        success: true,
        message: 'Cross-chain identity linked successfully',
        evmAddress,
        solanaAddress: user.solanaWalletAddress,
      })
    } catch (error) {
      console.error('Cross-chain linking error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error during cross-chain linking'
      })
    }
  })
)

export default router
