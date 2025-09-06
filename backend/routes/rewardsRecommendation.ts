import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { aiRecommendationService } from '../services/aiRecommendationService';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

/**
 * GET /api/rewards/recommend
 * Get personalized reward recommendations for authenticated user
 */
router.get('/recommend', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Generate fresh recommendations
    const recommendations = await aiRecommendationService.generateRecommendations(userId);
    
    // Save recommendations to database
    await aiRecommendationService.saveRecommendations(userId, recommendations);
    
    // Update spending patterns for better future recommendations
    await aiRecommendationService.updateSpendingPatterns(userId);

    res.json({
      success: true,
      data: {
        recommendations,
        generatedAt: new Date().toISOString(),
        count: recommendations.length
      }
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to generate recommendations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/rewards/recommend/history
 * Get user's recommendation history
 */
router.get('/recommend/history', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { page = 1, limit = 10, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId };
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const recommendations = await prisma.rewardRecommendation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    });

    const total = await prisma.rewardRecommendation.count({ where });

    res.json({
      success: true,
      data: {
        recommendations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching recommendation history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recommendation history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/rewards/recommend/:id/claim
 * Claim a specific recommendation
 */
router.post('/recommend/:id/claim', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const recommendationId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Find the recommendation
    const recommendation = await prisma.rewardRecommendation.findFirst({
      where: {
        id: recommendationId,
        userId,
        status: 'PENDING'
      }
    });

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found or already claimed' });
    }

    // Check if expired
    if (recommendation.expiresAt && recommendation.expiresAt < new Date()) {
      await prisma.rewardRecommendation.update({
        where: { id: recommendationId },
        data: { status: 'EXPIRED' }
      });
      return res.status(400).json({ error: 'Recommendation has expired' });
    }

    // Process the claim based on reward type
    let claimResult;
    switch (recommendation.rewardType) {
      case 'CASHBACK':
        claimResult = await processCashbackClaim(userId, recommendation.value);
        break;
      case 'BONUS_TOKENS':
        claimResult = await processBonusTokensClaim(userId, recommendation.metadata as any);
        break;
      case 'NFT':
        claimResult = await processNFTClaim(userId, recommendation.metadata as any);
        break;
      case 'DISCOUNT':
        claimResult = await processDiscountClaim(userId, recommendation.metadata as any);
        break;
      case 'EXCLUSIVE_ACCESS':
        claimResult = await processExclusiveAccessClaim(userId, recommendation.metadata as any);
        break;
      default:
        return res.status(400).json({ error: 'Unknown reward type' });
    }

    // Update recommendation status
    await prisma.rewardRecommendation.update({
      where: { id: recommendationId },
      data: { status: 'CLAIMED' }
    });

    // Track the claim activity
    await aiRecommendationService.trackActivity(
      userId,
      'REWARD_CLAIMED',
      {
        recommendationId,
        rewardType: recommendation.rewardType,
        value: recommendation.value
      },
      recommendation.value,
      'REWARDS'
    );

    res.json({
      success: true,
      data: {
        message: 'Reward claimed successfully',
        claimResult,
        recommendation
      }
    });

  } catch (error) {
    console.error('Error claiming recommendation:', error);
    res.status(500).json({ 
      error: 'Failed to claim recommendation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/rewards/analytics
 * Get user's reward analytics and insights
 */
router.get('/analytics', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get spending analysis
    const spendingAnalysis = await aiRecommendationService.analyzeUserSpending(userId);
    
    // Get recommendation stats
    const recommendationStats = await prisma.rewardRecommendation.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true }
    });

    // Get spending patterns
    const spendingPatterns = await prisma.spendingPattern.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 12 // Last 12 months
    });

    res.json({
      success: true,
      data: {
        spendingAnalysis,
        recommendationStats,
        spendingPatterns,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper functions for processing different reward types

async function processCashbackClaim(userId: string, amount: number) {
  // Create a cashback transaction
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      type: 'REWARD',
      amount,
      currency: 'VRC',
      status: 'COMPLETED',
      description: 'AI Recommended Cashback Reward'
    }
  });

  // Update user's total earnings
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalEarnings: { increment: amount }
    }
  });

  return { type: 'CASHBACK', amount, transactionId: transaction.id };
}

async function processBonusTokensClaim(userId: string, metadata: any) {
  const tokenAmount = metadata?.tokenAmount || 0;
  
  // Add bonus tokens to user's reward points
  await prisma.user.update({
    where: { id: userId },
    data: {
      rewardPoints: { increment: tokenAmount }
    }
  });

  return { type: 'BONUS_TOKENS', amount: tokenAmount };
}

async function processNFTClaim(userId: string, metadata: any) {
  // In a real implementation, this would mint an NFT
  // For now, we'll create a record of the NFT reward
  const nftReward = await prisma.userReward.create({
    data: {
      userId,
      rewardId: 'nft-' + Date.now(), // Temporary ID
      status: 'CLAIMED'
    }
  });

  return { 
    type: 'NFT', 
    nftType: metadata?.nftType,
    rarity: metadata?.rarity,
    rewardId: nftReward.id 
  };
}

async function processDiscountClaim(userId: string, metadata: any) {
  // Create a discount coupon/code
  const discountCode = `VPAY${Date.now().toString().slice(-6)}`;
  
  // Store discount in user preferences for later use
  await prisma.userPreference.upsert({
    where: {
      userId_preferenceKey: {
        userId,
        preferenceKey: 'ACTIVE_DISCOUNTS'
      }
    },
    update: {
      preferenceValue: JSON.stringify({
        code: discountCode,
        percentage: metadata?.discountPercentage,
        category: metadata?.category,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      })
    },
    create: {
      userId,
      preferenceKey: 'ACTIVE_DISCOUNTS',
      preferenceValue: JSON.stringify({
        code: discountCode,
        percentage: metadata?.discountPercentage,
        category: metadata?.category,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })
    }
  });

  return { 
    type: 'DISCOUNT', 
    code: discountCode,
    percentage: metadata?.discountPercentage,
    category: metadata?.category
  };
}

async function processExclusiveAccessClaim(userId: string, metadata: any) {
  // Grant exclusive access by updating user preferences
  await prisma.userPreference.upsert({
    where: {
      userId_preferenceKey: {
        userId,
        preferenceKey: 'VIP_ACCESS'
      }
    },
    update: {
      preferenceValue: JSON.stringify({
        accessType: metadata?.accessType,
        features: metadata?.features,
        grantedAt: new Date().toISOString()
      })
    },
    create: {
      userId,
      preferenceKey: 'VIP_ACCESS',
      preferenceValue: JSON.stringify({
        accessType: metadata?.accessType,
        features: metadata?.features,
        grantedAt: new Date().toISOString()
      })
    }
  });

  return { 
    type: 'EXCLUSIVE_ACCESS', 
    accessType: metadata?.accessType,
    features: metadata?.features
  };
}

export default router;
