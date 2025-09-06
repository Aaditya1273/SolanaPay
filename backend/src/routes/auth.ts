import express, { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { body, validationResult } from 'express-validator'
import { asyncHandler } from '../middleware/errorMiddleware'
import { protect } from '../middleware/authMiddleware'
import { authLimiter } from '../middleware/rateLimiter'

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

export default router
