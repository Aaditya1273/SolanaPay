const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { RewardRedemptionService } = require('../services/rewardRedemptionService');

const router = express.Router();
const redemptionService = new RewardRedemptionService();

// AI Recommendation Service
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Generate AI-powered recommendations based on user data
const generateAIRecommendations = async (userId) => {
  try {
    // Get user activity data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        rewards: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const recommendations = [];
    const now = new Date();

    // Analyze payment patterns
    const recentPayments = user.transactions.filter(t => 
      t.type === 'PAYMENT' && 
      new Date(t.createdAt) > new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    );

    if (recentPayments.length >= 3) {
      const avgAmount = recentPayments.reduce((sum, t) => sum + parseFloat(t.amount), 0) / recentPayments.length;
      
      recommendations.push({
        id: `cashback_${Date.now()}`,
        rewardType: 'CASHBACK',
        title: `${Math.min(5, Math.floor(avgAmount / 20))}% Cashback on Next Payment`,
        description: `Based on your payment history averaging $${avgAmount.toFixed(2)}, earn cashback on your next transaction.`,
        value: avgAmount * 0.03,
        confidence: Math.min(0.95, 0.6 + (recentPayments.length * 0.05)),
        reasoning: `You've made ${recentPayments.length} payments in the last 30 days with consistent amounts.`,
        status: 'PENDING',
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString()
      });
    }

    // Analyze task completion
    const completedTasks = user.tasks.filter(t => t.status === 'COMPLETED');
    const taskCompletionRate = user.tasks.length > 0 ? completedTasks.length / user.tasks.length : 0;

    if (taskCompletionRate > 0.7 && completedTasks.length >= 2) {
      const bonusTokens = Math.floor(completedTasks.length * 10);
      
      recommendations.push({
        id: `tokens_${Date.now()}`,
        rewardType: 'BONUS_TOKENS',
        title: `${bonusTokens} Bonus SolanaPay Tokens`,
        description: `Complete 2 more tasks this week to earn ${bonusTokens} bonus SolanaPay tokens.`,
        value: bonusTokens,
        confidence: Math.min(0.98, taskCompletionRate + 0.1),
        reasoning: `Your task completion rate is ${Math.floor(taskCompletionRate * 100)}% with ${completedTasks.length} completed tasks.`,
        status: 'PENDING',
        expiresAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString()
      });
    }

    // Check for tier progression
    const userPoints = user.points || 0;
    const tierThresholds = { BRONZE: 0, SILVER: 1000, GOLD: 5000, PLATINUM: 15000 };
    const currentTier = Object.entries(tierThresholds).reverse().find(([_, threshold]) => userPoints >= threshold)?.[0] || 'BRONZE';
    const nextTier = Object.entries(tierThresholds).find(([_, threshold]) => userPoints < threshold);

    if (nextTier) {
      const [tierName, threshold] = nextTier;
      const pointsNeeded = threshold - userPoints;
      
      if (pointsNeeded <= 500) {
        recommendations.push({
          id: `nft_${Date.now()}`,
          rewardType: 'NFT',
          title: `Exclusive ${tierName} Tier Achievement NFT`,
          description: `Unlock a rare achievement NFT for reaching ${tierName} tier status.`,
          value: threshold / 40,
          confidence: Math.max(0.6, 1 - (pointsNeeded / 500)),
          reasoning: `You are ${pointsNeeded} points away from ${tierName} tier and have been consistently active.`,
          status: 'PENDING',
          expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: now.toISOString()
        });
      }
    }

    return recommendations;
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    return [];
  }
};

// Helper function to calculate spending analytics from database
const calculateSpendingAnalytics = async (userId) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // Get user's transactions for analysis
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: { in: ['PAYMENT', 'WITHDRAWAL'] },
      status: 'COMPLETED',
      createdAt: { gte: thirtyDaysAgo }
    },
    orderBy: { createdAt: 'desc' }
  });

  const olderTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: { in: ['PAYMENT', 'WITHDRAWAL'] },
      status: 'COMPLETED',
      createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }
    }
  });

  // Get user activities for category analysis
  const userActivities = await prisma.userActivity.findMany({
    where: {
      userId,
      activityType: { in: ['PAYMENT_SENT', 'TASK_COMPLETED', 'TASK_CREATED'] },
      timestamp: { gte: thirtyDaysAgo }
    },
    orderBy: { timestamp: 'desc' }
  });

  // Calculate basic spending metrics
  const totalSpent = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const avgTransactionAmount = recentTransactions.length > 0 ? totalSpent / recentTransactions.length : 0;
  const transactionFrequency = recentTransactions.length;

  // Calculate spending by category from activities
  const categorySpending = {};
  userActivities.forEach(activity => {
    const category = activity.category || 'General';
    const amount = activity.amount || 0;
    
    if (!categorySpending[category]) {
      categorySpending[category] = { amount: 0, frequency: 0 };
    }
    categorySpending[category].amount += amount;
    categorySpending[category].frequency += 1;
  });

  // Convert to top categories array
  const topCategories = Object.entries(categorySpending)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      frequency: data.frequency
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Calculate spending trend
  const recentTotal = totalSpent;
  const olderTotal = olderTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  let spendingTrend = 'STABLE';
  
  if (recentTotal > olderTotal * 1.2) {
    spendingTrend = 'INCREASING';
  } else if (recentTotal < olderTotal * 0.8) {
    spendingTrend = 'DECREASING';
  }

  // Calculate risk profile based on spending patterns
  let riskProfile = 'LOW';
  if (avgTransactionAmount > 1000 || transactionFrequency > 50) {
    riskProfile = 'HIGH';
  } else if (avgTransactionAmount > 500 || transactionFrequency > 20) {
    riskProfile = 'MEDIUM';
  }

  return {
    totalSpent: Math.round(totalSpent * 100) / 100,
    avgTransactionAmount: Math.round(avgTransactionAmount * 100) / 100,
    transactionFrequency,
    topCategories,
    spendingTrend,
    riskProfile
  };
};

// Helper function to get recommendation statistics
const getRecommendationStats = async (userId) => {
  const stats = await prisma.rewardRecommendation.groupBy({
    by: ['status'],
    where: { userId },
    _count: { _all: true }
  });
  
  return stats.length > 0 ? stats : [
    { status: 'PENDING', _count: { _all: 0 } },
    { status: 'VIEWED', _count: { _all: 0 } },
    { status: 'CLAIMED', _count: { _all: 0 } }
  ];
};

// Helper function to analyze spending patterns
const analyzeSpendingPatterns = async (userId) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // Get activities grouped by category for trend analysis
  const recentActivities = await prisma.userActivity.findMany({
    where: {
      userId,
      timestamp: { gte: thirtyDaysAgo },
      amount: { not: null }
    }
  });

  const olderActivities = await prisma.userActivity.findMany({
    where: {
      userId,
      timestamp: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      amount: { not: null }
    }
  });

  // Group by category
  const recentByCategory = {};
  const olderByCategory = {};

  recentActivities.forEach(activity => {
    const category = activity.category || 'General';
    if (!recentByCategory[category]) {
      recentByCategory[category] = { totalAmount: 0, frequency: 0 };
    }
    recentByCategory[category].totalAmount += activity.amount;
    recentByCategory[category].frequency += 1;
  });

  olderActivities.forEach(activity => {
    const category = activity.category || 'General';
    if (!olderByCategory[category]) {
      olderByCategory[category] = { totalAmount: 0, frequency: 0 };
    }
    olderByCategory[category].totalAmount += activity.amount;
    olderByCategory[category].frequency += 1;
  });

  // Calculate trends
  const patterns = [];
  const allCategories = new Set([...Object.keys(recentByCategory), ...Object.keys(olderByCategory)]);

  allCategories.forEach(category => {
    const recent = recentByCategory[category] || { totalAmount: 0, frequency: 0 };
    const older = olderByCategory[category] || { totalAmount: 0, frequency: 0 };
    
    let trendDirection = 'STABLE';
    if (recent.totalAmount > older.totalAmount * 1.2) {
      trendDirection = 'UP';
    } else if (recent.totalAmount < older.totalAmount * 0.8) {
      trendDirection = 'DOWN';
    }

    if (recent.totalAmount > 0 || older.totalAmount > 0) {
      patterns.push({
        category,
        totalAmount: Math.round(recent.totalAmount * 100) / 100,
        frequency: recent.frequency,
        trendDirection
      });
    }
  });

  return patterns.sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5);
};

// GET /api/rewards/recommend - Get personalized AI recommendations
router.get('/recommend', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check for existing recommendations in database
    let existingRecommendations = await prisma.rewardRecommendation.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'VIEWED'] },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let recommendations = [];
    
    if (existingRecommendations.length > 0) {
      // Use existing recommendations
      recommendations = existingRecommendations.map(rec => ({
        id: rec.id,
        type: rec.rewardType,
        title: rec.title,
        description: rec.description,
        value: rec.value,
        confidence: rec.confidence,
        reasoning: rec.reasoning,
        status: rec.status,
        expiresAt: rec.expiresAt,
        metadata: rec.metadata || {}
      }));
    } else {
      // Generate new recommendations using AI
      const generatedRecommendations = await generateAIRecommendations(userId);
      
      // Store new recommendations in database
      const storedRecommendations = await Promise.all(
        generatedRecommendations.map(async (rec) => {
          return await prisma.rewardRecommendation.create({
            data: {
              userId,
              rewardType: rec.type,
              title: rec.title,
              description: rec.description,
              value: rec.value,
              confidence: rec.confidence,
              reasoning: rec.reasoning,
              status: 'PENDING',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
              metadata: rec.metadata || {}
            }
          });
        })
      );
      
      recommendations = storedRecommendations.map(rec => ({
        id: rec.id,
        type: rec.rewardType,
        title: rec.title,
        description: rec.description,
        value: rec.value,
        confidence: rec.confidence,
        reasoning: rec.reasoning,
        status: rec.status,
        expiresAt: rec.expiresAt,
        metadata: rec.metadata || {}
      }));
    }

    res.json({
      success: true,
      data: {
        recommendations,
        totalCount: recommendations.length,
        pendingCount: recommendations.filter(r => r.status === 'PENDING').length
      }
    });
  } catch (error) {
    console.error('Error fetching AI recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recommendations'
    });
  }
});

// GET /api/rewards/analytics - Get user spending analytics
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Calculate real analytics from database
    const [spendingAnalysis, recommendationStats, spendingPatterns] = await Promise.all([
      calculateSpendingAnalytics(userId),
      getRecommendationStats(userId),
      analyzeSpendingPatterns(userId)
    ]);
    
    const analytics = {
      spendingAnalysis,
      recommendationStats,
      spendingPatterns
    };
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

// POST /api/rewards/recommend/:id/claim - Claim a recommendation
router.post('/recommend/:id/claim', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userAddress = req.user.walletAddress || req.body.walletAddress;
    
    // Find the recommendation in database
    const recommendation = await prisma.rewardRecommendation.findFirst({
      where: {
        id,
        userId
      }
    });
    
    if (!recommendation) {
      return res.status(404).json({
        success: false,
        error: 'Recommendation not found'
      });
    }

    if (recommendation.status === 'CLAIMED') {
      return res.status(400).json({
        success: false,
        error: 'Recommendation already claimed'
      });
    }

    if (recommendation.expiresAt && new Date(recommendation.expiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Recommendation has expired'
      });
    }

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address required for reward processing'
      });
    }

    // Process the reward using the redemption service
    const rewardData = {
      id: recommendation.id,
      type: recommendation.rewardType,
      title: recommendation.title,
      description: recommendation.description,
      value: recommendation.value,
      metadata: recommendation.metadata || {}
    };
    
    const redemptionResult = await redemptionService.processRewardRedemption(userAddress, rewardData);

    // Update recommendation status in database
    const updatedRecommendation = await prisma.rewardRecommendation.update({
      where: { id },
      data: {
        status: 'CLAIMED',
        claimedAt: new Date()
      }
    });

    // Create user activity record
    await prisma.userActivity.create({
      data: {
        userId,
        activityType: 'REWARD_CLAIMED',
        metadata: {
          recommendationId: id,
          rewardType: recommendation.rewardType,
          value: recommendation.value
        },
        amount: recommendation.value,
        category: 'AI_REWARDS'
      }
    });

    res.json({
      success: true,
      data: {
        recommendation: {
          id: updatedRecommendation.id,
          type: updatedRecommendation.rewardType,
          title: updatedRecommendation.title,
          description: updatedRecommendation.description,
          value: updatedRecommendation.value,
          status: updatedRecommendation.status,
          claimedAt: updatedRecommendation.claimedAt
        },
        redemption: redemptionResult,
        claimedAt: updatedRecommendation.claimedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error claiming recommendation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to claim recommendation'
    });
  }
});

// POST /api/rewards/recommend/:id/view - Mark recommendation as viewed
router.post('/recommend/:id/view', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Update recommendation status to viewed
    const updatedRecommendation = await prisma.rewardRecommendation.updateMany({
      where: {
        id,
        userId,
        status: 'PENDING'
      },
      data: {
        status: 'VIEWED',
        viewedAt: new Date()
      }
    });

    if (updatedRecommendation.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recommendation not found or already viewed'
      });
    }

    res.json({
      success: true,
      message: 'Recommendation marked as viewed'
    });
  } catch (error) {
    console.error('Error marking recommendation as viewed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update recommendation status'
    });
  }
});

// GET /api/rewards/recommend/history - Get recommendation history
router.get('/recommend/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 10 } = req.query;
    
    const whereClause = { userId };
    if (status) {
      whereClause.status = status;
    }

    const recommendations = await prisma.rewardRecommendation.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    const totalCount = await prisma.rewardRecommendation.count({
      where: whereClause
    });

    const formattedRecommendations = recommendations.map(rec => ({
      id: rec.id,
      type: rec.rewardType,
      title: rec.title,
      description: rec.description,
      value: rec.value,
      confidence: rec.confidence,
      reasoning: rec.reasoning,
      status: rec.status,
      createdAt: rec.createdAt,
      viewedAt: rec.viewedAt,
      claimedAt: rec.claimedAt,
      expiresAt: rec.expiresAt,
      metadata: rec.metadata || {}
    }));

    res.json({
      success: true,
      data: {
        recommendations: formattedRecommendations,
        totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching recommendation history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recommendation history'
    });
  }
});

// GET /api/rewards/redemption/history - Get user's redemption history
router.get('/redemption/history', authMiddleware, async (req, res) => {
  try {
    const userAddress = req.user.walletAddress || req.query.walletAddress;
    const { limit = 10 } = req.query;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address required'
      });
    }

    const history = await redemptionService.getUserRedemptionHistory(userAddress, parseInt(limit));

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching redemption history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch redemption history'
    });
  }
});

module.exports = router;
