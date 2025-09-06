import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { body, validationResult } from 'express-validator'
import { asyncHandler } from '../middleware/errorMiddleware'
import { protect } from '../middleware/authMiddleware'

// Extend Request interface to include user property
interface AuthenticatedRequest extends Request {
  user: {
    id: string
    username: string
    email: string
  }
}

const router = express.Router()
const prisma = new PrismaClient()

// @desc    Get all rewards
// @route   GET /api/rewards
// @access  Public
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const type = req.query.type as string
  const isActive = req.query.active === 'true'

  const where: any = {}
  if (type) where.type = type
  if (isActive !== undefined) where.isActive = isActive

  const rewards = await prisma.reward.findMany({
    where,
    orderBy: { cost: 'asc' }
  })

  res.json({
    success: true,
    rewards
  })
}))

// @desc    Get user rewards and points
// @route   GET /api/rewards/user/:address
// @access  Public
router.get('/user/:address', asyncHandler(async (req: Request, res: Response) => {
  const { address } = req.params
  
  // Find user by wallet address
  const user = await prisma.user.findFirst({
    where: { walletAddress: address },
    include: {
      userRewards: {
        include: { reward: true }
      }
    }
  })

  if (!user) {
    return res.json({
      success: true,
      points: 0,
      availableRewards: []
    })
  }

  // Get available rewards (active rewards)
  const availableRewards = await prisma.reward.findMany({
    where: { isActive: true },
    orderBy: { cost: 'asc' }
  })

  res.json({
    success: true,
    data: {
      points: user.rewardPoints || 0,
      availableRewards: availableRewards.map(reward => ({
        ...reward,
        pointsCost: reward.cost,
        name: reward.title
      }))
    }
  })
}))

// @desc    Get user rewards (authenticated)
// @route   GET /api/rewards/user
// @access  Private
router.get('/user', protect, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userRewards = await prisma.userReward.findMany({
    where: { userId: req.user.id },
    include: {
      reward: true
    },
    orderBy: { claimedAt: 'desc' }
  })

  res.json({
    success: true,
    userRewards
  })
}))

// @desc    Claim reward
// @route   POST /api/rewards/:id/claim
// @access  Private
router.post('/:id/claim',
  protect,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const reward = await prisma.reward.findUnique({
      where: { id: req.params.id }
    })

    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' })
    }

    if (!reward.isActive) {
      return res.status(400).json({ message: 'Reward is not active' })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    })

    if (!user || user.rewardPoints < reward.cost) {
      return res.status(400).json({ message: 'Insufficient reward points' })
    }

    // Check stock availability
    if (reward.stock !== null && reward.stock <= 0) {
      return res.status(400).json({ message: 'Reward out of stock' })
    }

    // Create user reward and update points
    const userReward = await prisma.$transaction(async (tx) => {
      const userReward = await tx.userReward.create({
        data: {
          userId: req.user.id,
          rewardId: reward.id,
          status: 'APPROVED'
        },
        include: { reward: true }
      })

      await tx.user.update({
        where: { id: req.user.id },
        data: { rewardPoints: { decrement: reward.cost } }
      })

      if (reward.stock !== null) {
        await tx.reward.update({
          where: { id: reward.id },
          data: { stock: { decrement: 1 } }
        })
      }

      return userReward
    })

    res.json({
      success: true,
      userReward,
      message: 'Reward claimed successfully'
    })
  })
)

// @desc    Get achievements
// @route   GET /api/rewards/achievements
// @access  Public
router.get('/achievements', asyncHandler(async (req: Request, res: Response) => {
  const achievements = await prisma.achievement.findMany({
    where: { isActive: true },
    orderBy: { points: 'asc' }
  })

  res.json({
    success: true,
    achievements
  })
}))

// @desc    Get user achievements
// @route   GET /api/rewards/achievements/user
// @access  Private
router.get('/achievements/user', protect, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId: req.user.id },
    include: {
      achievement: true
    },
    orderBy: { unlockedAt: 'desc' }
  })

  res.json({
    success: true,
    userAchievements
  })
}))

// @desc    Get leaderboard
// @route   GET /api/rewards/leaderboard
// @access  Public
router.get('/leaderboard', asyncHandler(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: {
      rewardPoints: { gt: 0 }
    },
    select: {
      id: true,
      username: true,
      walletAddress: true,
      rewardPoints: true
    },
    orderBy: { rewardPoints: 'desc' },
    take: 10
  })

  const leaderboard = users.map((user, index) => ({
    rank: index + 1,
    username: user.username,
    address: user.walletAddress,
    points: user.rewardPoints
  }))

  res.json({
    success: true,
    data: { leaderboard }
  })
}))

// @desc    Redeem reward
// @route   POST /api/rewards/:id/redeem
// @access  Public
router.post('/:id/redeem', asyncHandler(async (req: Request, res: Response) => {
  const { address } = req.body
  const rewardId = req.params.id

  if (!address) {
    return res.status(400).json({ error: 'Wallet address required' })
  }

  const user = await prisma.user.findFirst({
    where: { walletAddress: address }
  })

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const reward = await prisma.reward.findUnique({
    where: { id: rewardId }
  })

  if (!reward) {
    return res.status(404).json({ error: 'Reward not found' })
  }

  if (!reward.isActive) {
    return res.status(400).json({ error: 'Reward is not active' })
  }

  if (user.rewardPoints < reward.cost) {
    return res.status(400).json({ error: 'Insufficient points' })
  }

  // Check stock availability
  if (reward.stock !== null && reward.stock <= 0) {
    return res.status(400).json({ error: 'Reward out of stock' })
  }

  // Create user reward and update points
  const userReward = await prisma.$transaction(async (tx) => {
    const userReward = await tx.userReward.create({
      data: {
        userId: user.id,
        rewardId: reward.id,
        status: 'APPROVED'
      },
      include: { reward: true }
    })

    await tx.user.update({
      where: { id: user.id },
      data: { rewardPoints: { decrement: reward.cost } }
    })

    if (reward.stock !== null) {
      await tx.reward.update({
        where: { id: reward.id },
        data: { stock: { decrement: 1 } }
      })
    }

    return userReward
  })

  res.json({
    success: true,
    userReward,
    message: 'Reward redeemed successfully'
  })
}))

// @desc    Check and unlock achievements
// @route   POST /api/rewards/achievements/check
// @access  Private
router.post('/achievements/check',
  protect,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        transactions: true,
        assignedTasks: { where: { status: 'COMPLETED' } },
        userAchievements: true
      }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const unlockedAchievements = []
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true }
    })

    for (const achievement of achievements) {
      // Check if already unlocked
      const alreadyUnlocked = user.userAchievements.some(
        (ua: any) => ua.achievementId === achievement.id
      )

      if (alreadyUnlocked) continue

      const condition = JSON.parse(achievement.condition)
      let shouldUnlock = false

      switch (condition.type) {
        case 'transaction_count':
          shouldUnlock = user.transactions.length >= condition.value
          break
        case 'completed_tasks':
          shouldUnlock = user.assignedTasks.length >= condition.value
          break
        case 'kyc_verified':
          shouldUnlock = user.kycStatus === 'APPROVED'
          break
        case 'registration_date':
          shouldUnlock = user.createdAt <= new Date(condition.value)
          break
      }

      if (shouldUnlock) {
        const userAchievement = await prisma.$transaction(async (tx) => {
          const userAchievement = await tx.userAchievement.create({
            data: {
              userId: req.user.id,
              achievementId: achievement.id
            },
            include: { achievement: true }
          })

          await tx.user.update({
            where: { id: req.user.id },
            data: { rewardPoints: { increment: achievement.points } }
          })

          return userAchievement
        })

        unlockedAchievements.push(userAchievement)
      }
    }

    res.json({
      success: true,
      unlockedAchievements,
      message: `${unlockedAchievements.length} new achievements unlocked!`
    })
  })
)

export default router
