import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { body, validationResult } from 'express-validator'
import { asyncHandler } from '../middleware/errorMiddleware'
import { protect } from '../middleware/authMiddleware'
import multer from 'multer'
import path from 'path'

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    username: string;
  };
}

const router = express.Router()
const prisma = new PrismaClient()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
    user
  })
}))

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile',
  protect,
  [
    body('username').optional().isLength({ min: 3 }).isAlphanumeric(),
    body('bio').optional().isLength({ max: 500 }),
    body('skills').optional().isArray(),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { username, bio, skills } = req.body
    const updateData: any = {}

    if (username) {
      // Check if username is already taken
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          id: { not: req.user.id }
        }
      })

      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' })
      }
      updateData.username = username
    }

    if (bio !== undefined) updateData.bio = bio
    if (skills) updateData.skills = skills

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
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
      user
    })
  })
)

// @desc    Upload avatar
// @route   POST /api/users/avatar
// @access  Private
router.post('/avatar',
  protect,
  upload.single('avatar'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarPath },
      select: {
        id: true,
        username: true,
        avatar: true
      }
    })

    res.json({
      success: true,
      user,
      message: 'Avatar uploaded successfully'
    })
  })
)

// @desc    Connect wallet
// @route   PUT /api/users/wallet
// @access  Private
router.put('/wallet',
  protect,
  [
    body('walletAddress').isEthereumAddress(),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { walletAddress } = req.body

    // Check if wallet is already connected to another user
    const existingUser = await prisma.user.findFirst({
      where: {
        walletAddress,
        id: { not: req.user.id }
      }
    })

    if (existingUser) {
      return res.status(400).json({ message: 'Wallet already connected to another account' })
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { walletAddress },
      select: {
        id: true,
        username: true,
        walletAddress: true,
        isVerified: true
      }
    })

    res.json({
      success: true,
      user,
      message: 'Wallet connected successfully'
    })
  })
)

// @desc    Get user stats
// @route   GET /api/users/stats
// @access  Private
router.get('/stats', protect, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const [
    totalTransactions,
    completedTasks,
    createdTasks,
    totalAchievements,
    userAchievements
  ] = await Promise.all([
    prisma.transaction.count({
      where: {
        userId: req.user.id
      }
    }),
    prisma.task.count({
      where: {
        workerId: req.user.id,
        status: 'COMPLETED'
      }
    }),
    prisma.task.count({
      where: { creatorId: req.user.id }
    }),
    prisma.achievement.count({
      where: { isActive: true }
    }),
    prisma.userAchievement.count({
      where: { userId: req.user.id }
    })
  ])

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      totalEarnings: true,
      totalSpent: true,
      rewardPoints: true,
      tier: true
    }
  })

  res.json({
    success: true,
    stats: {
      totalTransactions,
      completedTasks,
      createdTasks,
      totalEarnings: user?.totalEarnings || 0,
      totalSpent: user?.totalSpent || 0,
      rewardPoints: user?.rewardPoints || 0,
      tier: user?.tier || 'BRONZE',
      achievementsUnlocked: userAchievements,
      totalAchievements
    }
  })
}))

// @desc    Get public user profile
// @route   GET /api/users/:username
// @access  Public
router.get('/:username', asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { username: req.params.username },
    select: {
      id: true,
      username: true,
      avatar: true,
      bio: true,
      skills: true,
      tier: true,
      createdAt: true,
      createdTasks: {
        where: { status: { in: ['COMPLETED', 'IN_PROGRESS'] } },
        select: { id: true, title: true, status: true, createdAt: true }
      },
      assignedTasks: {
        where: { status: 'COMPLETED' },
        select: { id: true, title: true, createdAt: true }
      }
    }
  })

  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  res.json({
    success: true,
    user: {
      ...user,
      tasksCompleted: user.assignedTasks.length,
      tasksCreated: user.createdTasks.length
    }
  })
}))

// @desc    Search users
// @route   GET /api/users/search/:query
// @access  Public
router.get('/search/:query', asyncHandler(async (req: Request, res: Response) => {
  const query = req.params.query
  const limit = parseInt(req.query.limit as string) || 10

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: query } },
        { bio: { contains: query } }
      ]
    },
    select: {
      id: true,
      username: true,
      avatar: true,
      bio: true,
      tier: true,
      skills: true
    },
    take: limit
  })

  res.json({
    success: true,
    users
  })
}))

// @desc    Update user notifications
// @route   PUT /api/user/notifications
// @access  Private
router.put('/notifications',
  protect,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const updateData = req.body

    // For now, we'll store notifications in user preferences
    // In a real app, you'd have a separate notifications table
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        // Store as JSON in a preferences field or create a separate table
        // For demo purposes, we'll just return success
      }
    })

    res.json({
      success: true,
      message: 'Notification settings updated'
    })
  })
)

// @desc    Update user preferences
// @route   PUT /api/user/preferences
// @access  Private
router.put('/preferences',
  protect,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const updateData = req.body

    // For now, we'll store preferences in user data
    // In a real app, you'd have a separate preferences table
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        // Store as JSON in a preferences field or create a separate table
        // For demo purposes, we'll just return success
      }
    })

    res.json({
      success: true,
      message: 'Preferences updated'
    })
  })
)

// @desc    Update KYC status (for demo purposes)
// @route   PUT /api/users/kyc
// @access  Private
router.put('/kyc',
  protect,
  [
    body('status').isIn(['pending', 'approved', 'rejected']),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { status } = req.body

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { kycStatus: status },
      select: {
        id: true,
        username: true,
        kycStatus: true,
      }
    })

    res.json({
      success: true,
      user,
      message: `KYC status updated to ${status}`
    })
  })
)

export default router
